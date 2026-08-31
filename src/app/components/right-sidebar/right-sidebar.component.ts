import { Component, EventEmitter, Output, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CalibrationStateService } from '../../services/calibration-state.service';
import { MqttService } from '../../services/mqtt.service';
import { DeviceSlotState, TabMode, CTModel, CosPhiMode } from '../../models/calibration.model';
import { ValidationUtils } from '../../utils/validation.utils';

@Component({
  selector: 'app-right-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; height: 100%; }
    .sidebar-container {
      background: #0b1120;
      border-left: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow-y: auto;
      width: 260px;
    }
    .section-title {
      font-size: 10px;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      margin-bottom: 8px;
    }
    .calib-btn {
      width: 100%;
      padding: 10px 14px;
      border-radius: 10px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .calib-btn.unlocked {
      background: #e11d48;
      color: white;
      border: 1px solid #f43f5e;
      cursor: pointer;
    }
    .calib-btn.unlocked:hover {
      background: #be123c;
      transform: translateY(-1px);
    }
    .calib-btn.locked {
      background: #1e293b;
      color: #475569;
      border: 1px solid #334155;
      cursor: not-allowed;
    }
  `],
  template: `
    <div class="sidebar-container p-4 space-y-5 text-white">

      <!-- ── SECTION 0: NOTIFICATIONS & ALERTS ── -->
      <div class="space-y-2">
        <div class="section-title flex items-center justify-between">
          <span>STATUT & NOTIFICATIONS</span>
          <span class="w-2 h-2 rounded-full" [ngClass]="isConnected ? 'bg-emerald-400' : 'bg-red-500 animate-pulse'"></span>
        </div>

        <!-- Connection status card -->
        <div class="flex items-center justify-between bg-slate-900/90 border border-slate-800 px-3 py-2 rounded-xl text-xs font-mono">
          <span class="text-slate-400">Broker MQTT :</span>
          <span [ngClass]="isConnected ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'">
            {{ isConnected ? 'Connecté' : 'Déconnecté' }}
          </span>
        </div>

        <!-- Baseline Critical Lock Banner -->
        <div *ngIf="isBaselineMissing"
             class="bg-rose-950/80 border-2 border-rose-600 p-3 rounded-xl text-rose-200 text-xs font-mono space-y-1 shadow-lg animate-pulse">
          <div class="font-bold flex items-center gap-1.5 text-rose-300">
            <svg class="w-4 h-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <span>VERROU CRITIQUE BASELINE</span>
          </div>
          <p class="text-[10px] text-rose-300/90 leading-tight">
            La trame DIAG ADE n'a pas été reçue pour tous les SN actifs. Cliquez sur <strong>VALIDATE CALIB</strong>.
          </p>
        </div>

        <!-- Current Safety Guard Banner -->
        <div *ngIf="isCurrentLock && !isBaselineMissing"
             class="bg-rose-950/80 border-2 border-rose-600 p-3 rounded-xl text-rose-200 text-xs font-mono space-y-1 shadow-lg">
          <div class="font-bold flex items-center gap-1.5 text-rose-300">
            <svg class="w-4 h-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636"/>
            </svg>
            <span>VERROU SÉCURITÉ COURANT</span>
          </div>
          <p class="text-[10px] text-rose-300/90 leading-tight">
            Courant hors plage {{ activeTab === 'CT_10A' ? '[9.5A – 10.5A]' : '[99.5A – 100.5A]' }}.
          </p>
        </div>
      </div>

      <!-- ── SECTION 1: SAISIE DES NUMÉROS DE SÉRIE (SN 1..5) ── -->
      <div class="space-y-2.5">
        <div class="section-title flex items-center justify-between">
          <span>NUMÉROS DE SÉRIE (SN)</span>
          <span class="text-[9px] text-slate-500 font-normal">5 MAX</span>
        </div>

        <!-- Presets -->
        <div class="flex items-center gap-1.5 bg-slate-950 p-2 rounded-xl border border-slate-800 text-[10px] font-mono">
          <span class="text-slate-500">Presets:</span>
          <button (click)="applyPreset(['sn-13-10467','sn-13-13325'])"
            class="px-2 py-1 bg-slate-800 hover:bg-cyan-950 hover:text-cyan-300 rounded text-slate-300 transition-colors">
            2x SN-13
          </button>
          <button (click)="applyPreset(['sn-17-70001','sn-18-80002','sn-14-50003'])"
            class="px-2 py-1 bg-slate-800 hover:bg-cyan-950 hover:text-cyan-300 rounded text-slate-300 transition-colors">
            3x Multi
          </button>
        </div>

        <!-- 5 SN Inputs -->
        <div class="space-y-1.5">
          <div *ngFor="let slot of slots; let i = index" class="relative">
            <div class="flex items-center justify-between text-[9px] font-mono text-slate-500 mb-0.5">
              <span>SLOT {{ i + 1 }}</span>
              <span *ngIf="slot.active" [ngClass]="slot.baselineCaptured ? 'text-emerald-400 font-bold' : 'text-amber-400'">
                {{ slot.baselineCaptured ? 'DIAG OK' : 'NO DIAG' }}
              </span>
            </div>
            <div class="relative">
              <input type="text"
                [(ngModel)]="snInputs[i]"
                (change)="onSnChange(i)"
                (keyup.enter)="onSnChange(i)"
                [placeholder]="'sn-13-' + (99991 + i)"
                class="w-full bg-slate-950 text-xs font-mono px-2.5 py-1.5 pr-7 rounded-lg border text-slate-100 placeholder-slate-600 focus:outline-none"
                [ngClass]="{
                  'border-slate-800 focus:border-cyan-500': !snInputs[i] || isValidSN(snInputs[i]),
                  'border-rose-600 text-rose-300': snInputs[i] && !isValidSN(snInputs[i])
                }" />
              <button *ngIf="snInputs[i]" (click)="clearSlot(i)" class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-rose-400 text-xs font-bold">✕</button>
            </div>
          </div>
        </div>

        <!-- VALIDATE CALIB (DIAG ADE) BUTTON -->
        <button
          (click)="triggerValidate()"
          class="w-full py-3 rounded-xl font-mono font-extrabold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 mt-2"
          [ngClass]="hasAnyActive() ? (isBaselineMissing
              ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse cursor-pointer'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer')
            : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>VALIDATE CALIB (DIAG ADE)</span>
        </button>
      </div>

      <hr class="border-slate-800/80" />

      <!-- ── SECTION 2: SÉLECTION DU MODÈLE CT ── -->
      <div class="space-y-2">
        <div class="section-title">MODÈLES CT</div>

        <!-- Tabs 10A vs 1000A -->
        <div class="grid grid-cols-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
          <button (click)="setTab('CT_10A')" class="py-1.5 rounded-lg font-bold transition-all text-center"
            [ngClass]="activeTab === 'CT_10A' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'">
            10A CTs
          </button>
          <button (click)="setTab('CT_1000A')" class="py-1.5 rounded-lg font-bold transition-all text-center"
            [ngClass]="activeTab === 'CT_1000A' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'">
            1000A CTs
          </button>
        </div>

        <!-- CT Model choices -->
        <div class="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
          <button *ngFor="let m of ctOptions" (click)="selectCt(m)"
            class="py-1.5 px-2 rounded-lg border font-bold text-center transition-all"
            [ngClass]="selectedCt === m
              ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow-sm'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'">
            {{ m }}
          </button>
        </div>
      </div>

      <hr class="border-slate-800/80" />

      <!-- ── SECTION 3: BOUTONS DE CALIBRATION ── -->
      <div class="space-y-2">
        <div class="section-title flex items-center justify-between">
          <span>CALIBRATION METIER</span>
          <span *ngIf="!isUnlocked" class="text-[9px] text-rose-400">🔒 Verrouillé</span>
        </div>

        <div class="space-y-2">
          <!-- U_I_CALIB -->
          <button (click)="uiCalib()"
            class="calib-btn" [ngClass]="isUnlocked ? 'unlocked' : 'locked'">
            <span>U_I_CALIB (cos φ = 1)</span>
          </button>

          <!-- PHASE_CALIB -->
          <button (click)="phaseCalib()"
            class="calib-btn" [ngClass]="isUnlocked ? 'unlocked' : 'locked'">
            <span>PHASE_CALIB (cos φ ≈ 0.5)</span>
          </button>

          <!-- POWER_CALIB -->
          <button (click)="powerCalib()"
            class="calib-btn" [ngClass]="isUnlocked ? 'unlocked' : 'locked'">
            <span>POWER_CALIB (cos φ = 1)</span>
          </button>

          <!-- RESET NVM -->
          <button (click)="resetNvm()"
            class="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl font-mono text-xs font-bold uppercase transition-all">
            RESET NVM
          </button>
        </div>
      </div>

      <hr class="border-slate-800/80" />

      <!-- ── SECTION 4: RELAIS & INTERVALLE ── -->
      <div class="space-y-2">
        <div class="section-title">COMMANDES & RELAIS</div>

        <div class="grid grid-cols-2 gap-2 text-xs font-mono">
          <!-- Relais -->
          <div *ngIf="activeTab === 'CT_10A'" class="bg-slate-950 border border-slate-800 p-2 rounded-xl space-y-1">
            <span class="text-[9px] text-slate-500 block">RELAIS</span>
            <div class="flex gap-1">
              <button (click)="relay(true)" class="flex-1 py-1 rounded font-bold text-center border"
                [ngClass]="relayOn ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'">ON</button>
              <button (click)="relay(false)" class="flex-1 py-1 rounded font-bold text-center border"
                [ngClass]="!relayOn ? 'bg-rose-700 border-rose-600 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'">OFF</button>
            </div>
          </div>

          <!-- Intervalle -->
          <div class="bg-slate-950 border border-slate-800 p-2 rounded-xl space-y-1">
            <span class="text-[9px] text-slate-500 block">INTERVALLE</span>
            <div class="flex gap-1">
              <button (click)="sendInterval(10)" class="flex-1 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 text-center font-bold">10s</button>
              <button (click)="sendInterval(5)"  class="flex-1 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 text-center font-bold">5s</button>
            </div>
          </div>
        </div>
      </div>

      <hr class="border-slate-800/80" />

      <!-- ── SECTION 5: ACTIONS & PDF REPORT ── -->
      <div class="space-y-2 pt-1 pb-4">
        <div class="section-title">ACTIONS & EXPORT</div>

        <div class="grid grid-cols-2 gap-2 text-xs font-mono">
          <button (click)="saveData()" class="py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 font-bold flex items-center justify-center gap-1.5">
            💾 SAVE DATA
          </button>
          <button (click)="saveLog()" class="py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 font-bold flex items-center justify-center gap-1.5">
            📋 SAVE LOG
          </button>
        </div>

        <button (click)="openReportModal.emit()"
          class="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-mono text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-cyan-500 transition-all">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <span>BOUTON REPORT PDF</span>
        </button>
      </div>

    </div>
  `
})
export class RightSidebarComponent implements OnDestroy {
  @Output() openReportModal = new EventEmitter<void>();

  slots: DeviceSlotState[] = [];
  snInputs: string[] = ['', '', '', '', ''];
  isConnected = false;
  activeTab: TabMode = 'CT_10A';
  selectedCt: CTModel = 'CT_600A';
  cosPhiMode: CosPhiMode = 'NORMAL_1_0';
  relayOn = false;

  private sub = new Subscription();

  constructor(
    private stateService: CalibrationStateService,
    private mqttService: MqttService,
    private cdr: ChangeDetectorRef
  ) {
    this.sub.add(this.mqttService.isConnected$.subscribe(c => {
      this.isConnected = c;
      this.cdr.markForCheck();
    }));

    this.sub.add(this.stateService.slots$.subscribe(slots => {
      this.slots = slots;
      slots.forEach((s, i) => {
        if (s.sn && !this.snInputs[i]) this.snInputs[i] = s.sn;
      });
      this.cosPhiMode = this.stateService.getOverallCosPhiMode();
      this.cdr.markForCheck();
    }));

    this.sub.add(this.stateService.activeTab$.subscribe(t => {
      this.activeTab = t;
      this.cdr.markForCheck();
    }));

    this.sub.add(this.stateService.selectedCtModel$.subscribe(c => {
      this.selectedCt = c;
      this.cdr.markForCheck();
    }));
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  get ctOptions(): CTModel[] {
    return this.activeTab === 'CT_10A'
      ? ['CT_600A', 'CT_200A', 'CT_5A']
      : ['CT_1000A', 'CT_2000A', 'CT_4000A', 'CT_RCG'];
  }

  get isUnlocked(): boolean { return this.stateService.areCalibButtonsUnlocked(); }
  get isBaselineMissing(): boolean { return this.stateService.isBaselineMissingForAnySlot(); }
  get isCurrentLock(): boolean { return this.stateService.isCurrentLockTriggered(); }

  onSnChange(i: number): void {
    const v = this.snInputs[i]?.trim().toLowerCase() ?? '';
    if (!v || this.isValidSN(v)) this.stateService.updateSlotSN(i, v);
  }

  clearSlot(i: number): void {
    this.snInputs[i] = '';
    this.stateService.clearSlot(i);
  }

  isValidSN(sn: string): boolean { return ValidationUtils.validateSN(sn); }

  applyPreset(sns: string[]): void {
    sns.forEach((sn, i) => {
      this.snInputs[i] = sn;
      this.stateService.updateSlotSN(i, sn);
    });
  }

  triggerValidate(): void {
    if (this.hasAnyActive()) this.stateService.validateCalibration();
  }

  hasAnyActive(): boolean { return this.slots.some(s => s.active && s.sn); }

  setTab(t: TabMode): void { this.stateService.setTabMode(t); }
  selectCt(m: CTModel): void { this.stateService.setSelectedCtModel(m); }
  sendInterval(s: number): void { this.stateService.setSendingInterval(s); }
  uiCalib(): void { this.stateService.sendUiCalibration(); }
  phaseCalib(): void { this.stateService.sendPhaseCalibration(); }
  powerCalib(): void { this.stateService.sendPowerCalibration(); }
  resetNvm(): void { this.stateService.resetNvm(); }
  relay(on: boolean): void { this.relayOn = on; this.stateService.setRelay(on); }

  saveData(): void {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.slots.filter(s => s.active)));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `wattnow_telemetry_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  saveLog(): void {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.slots.map(s => s.diagAde)));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `wattnow_diag_ade_log_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }
}
