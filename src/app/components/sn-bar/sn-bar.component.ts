import { Component, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalibrationStateService } from '../../services/calibration-state.service';
import { DeviceSlotState } from '../../models/calibration.model';
import { ValidationUtils } from '../../utils/validation.utils';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sn-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; }
    input { transition: border-color 0.2s; }
    input:focus { outline: none; }
    .slot-card { transition: border-color 0.3s, box-shadow 0.3s; }
  `],
  template: `
    <div class="bg-slate-900 border-b border-slate-800 px-4 py-3 text-white">
      <div class="flex flex-col xl:flex-row items-start xl:items-center gap-3">

        <!-- ── SN Input Cards ── -->
        <div class="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          <div *ngFor="let slot of slots; let i = index"
               class="slot-card rounded-xl border px-2.5 py-2 bg-slate-950/60"
               [ngClass]="{
                 'border-emerald-600/70 shadow-emerald-950/40 shadow-md': slot.active && slot.baselineCaptured,
                 'border-amber-600/60 shadow-amber-950/30 shadow-md':    slot.active && !slot.baselineCaptured && slot.telemetry,
                 'border-orange-700/50':                                  slot.active && !slot.baselineCaptured && !slot.telemetry,
                 'border-slate-800':                                      !slot.active
               }">

            <!-- Slot label + status badge -->
            <div class="flex items-center justify-between font-mono mb-1.5">
              <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">SN SLOT {{ i + 1 }}</span>
              <span *ngIf="slot.active"
                    class="text-[9px] font-bold px-1.5 py-0.5 rounded"
                    [ngClass]="{
                      'bg-emerald-900/80 text-emerald-300': slot.baselineCaptured,
                      'bg-orange-900/80 text-orange-300':   !slot.baselineCaptured
                    }">
                {{ slot.baselineCaptured ? 'BASELINE OK' : 'NO BASELINE' }}
              </span>
            </div>

            <!-- SN Input field -->
            <div class="relative">
              <input type="text"
                [(ngModel)]="inputValues[i]"
                (change)="onSnChange(i)"
                (keyup.enter)="onSnChange(i)"
                [placeholder]="'ex: sn-13-' + (99990 + i + 1)"
                class="w-full bg-slate-900/80 text-[11px] font-mono px-2 py-1.5 pr-6 rounded-lg border"
                [ngClass]="{
                  'border-slate-700 text-slate-200 focus:border-cyan-500': !inputValues[i] || isValidSN(inputValues[i]),
                  'border-red-600 text-red-300': inputValues[i] && !isValidSN(inputValues[i])
                }" />
              <button *ngIf="inputValues[i]"
                (click)="clearSlot(i)"
                class="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-400 text-xs font-bold">
                ✕
              </button>
            </div>

            <!-- Connection status line -->
            <div class="mt-1 font-mono flex items-center justify-between text-[9px]">
              <div class="flex items-center space-x-1">
                <span class="w-1.5 h-1.5 rounded-full"
                      [ngClass]="{
                        'bg-emerald-400': slot.telemetry,
                        'bg-amber-400 animate-pulse': slot.active && !slot.telemetry,
                        'bg-slate-600': !slot.active
                      }"></span>
                <span [ngClass]="{
                  'text-emerald-400': slot.telemetry,
                  'text-amber-400':   slot.active && !slot.telemetry,
                  'text-slate-600':   !slot.active
                }">
                  {{ slot.telemetry ? 'Connected' : slot.active ? 'Waiting data' : 'Empty' }}
                </span>
              </div>
              <span *ngIf="slot.isSticky" class="text-amber-500 animate-pulse">Sticky 5s</span>
            </div>
          </div>
        </div>

        <!-- ── Right Actions ── -->
        <div class="flex flex-col sm:flex-row xl:flex-col items-start gap-2 shrink-0">

          <!-- Preset Buttons -->
          <div class="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 font-mono text-[10px]">
            <span class="text-slate-400">Presets:</span>
            <button (click)="applyPreset(['sn-13-10467','sn-13-13325'])"
              class="px-2 py-1 bg-slate-800 hover:bg-cyan-900/60 hover:text-cyan-300 rounded text-slate-300 transition-colors">
              2x SN-13
            </button>
            <button (click)="applyPreset(['sn-17-70001','sn-18-80002','sn-14-50003'])"
              class="px-2 py-1 bg-slate-800 hover:bg-cyan-900/60 hover:text-cyan-300 rounded text-slate-300 transition-colors">
              3x Multi
            </button>
          </div>

          <!-- VALIDATE CALIB Button -->
          <button
            (click)="triggerValidate()"
            class="flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold font-mono text-xs tracking-wider uppercase transition-all shadow-lg"
            [ngClass]="hasAnyActive() ? (isBaselineMissing()
                ? 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-red-900/50 ring-2 ring-red-500/30 animate-pulse'
                : 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-emerald-900/40')
              : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>VALIDATE CALIB (Diag ADE)</span>
          </button>

        </div>
      </div>
    </div>
  `
})
export class SnBarComponent implements OnDestroy {
  slots: DeviceSlotState[] = [];
  inputValues: string[] = ['', '', '', '', ''];
  private sub: Subscription;

  constructor(
    private stateService: CalibrationStateService,
    private cdr: ChangeDetectorRef
  ) {
    this.sub = this.stateService.slots$.subscribe(slots => {
      this.slots = slots;
      // Keep input values in sync with service (covers default pre-loads)
      slots.forEach((s, i) => {
        if (s.sn && !this.inputValues[i]) {
          this.inputValues[i] = s.sn;
        }
      });
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  onSnChange(i: number): void {
    const v = this.inputValues[i]?.trim() ?? '';
    if (!v || this.isValidSN(v)) {
      this.stateService.updateSlotSN(i, v);
    }
  }

  clearSlot(i: number): void {
    this.inputValues[i] = '';
    this.stateService.clearSlot(i);
  }

  isValidSN(sn: string): boolean {
    return ValidationUtils.validateSN(sn);
  }

  applyPreset(sns: string[]): void {
    sns.forEach((sn, i) => {
      this.inputValues[i] = sn;
      this.stateService.updateSlotSN(i, sn);
    });
  }

  triggerValidate(): void {
    if (this.hasAnyActive()) this.stateService.validateCalibration();
  }

  isBaselineMissing(): boolean {
    return this.stateService.isBaselineMissingForAnySlot();
  }

  hasAnyActive(): boolean {
    return this.slots.some(s => s.active && s.sn);
  }
}
