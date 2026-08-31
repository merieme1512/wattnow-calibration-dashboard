import { Component, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { RadialGaugeComponent } from './radial-gauge.component';
import { CalibrationStateService } from '../../services/calibration-state.service';
import { DeviceSlotState, TabMode } from '../../models/calibration.model';
import { ValidationUtils } from '../../utils/validation.utils';

@Component({
  selector: 'app-gauge-grid',
  standalone: true,
  imports: [CommonModule, RadialGaugeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; background-color: #060911; }
    
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    .grid-wrapper {
      display: flex;
      align-items: flex-start;
      gap: 4px;
      padding: 6px;
      box-sizing: border-box;
    }

    .device-column {
      flex: 1 1 0;
      min-width: 0;
      background: #0b1120;
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
    }
    .device-header {
      background: #111827;
      padding: 4px 6px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .sn-title {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 800;
      font-size: 9px;
      color: #e2e8f0;
      letter-spacing: 0.02em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .badge-diag {
      font-size: 7px;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    
    .section-container {
      padding: 4px 3px;
      border-bottom: 1px solid rgba(255,255,255,0.03);
    }
    .section-title {
      font-size: 7px;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 2px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    
    .gauges-row-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 2px;
    }
    .gauges-row-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2px;
    }
  `],
  template: `
    <div class="grid-wrapper no-scrollbar">
      
      <!-- Placeholder when no SN is active -->
      <div *ngIf="!hasActiveSlot" class="w-full h-full flex flex-col items-center justify-center text-slate-500 font-mono text-sm">
        <svg class="w-16 h-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
        </svg>
        <p>ENTREZ UN SN DANS LA SIDEBAR POUR COMMENCER</p>
      </div>

      <!-- Device Columns -->
      <ng-container *ngFor="let slot of activeSlots">
        <div class="device-column">
          
          <!-- Column Header -->
          <div class="device-header">
            <div class="sn-title uppercase">{{ slot.sn }}</div>
            <div class="badge-diag" 
                 [ngClass]="slot.baselineCaptured ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50' : 'bg-rose-950/80 text-rose-400 border border-rose-800/50'">
              {{ slot.baselineCaptured ? '✓ DIAG OK' : '✗ NO DIAG' }}
            </div>
          </div>

          <div class="overflow-y-auto no-scrollbar flex-1 pb-4">
            
            <!-- SIGNAL / FREQUENCE -->
            <div class="section-container">
              <div class="section-title">SIGNAL / FRÉQUENCE</div>
              <div class="gauges-row-2">
                <app-radial-gauge label="RSSI" [value]="slot.telemetry?.rssi || 0" unit="dB" [min]="0" [max]="31" [isValid]="isValidRssi(slot.telemetry?.rssi)" [size]="46"></app-radial-gauge>
                <app-radial-gauge label="FREQ" [value]="slot.telemetry?.freq || 0" unit="Hz" [min]="48" [max]="52" [isValid]="isValidFrequence(slot.telemetry?.freq)" [size]="46"></app-radial-gauge>
              </div>
            </div>

            <!-- COURANT (A) -->
            <div class="section-container">
              <div class="section-title">COURANT (A)</div>
              <div class="gauges-row-3">
                <app-radial-gauge label="CURA" [value]="slot.telemetry?.curA || 0" unit="A" [min]="0" [max]="activeTab === 'CT_10A' ? 12 : 120" [isValid]="isValidCurrent(slot.telemetry?.curA)" [size]="46"></app-radial-gauge>
                <app-radial-gauge label="CURB" [value]="slot.telemetry?.curB || 0" unit="A" [min]="0" [max]="activeTab === 'CT_10A' ? 12 : 120" [isValid]="isValidCurrent(slot.telemetry?.curB)" [size]="46"></app-radial-gauge>
                <app-radial-gauge label="CURC" [value]="slot.telemetry?.curC || 0" unit="A" [min]="0" [max]="activeTab === 'CT_10A' ? 12 : 120" [isValid]="isValidCurrent(slot.telemetry?.curC)" [size]="46"></app-radial-gauge>
              </div>
            </div>

            <!-- TENSION (V) -->
            <div class="section-container">
              <div class="section-title">TENSION (V)</div>
              <div class="gauges-row-3">
                <app-radial-gauge label="VOLA" [value]="slot.telemetry?.volA || 0" unit="V" [min]="200" [max]="250" [isValid]="isValidVoltage(slot.telemetry?.volA)" [size]="46"></app-radial-gauge>
                <app-radial-gauge label="VOLB" [value]="slot.telemetry?.volB || 0" unit="V" [min]="200" [max]="250" [isValid]="isValidVoltage(slot.telemetry?.volB)" [size]="46"></app-radial-gauge>
                <app-radial-gauge label="VOLC" [value]="slot.telemetry?.volC || 0" unit="V" [min]="200" [max]="250" [isValid]="isValidVoltage(slot.telemetry?.volC)" [size]="46"></app-radial-gauge>
              </div>
            </div>

            <!-- PUIS. ACTIVE (W) -->
            <div class="section-container">
              <div class="section-title">PUIS. ACTIVE (W)</div>
              <div class="gauges-row-3">
                <app-radial-gauge label="PAA" [value]="slot.telemetry?.paA || 0" unit="W" [min]="0" [max]="activeTab === 'CT_10A' ? 2500 : 25000" [isValid]="isValidPower(slot.telemetry?.paA)" [size]="46"></app-radial-gauge>
                <app-radial-gauge label="PAB" [value]="slot.telemetry?.paB || 0" unit="W" [min]="0" [max]="activeTab === 'CT_10A' ? 2500 : 25000" [isValid]="isValidPower(slot.telemetry?.paB)" [size]="46"></app-radial-gauge>
                <app-radial-gauge label="PAC" [value]="slot.telemetry?.paC || 0" unit="W" [min]="0" [max]="activeTab === 'CT_10A' ? 2500 : 25000" [isValid]="isValidPower(slot.telemetry?.paC)" [size]="46"></app-radial-gauge>
              </div>
            </div>

            <!-- PUIS. APPARENTE (VA) -->
            <div class="section-container">
              <div class="section-title">PUIS. APPARENTE (VA)</div>
              <div class="gauges-row-3">
                <app-radial-gauge label="PACA" [value]="slot.telemetry?.pacA || 0" unit="VA" [min]="0" [max]="activeTab === 'CT_10A' ? 2500 : 25000" [isValid]="isValidPower(slot.telemetry?.pacA)" [size]="46"></app-radial-gauge>
                <app-radial-gauge label="PACB" [value]="slot.telemetry?.pacB || 0" unit="VA" [min]="0" [max]="activeTab === 'CT_10A' ? 2500 : 25000" [isValid]="isValidPower(slot.telemetry?.pacB)" [size]="46"></app-radial-gauge>
                <app-radial-gauge label="PACC" [value]="slot.telemetry?.pacC || 0" unit="VA" [min]="0" [max]="activeTab === 'CT_10A' ? 2500 : 25000" [isValid]="isValidPower(slot.telemetry?.pacC)" [size]="46"></app-radial-gauge>
              </div>
            </div>

            <!-- PUIS. REACTIVE (VAR) -->
            <div class="section-container">
              <div class="section-title">PUIS. RÉACTIVE (VAR)</div>
              <div class="gauges-row-3">
                <app-radial-gauge label="PREA" [value]="slot.telemetry?.preA || 0" unit="VAR" [min]="-20" [max]="20" [isValid]="isValidReactivePower(slot.telemetry?.preA)" [size]="46"></app-radial-gauge>
                <app-radial-gauge label="PREB" [value]="slot.telemetry?.preB || 0" unit="VAR" [min]="-20" [max]="20" [isValid]="isValidReactivePower(slot.telemetry?.preB)" [size]="46"></app-radial-gauge>
                <app-radial-gauge label="PREC" [value]="slot.telemetry?.preC || 0" unit="VAR" [min]="-20" [max]="20" [isValid]="isValidReactivePower(slot.telemetry?.preC)" [size]="46"></app-radial-gauge>
              </div>
            </div>

            <!-- FACTEUR DE PUISSANCE (COS Φ) -->
            <div class="section-container">
              <div class="section-title">FACTEUR PUIS. (COS Φ)</div>
              <div class="gauges-row-3">
                <app-radial-gauge label="PHIA" [value]="slot.telemetry?.phiA || 0" unit="" [min]="0" [max]="1" [isValid]="isValidCosPhi(slot.telemetry?.phiA)" [size]="46"></app-radial-gauge>
                <app-radial-gauge label="PHIB" [value]="slot.telemetry?.phiB || 0" unit="" [min]="0" [max]="1" [isValid]="isValidCosPhi(slot.telemetry?.phiB)" [size]="46"></app-radial-gauge>
                <app-radial-gauge label="PHIC" [value]="slot.telemetry?.phiC || 0" unit="" [min]="0" [max]="1" [isValid]="isValidCosPhi(slot.telemetry?.phiC)" [size]="46"></app-radial-gauge>
              </div>
            </div>

          </div>
        </div>
      </ng-container>

    </div>
  `
})
export class GaugeGridComponent implements OnDestroy {
  slots: DeviceSlotState[] = [];
  activeTab: TabMode = 'CT_10A';
  private sub = new Subscription();

  constructor(
    private stateService: CalibrationStateService,
    private cdr: ChangeDetectorRef
  ) {
    this.sub.add(this.stateService.slots$.subscribe(s => {
      this.slots = s;
      this.cdr.markForCheck();
    }));

    this.sub.add(this.stateService.activeTab$.subscribe(t => {
      this.activeTab = t;
      this.cdr.markForCheck();
    }));
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  get activeSlots(): DeviceSlotState[] {
    return this.slots.filter(s => s.active && s.sn);
  }

  get hasActiveSlot(): boolean {
    return this.activeSlots.length > 0;
  }

  isValidVoltage(v: number | undefined): boolean {
    return ValidationUtils.isVoltageValid(v ?? 0);
  }

  isValidCurrent(c: number | undefined): boolean {
    return ValidationUtils.isCurrentValid(c ?? 0, this.activeTab);
  }

  isValidFrequence(f: number | undefined): boolean {
    return ValidationUtils.isFrequencyValid(f ?? 0);
  }

  isValidRssi(rssi: number | string | undefined): boolean {
    return ValidationUtils.isRssiValid(rssi ?? 0);
  }

  isValidPower(p: number | undefined): boolean {
    return ValidationUtils.isActivePowerValid(p ?? 0, this.activeTab);
  }

  isValidReactivePower(q: number | undefined): boolean {
    return ValidationUtils.isReactivePowerValid(q ?? 0, this.activeTab);
  }

  isValidCosPhi(cos: number | undefined): boolean {
    const mode = this.stateService.getOverallCosPhiMode();
    return ValidationUtils.isPowerFactorValid(cos ?? 0, mode);
  }
}
// Clean validation update build trigger



