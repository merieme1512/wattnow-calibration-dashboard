import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  DeviceSlotState,
  TelemetryData,
  DiagAdeData,
  CTModel,
  TabMode,
  CosPhiMode
} from '../models/calibration.model';
import { ValidationUtils } from '../utils/validation.utils';
import { MqttService } from './mqtt.service';

const STICKY_MS = 5000;

@Injectable({ providedIn: 'root' })
export class CalibrationStateService {

  private activeTabSubject = new BehaviorSubject<TabMode>('CT_10A');
  public activeTab$: Observable<TabMode> = this.activeTabSubject.asObservable();

  private selectedCtModelSubject = new BehaviorSubject<CTModel>('CT_600A');
  public selectedCtModel$: Observable<CTModel> = this.selectedCtModelSubject.asObservable();

  public slotsSubject = new BehaviorSubject<DeviceSlotState[]>(this.createInitialSlots());
  public slots$: Observable<DeviceSlotState[]> = this.slotsSubject.asObservable();

  private stickyTimers: { [i: number]: any } = {};

  constructor(private mqttService: MqttService) {
    // React to incoming MQTT messages
    this.mqttService.message$.subscribe(({ topic, payload }) => {
      this.handleMqttMessage(topic, payload);
    });

    // Pre-load default demo SN so gauge grid shows immediately
    this.doUpdateSlot(0, 'sn-13-99991');
    this.doUpdateSlot(1, 'sn-13-99992');
  }

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  setTabMode(tab: TabMode): void {
    this.activeTabSubject.next(tab);
    const defaultCt: CTModel = tab === 'CT_10A' ? 'CT_600A' : 'CT_1000A';
    this.selectedCtModelSubject.next(defaultCt);
  }

  setSelectedCtModel(model: CTModel): void {
    this.selectedCtModelSubject.next(model);
    this.broadcastToActive({ cmd: model });
  }

  updateSlotSN(idx: number, sn: string): void {
    const clean = sn.trim().toLowerCase();
    const current = this.slotsSubject.value[idx];

    // Unsubscribe old SN if changing
    if (current.sn && current.sn !== clean) {
      this.mqttService.unsubscribeDeviceTopics(current.sn);

      // Start 5s sticky timer before clearing
      if (this.stickyTimers[idx]) clearTimeout(this.stickyTimers[idx]);
      this.patchSlot(idx, { isSticky: true });

      this.stickyTimers[idx] = setTimeout(() => {
        this.doUpdateSlot(idx, clean);
      }, STICKY_MS);
    } else {
      this.doUpdateSlot(idx, clean);
    }
  }

  clearSlot(idx: number): void {
    this.updateSlotSN(idx, '');
  }

  validateCalibration(): void {
    const sns = this.getActiveSns();
    if (sns.length) this.mqttService.broadcastCommand(sns, { diag_mode_ade: 1 });
  }

  sendUiCalibration(): void {
    if (!this.areCalibButtonsUnlocked()) return;
    const nom = this.activeTabSubject.value === 'CT_1000A' ? 100 : 10;
    this.broadcastToActive({
      CALIBRATION_ENABLE: 1,
      CALIBRATION_VOLTAGE_ENABLE: 1,
      CALIBRATION_CURRENT_ENABLE: 1,
      A_Voltage_Nominal: 230, B_Voltage_Nominal: 230, C_Voltage_Nominal: 230,
      A_Current_Nominal: nom, B_Current_Nominal: nom, C_Current_Nominal: nom
    });
  }

  sendPhaseCalibration(): void {
    if (!this.areCalibButtonsUnlocked()) return;
    this.broadcastToActive({ CALIBRATION_ENABLE: 1, CALIBRATION_PHASE_ENABLE: 1 });
  }

  sendPowerCalibration(): void {
    if (!this.areCalibButtonsUnlocked()) return;
    const nom = this.activeTabSubject.value === 'CT_1000A' ? 100 : 10;
    this.broadcastToActive({
      CALIBRATION_ENABLE: 1,
      CALIBRATION_POWER_ENABLE: 1,
      A_Voltage_Nominal: 230, B_Voltage_Nominal: 230, C_Voltage_Nominal: 230,
      A_Current_Nominal: nom, B_Current_Nominal: nom, C_Current_Nominal: nom
    });
  }

  resetNvm(): void {
    this.broadcastToActive({ RESET_NVM_CALIBRATION_VALUES: 1 });
  }

  setRelay(on: boolean): void {
    this.broadcastToActive({ SET_RELAY: on ? 1 : 0 });
  }

