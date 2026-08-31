import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CalibrationStateService } from '../../services/calibration-state.service';
import { DeviceSlotState } from '../../models/calibration.model';
import { ValidationUtils } from '../../utils/validation.utils';

@Component({
  selector: 'app-device-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; height: 100%; }
    .gauge-arc-track { stroke: #1e2d3d; }
    .gauge-arc-val   { transition: stroke-dashoffset 0.6s ease-out, stroke 0.4s ease; }
    input:focus { outline: none; }
  `],
  template: `
    <div class="h-full flex flex-col border-r border-slate-800 bg-slate-950">

      <!-- ─── SN Input Header ─────────────────────────────── -->
      <div class="px-3 pt-3 pb-2 border-b border-slate-800 shrink-0">
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">
            Appareil {{ slotIndex + 1 }}
          </span>
          <span *ngIf="slot.active" class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full"
              [ngClass]="slot.telemetry ? 'bg-emerald-400 animate-ping' : 'bg-amber-400 animate-pulse'"></span>
            <span class="text-[9px] font-mono font-bold"
              [ngClass]="slot.telemetry ? 'text-emerald-400' : 'text-amber-400'">
              {{ slot.telemetry ? 'Live (' + secondsAgo + 's)' : 'En attente…' }}
            </span>
          </span>
        </div>

        <div class="relative">
          <input type="text" [(ngModel)]="snInput" (change)="applySnChange()"
            (keyup.enter)="applySnChange()"
            placeholder="ex: sn-13-99991"
            class="w-full text-[11px] font-mono px-2.5 py-1.5 pr-7 rounded-lg border bg-slate-950 text-slate-100 placeholder-slate-600"
            [ngClass]="snInput && !isValidSn(snInput)
              ? 'border-red-700 focus:border-red-500'
              : slot.active ? 'border-cyan-800 focus:border-cyan-500' : 'border-slate-700 focus:border-slate-500'" />
          <button *ngIf="snInput" (click)="clear()"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-400 text-xs">✕</button>
        </div>

        <!-- Mode detect badge -->
        <div *ngIf="slot.telemetry" class="mt-1.5 flex items-center justify-between">
          <span class="text-[9px] font-mono px-2 py-0.5 rounded-md font-bold"
            [ngClass]="detectedMode === '100A'
              ? 'bg-purple-900/60 text-purple-300 border border-purple-700/50'
              : 'bg-blue-900/60 text-blue-300 border border-blue-700/50'">
            ⚡ Mode {{ detectedMode }}
          </span>
          <span class="text-[9px] font-mono text-slate-400">
            Dernier envoi: <strong class="text-cyan-400">{{ secondsAgo }}s</strong>
          </span>
        </div>
      </div>

      <!-- ─── Gauges ──────────────────────────────────────── -->
      <div class="flex-1 overflow-y-auto px-2 py-2 space-y-2">

        <ng-container *ngIf="slot.telemetry; else emptyState">
          <!-- RSSI + Fréquence -->
          <div class="grid grid-cols-2 gap-1 justify-items-center">
            <ng-container *ngTemplateOutlet="gaugeT; context: {
              label: 'rssi', val: slot.telemetry!.rssi, unit: 'dB',
              min: 0, max: 31, ok: isRssiOk(slot.telemetry!.rssi) }"></ng-container>
            <ng-container *ngTemplateOutlet="gaugeT; context: {
              label: 'freq', val: slot.telemetry!.freq, unit: 'Hz',
              min: 49, max: 51, ok: isFreqOk(slot.telemetry!.freq) }"></ng-container>
          </div>

          <!-- Courants -->
          <div class="grid grid-cols-3 gap-0.5 justify-items-center">
            <ng-container *ngTemplateOutlet="gaugeT; context: {
              label: 'I-A', val: slot.telemetry!.curA, unit: 'A',
              min: 0, max: curMax, ok: isCurOk(slot.telemetry!.curA) }"></ng-container>
            <ng-container *ngTemplateOutlet="gaugeT; context: {
              label: 'I-B', val: slot.telemetry!.curB, unit: 'A',
              min: 0, max: curMax, ok: isCurOk(slot.telemetry!.curB) }"></ng-container>
            <ng-container *ngTemplateOutlet="gaugeT; context: {
              label: 'I-C', val: slot.telemetry!.curC, unit: 'A',
              min: 0, max: curMax, ok: isCurOk(slot.telemetry!.curC) }"></ng-container>
          </div>

          <!-- Tensions -->
          <div class="grid grid-cols-3 gap-0.5 justify-items-center">
            <ng-container *ngTemplateOutlet="gaugeT; context: {
              label: 'V-A', val: slot.telemetry!.volA, unit: 'V',
              min: 220, max: 240, ok: isVolOk(slot.telemetry!.volA) }"></ng-container>
            <ng-container *ngTemplateOutlet="gaugeT; context: {
              label: 'V-B', val: slot.telemetry!.volB, unit: 'V',
              min: 220, max: 240, ok: isVolOk(slot.telemetry!.volB) }"></ng-container>
            <ng-container *ngTemplateOutlet="gaugeT; context: {
              label: 'V-C', val: slot.telemetry!.volC, unit: 'V',
              min: 220, max: 240, ok: isVolOk(slot.telemetry!.volC) }"></ng-container>
          </div>

          <!-- Puissances actives -->
          <div class="grid grid-cols-3 gap-0.5 justify-items-center">
            <ng-container *ngTemplateOutlet="gaugeT; context: {
              label: 'P-A', val: slot.telemetry!.paA, unit: 'W',
              min: 0, max: powMax, ok: isPaOk(slot.telemetry!.paA) }"></ng-container>
            <ng-container *ngTemplateOutlet="gaugeT; context: {
              label: 'P-B', val: slot.telemetry!.paB, unit: 'W',
              min: 0, max: powMax, ok: isPaOk(slot.telemetry!.paB) }"></ng-container>
            <ng-container *ngTemplateOutlet="gaugeT; context: {
              label: 'P-C', val: slot.telemetry!.paC, unit: 'W',
              min: 0, max: powMax, ok: isPaOk(slot.telemetry!.paC) }"></ng-container>
          </div>

          <!-- cos φ -->
          <div class="grid grid-cols-3 gap-0.5 justify-items-center">
            <ng-container *ngTemplateOutlet="gaugeT; context: {
              label: 'cosφA', val: slot.telemetry!.phiA, unit: '',
              min: 0, max: 1, ok: isPhiOk(slot.telemetry!.phiA) }"></ng-container>
            <ng-container *ngTemplateOutlet="gaugeT; context: {
              label: 'cosφB', val: slot.telemetry!.phiB, unit: '',
              min: 0, max: 1, ok: isPhiOk(slot.telemetry!.phiB) }"></ng-container>
            <ng-container *ngTemplateOutlet="gaugeT; context: {
              label: 'cosφC', val: slot.telemetry!.phiC, unit: '',
              min: 0, max: 1, ok: isPhiOk(slot.telemetry!.phiC) }"></ng-container>
          </div>

          <!-- Calibration status -->
          <div class="mt-1 rounded-lg border px-2 py-1.5 font-mono text-[9px] text-center font-bold"
            [ngClass]="slot.baselineCaptured
              ? 'border-emerald-700/50 bg-emerald-950/40 text-emerald-400'
              : 'border-amber-700/50 bg-amber-950/40 text-amber-400'">
            {{ slot.baselineCaptured ? '✓ BASELINE OK — Calibration Prête' : '⚠ Baseline non capturée' }}
          </div>

        </ng-container>

        <!-- Empty state -->
        <ng-template #emptyState>
          <div class="flex flex-col items-center justify-center py-12 text-slate-700">
            <svg class="w-10 h-10 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
                d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
            </svg>
            <p class="text-xs font-mono">Entrez un SN</p>
            <p class="text-[9px] mt-1">pour activer cet emplacement</p>
          </div>
        </ng-template>

      </div>

      <!-- ─── Gauge SVG template ──────────────────────────── -->
      <ng-template #gaugeT let-label="label" let-val="val" let-unit="unit"
                   let-mn="min" let-mx="max" let-ok="ok">
        <div class="flex flex-col items-center">
          <svg width="64" height="44" viewBox="0 0 68 46">
            <!-- Track -->
            <path [attr.d]="horseshoe(34,42,28)" fill="none" class="gauge-arc-track" stroke-width="8" stroke-linecap="round"/>
            <!-- Value arc -->
            <path [attr.d]="horseshoe(34,42,28)" fill="none" class="gauge-arc-val"
              [attr.stroke]="ok ? '#22c55e' : '#f43f5e'" stroke-width="8" stroke-linecap="round"
              [attr.stroke-dasharray]="arcLen(28)"
              [attr.stroke-dashoffset]="arcOffset(val, mn, mx, 28)"/>
            <!-- Center value -->
            <text x="34" y="38" text-anchor="middle" dominant-baseline="middle"
              font-family="'JetBrains Mono',monospace" font-weight="800" font-size="10"
              [attr.fill]="ok ? '#22c55e' : '#f43f5e'">{{ fmt(val) }}</text>
          </svg>
          <div class="text-[8.5px] font-mono font-bold -mt-1"
            [style.color]="ok ? '#64748b' : '#f87171'">{{ label }}<span class="opacity-50 ml-0.5">{{ unit }}</span></div>
        </div>
      </ng-template>

    </div>
  `
})
export class DeviceCardComponent implements OnInit, OnDestroy {
  @Input() slotIndex: number = 0;
  slot: DeviceSlotState = this.emptySlot();
  snInput: string = '';
  private sub!: Subscription;
  private timerId: any;

  constructor(private state: CalibrationStateService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.sub = this.state.slots$.subscribe(slots => {
      this.slot = slots[this.slotIndex];
      if (this.slot && this.slot.sn && !this.snInput) this.snInput = this.slot.sn;
      this.cdr.markForCheck();
    });

    this.timerId = setInterval(() => {
      if (this.slot?.lastUpdated) {
        this.cdr.markForCheck();
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.sub) this.sub.unsubscribe();
    if (this.timerId) clearInterval(this.timerId);
  }

  get secondsAgo(): number {
    if (!this.slot?.lastUpdated) return 0;
    const diff = Math.floor((Date.now() - this.slot.lastUpdated) / 1000);
    return Math.max(0, diff);
  }

  applySnChange(): void {
    const v = this.snInput.trim().toLowerCase();
    this.state.updateSlotSN(this.slotIndex, v);
  }
  clear(): void { this.snInput = ''; this.state.clearSlot(this.slotIndex); }
  isValidSn(s: string): boolean { return ValidationUtils.validateSN(s); }

  get detectedMode(): '10A' | '100A' {
    const c = this.slot.telemetry?.curA ?? 0;
    return c > 20 ? '100A' : '10A';
  }
  get curMax(): number { return this.detectedMode === '100A' ? 130 : 15; }
  get powMax(): number { return this.detectedMode === '100A' ? 32000 : 3500; }

  isRssiOk(v: number | string): boolean { return ValidationUtils.isRssiValid(v); }
  isFreqOk(v: number): boolean { return ValidationUtils.isFrequencyValid(v); }
  isVolOk(v: number): boolean { return ValidationUtils.isVoltageValid(v); }
  isCurOk(v: number): boolean {
    const tab = this.detectedMode === '100A' ? 'CT_1000A' : 'CT_10A';
    return ValidationUtils.isCurrentValid(v, tab as any);
  }
  isPaOk(v: number): boolean {
    const tab = this.detectedMode === '100A' ? 'CT_1000A' : 'CT_10A';
    return ValidationUtils.isActivePowerValid(v, tab as any);
  }
  isPhiOk(v: number): boolean { return v >= 0.98 && v <= 1.0; }

  horseshoe(cx: number, cy: number, r: number): string {
    const p1 = this.pt(cx, cy, r, -225);
    const p2 = this.pt(cx, cy, r, 45);
    return `M${p1.x} ${p1.y} A${r} ${r} 0 1 1 ${p2.x} ${p2.y}`;
  }
  arcLen(r: number): number { return (270 / 360) * 2 * Math.PI * r; }
  arcOffset(val: number | string, mn: number, mx: number, r: number): number {
    const n = typeof val === 'string' ? parseFloat(val) : val;
    const pct = Math.min(1, Math.max(0, (n - mn) / (mx - mn || 1)));
    return this.arcLen(r) * (1 - pct);
  }
  fmt(v: number | string): string {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    if (isNaN(n)) return '–';
    if (Math.abs(n) >= 10000) return (n / 1000).toFixed(1) + 'k';
    if (Math.abs(n) >= 1000)  return n.toFixed(0);
    if (Math.abs(n) >= 100)   return n.toFixed(1);
    if (Math.abs(n) >= 10)    return n.toFixed(2);
    return n.toFixed(3);
  }
  pt(cx: number, cy: number, r: number, deg: number) {
    const rad = deg * Math.PI / 180;
    return { x: +(cx + r * Math.cos(rad)).toFixed(3), y: +(cy + r * Math.sin(rad)).toFixed(3) };
  }
  private emptySlot(): DeviceSlotState {
    return { slotIndex: 0, sn: '', active: false, telemetry: null, diagAde: null,
      baselineCaptured: false, cosPhiMode: 'NORMAL_1_0',
      consecutiveModeCounts: { mode: 'NORMAL_1_0', count: 0 },
      isCurrentValidForCalibration: false, isSticky: false, lastUpdated: 0 };
  }
}
