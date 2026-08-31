import { Component, EventEmitter, Output, ChangeDetectorRef, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalibrationStateService } from '../../services/calibration-state.service';
import { TabMode, CTModel, CosPhiMode } from '../../models/calibration.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-control-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; }
    .calib-btn {
      padding: 10px 18px;
      border-radius: 10px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      transition: all 0.2s;
      border: 1px solid transparent;
      display: flex; align-items: center; gap: 6px;
    }
    .calib-btn.unlocked {
      background: linear-gradient(135deg, #dc2626, #e11d48);
      color: white;
      border-color: #ef4444;
      box-shadow: 0 4px 14px rgba(220,38,38,0.35);
      cursor: pointer;
    }
    .calib-btn.unlocked:hover {
      background: linear-gradient(135deg, #b91c1c, #be123c);
      box-shadow: 0 4px 20px rgba(220,38,38,0.5);
      transform: translateY(-1px);
    }
    .calib-btn.locked {
      background: #1e293b;
      color: #475569;
      border-color: #334155;
      cursor: not-allowed;
    }
    .ct-btn { transition: all 0.15s; }
    .tab-btn { transition: all 0.2s; }
  `],
  template: `
    <div class="bg-slate-900 border-b border-slate-800 px-4 py-3 text-white space-y-3">

      <!-- ── Row 1: Tabs + CT Model + Interval ── -->
      <div class="flex flex-wrap items-center gap-3">

        <!-- CT Tab selector -->
        <div class="flex bg-slate-950 border border-slate-800 p-1 rounded-xl gap-1">
          <button class="tab-btn px-4 py-2 rounded-lg font-mono text-xs font-bold"
            (click)="setTab('CT_10A')"
            [ngClass]="activeTab === 'CT_10A'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
              : 'text-slate-400 hover:text-slate-200'">
            10A CTs&nbsp;&nbsp;<span class="text-[9px] opacity-70">(600A / 200A / 5A)</span>
          </button>
          <button class="tab-btn px-4 py-2 rounded-lg font-mono text-xs font-bold"
            (click)="setTab('CT_1000A')"
            [ngClass]="activeTab === 'CT_1000A'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
              : 'text-slate-400 hover:text-slate-200'">
            1000A CTs&nbsp;&nbsp;<span class="text-[9px] opacity-70">(1000A / 2000A / 4000A / RCG)</span>
          </button>
        </div>

        <!-- CT model buttons -->
        <div class="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-[10px]">
          <span class="text-slate-400 font-semibold mr-1">Modèle CT :</span>
          <button *ngFor="let m of ctOptions" (click)="selectCt(m)"
            class="ct-btn px-2.5 py-1 rounded-lg border font-bold"
            [ngClass]="selectedCt === m
              ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow-sm shadow-cyan-900/50'
              : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'">
            {{ m }}
          </button>
        </div>

        <!-- Sending interval -->
        <div class="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-[10px]">
          <span class="text-slate-400">Intervalle :</span>
          <button (click)="sendInterval(10)" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 border border-slate-700 transition-colors">10s</button>
          <button (click)="sendInterval(5)"  class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 border border-slate-700 transition-colors">5s</button>
        </div>

      </div>

      <!-- ── Row 2: Alert Banners ── -->
      <div *ngIf="isBaselineMissing"
           class="flex items-start gap-3 px-3 py-2.5 bg-red-950/70 border-2 border-red-600/80 rounded-xl text-red-200 text-xs font-mono shadow-lg animate-pulse">
        <svg class="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <span>
          <strong>VERROU CRITIQUE BASELINE :</strong> La trame DIAG ADE n'a pas encore été reçue pour tous les numéros de série actifs.
          Cliquez d'abord sur <strong class="underline cursor-pointer" (click)="forwardValidate()">VALIDATE CALIB</strong>.
        </span>
      </div>

      <div *ngIf="isCurrentLock && !isBaselineMissing"
           class="flex items-start gap-3 px-3 py-2.5 bg-red-950/70 border-2 border-red-600/80 rounded-xl text-red-200 text-xs font-mono shadow-lg">
        <svg class="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636"/>
        </svg>
        <span>
          <strong>VERROU SÉCURITÉ COURANT :</strong> Courant hors plage
          {{ activeTab === 'CT_10A' ? '[9.5A – 10.5A]' : '[99.5A – 100.5A]' }}.
          Calibration impossible.
        </span>
      </div>

      <!-- ── Row 3: Calibration Buttons + Relay + Report ── -->
      <div class="flex flex-wrap items-center gap-2 bg-slate-950/50 border border-slate-800 px-3 py-2.5 rounded-2xl">

        <!-- Lock icon when buttons are locked -->
        <div *ngIf="!isUnlocked" class="flex items-center gap-1.5 text-slate-500 font-mono text-[10px] mr-1">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
          <span>Déverr. requis</span>
        </div>

        <!-- U/I CALIB (cos φ = 1 only) -->
        <button *ngIf="cosPhiMode === 'NORMAL_1_0'" (click)="uiCalib()"
          class="calib-btn" [ngClass]="isUnlocked ? 'unlocked' : 'locked'">
          U_I_CALIB <span class="text-[9px] opacity-70">(cos φ = 1)</span>
        </button>

        <!-- PHASE CALIB (always visible) -->
        <button (click)="phaseCalib()"
          class="calib-btn" [ngClass]="isUnlocked ? 'unlocked' : 'locked'">
          PHASE_CALIB <span class="text-[9px] opacity-70">(cos φ ≈ 0.5)</span>
        </button>

        <!-- POWER CALIB (cos φ = 1 only) -->
        <button *ngIf="cosPhiMode === 'NORMAL_1_0'" (click)="powerCalib()"
          class="calib-btn" [ngClass]="isUnlocked ? 'unlocked' : 'locked'">
          POWER_CALIB <span class="text-[9px] opacity-70">(cos φ = 1)</span>
        </button>

        <!-- RESET NVM -->
        <button (click)="resetNvm()"
          class="calib-btn bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer">
          RESET NVM
        </button>

        <!-- Spacer -->
        <div class="flex-1"></div>

        <!-- Relay (10A tab only) -->
        <div *ngIf="activeTab === 'CT_10A'"
             class="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs">
          <span class="text-slate-400 font-semibold">Relais :</span>
          <button (click)="relay(true)"
            class="px-3 py-1 rounded-lg font-bold border transition-all"
            [ngClass]="relayOn ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm shadow-emerald-900/50' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-emerald-900/40 hover:border-emerald-700 hover:text-emerald-300'">
            ON
          </button>
          <button (click)="relay(false)"
            class="px-3 py-1 rounded-lg font-bold border transition-all"
            [ngClass]="!relayOn ? 'bg-red-700 border-red-600 text-white shadow-sm shadow-red-900/50' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-red-900/40 hover:border-red-700 hover:text-red-300'">
            OFF
          </button>
        </div>

        <!-- Report PDF button -->
        <button (click)="openReportModal.emit()"
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold
                 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500
                 text-white border border-cyan-400/50 shadow-lg shadow-cyan-900/30 transition-all hover:-translate-y-0.5">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          Bouton Report PDF
        </button>

      </div>
    </div>
  `
})
export class ControlPanelComponent implements OnDestroy {
  @Output() openReportModal = new EventEmitter<void>();

  activeTab: TabMode = 'CT_10A';
  selectedCt: CTModel = 'CT_600A';
  cosPhiMode: CosPhiMode = 'NORMAL_1_0';
  relayOn = false;

  private sub: Subscription;

  constructor(
    private stateService: CalibrationStateService,
    private cdr: ChangeDetectorRef
  ) {
    this.sub = new Subscription();
    this.sub.add(this.stateService.activeTab$.subscribe(t => { this.activeTab = t; this.cdr.markForCheck(); }));
    this.sub.add(this.stateService.selectedCtModel$.subscribe(c => { this.selectedCt = c; this.cdr.markForCheck(); }));
    this.sub.add(this.stateService.slots$.subscribe(() => {
      this.cosPhiMode = this.stateService.getOverallCosPhiMode();
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

  setTab(t: TabMode): void { this.stateService.setTabMode(t); }
  selectCt(m: CTModel): void { this.stateService.setSelectedCtModel(m); }
  sendInterval(s: number): void { this.stateService.setSendingInterval(s); }
  uiCalib(): void { this.stateService.sendUiCalibration(); }
  phaseCalib(): void { this.stateService.sendPhaseCalibration(); }
  powerCalib(): void { this.stateService.sendPowerCalibration(); }
  resetNvm(): void { this.stateService.resetNvm(); }
  relay(on: boolean): void { this.relayOn = on; this.stateService.setRelay(on); }
  forwardValidate(): void { this.stateService.validateCalibration(); }
}