  setSendingInterval(s: number): void {
    this.broadcastToActive({ sending_interval: s });
  }

  generateReport(): void {
    alert('Rapport PDF : Téléchargement du certificat de calibration pour ' + this.getActiveSns().join(', '));
  }

  // ─── GUARD RULES ───────────────────────────────────────────────────────────

  areCalibButtonsUnlocked(): boolean {
    const active = this.slotsSubject.value.filter(s => s.active && s.sn);
    if (!active.length) return false;
    const allDiag = active.every(s => s.baselineCaptured);
    return allDiag && !this.isCurrentLockTriggered();
  }

  isBaselineMissingForAnySlot(): boolean {
    const active = this.slotsSubject.value.filter(s => s.active && s.sn);
    if (!active.length) return false;
    return active.some(s => !s.baselineCaptured);
  }

  isCurrentLockTriggered(): boolean {
    const tab = this.activeTabSubject.value;
    return this.slotsSubject.value
      .filter(s => s.active && s.telemetry)
      .some(s => {
        const t = s.telemetry!;
        return !ValidationUtils.isCurrentInSafetyRange(t.curA, t.curB, t.curC, tab);
      });
  }

  getActiveSns(): string[] {
    return this.slotsSubject.value.filter(s => s.active && s.sn).map(s => s.sn);
  }

  getOverallCosPhiMode(): CosPhiMode {
    const active = this.slotsSubject.value.filter(s => s.active);
    return active.length ? active[0].cosPhiMode : 'NORMAL_1_0';
  }

  // ─── INTERNAL ──────────────────────────────────────────────────────────────

  private doUpdateSlot(idx: number, sn: string): void {
    if (sn) {
      this.patchSlot(idx, { sn, active: true, isSticky: false,
        telemetry: null, diagAde: null, baselineCaptured: false,
        cosPhiMode: 'NORMAL_1_0', consecutiveModeCounts: { mode: 'NORMAL_1_0', count: 0 }
      });
      this.mqttService.subscribeDeviceTopics(sn);
    } else {
      this.patchSlot(idx, { sn: '', active: false, telemetry: null, diagAde: null,
        baselineCaptured: false, isSticky: false });
    }
  }

  private handleMqttMessage(topic: string, payload: any): void {
    const slots = this.slotsSubject.value;
    let anyChange = false;
    const next = slots.map(slot => {
      if (!slot.active || !slot.sn) return slot;

      // Telemetry frame (Data)
      if (topic === `wattnow-v2/data/${slot.sn}` &&
          (payload.Frame === 'Data' || payload.curA !== undefined)) {
        const t = payload as TelemetryData;
        const avg = (t.phiA + t.phiB + t.phiC) / 3;
        const candidate: CosPhiMode = avg > 0.8 ? 'NORMAL_1_0' : avg < 0.6 ? 'PHASE_0_5' : slot.cosPhiMode;
        let counts = { ...slot.consecutiveModeCounts };
        if (candidate === counts.mode) { counts.count++; } else { counts = { mode: candidate, count: 1 }; }
        const newMode = counts.count >= 2 ? candidate : slot.cosPhiMode;
        anyChange = true;
        return { ...slot, telemetry: t, cosPhiMode: newMode, consecutiveModeCounts: counts, lastUpdated: Date.now() };
      }

      // DiagAde frame
      if (topic === `wattnow-v2/log/${slot.sn}` &&
          (payload.Frame === 'DiagAde' || payload.Avgain !== undefined)) {
        anyChange = true;
        return { ...slot, diagAde: payload as DiagAdeData, baselineCaptured: true, lastUpdated: Date.now() };
      }

      return slot;
    });

    if (anyChange) {
      this.slotsSubject.next(next);
    }
  }

  private patchSlot(idx: number, patch: Partial<DeviceSlotState>): void {
    const slots = [...this.slotsSubject.value];
    slots[idx] = { ...slots[idx], ...patch };
    this.slotsSubject.next(slots);
  }

  private broadcastToActive(payload: any): void {
    this.mqttService.broadcastCommand(this.getActiveSns(), payload);
  }

  private createInitialSlots(): DeviceSlotState[] {
    return Array.from({ length: 5 }, (_, i) => ({
      slotIndex: i, sn: '', active: false,
      telemetry: null, diagAde: null, baselineCaptured: false,
      cosPhiMode: 'NORMAL_1_0' as CosPhiMode,
      consecutiveModeCounts: { mode: 'NORMAL_1_0' as CosPhiMode, count: 0 },
      isCurrentValidForCalibration: true, isSticky: false, lastUpdated: 0
    }));
  }
}
