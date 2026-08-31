import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy, OnChanges, SimpleChanges, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Subscription } from 'rxjs';
import { DeviceSlotState, TabMode } from '../../models/calibration.model';
import { ValidationUtils } from '../../utils/validation.utils';
import { CalibrationStateService } from '../../services/calibration-state.service';

@Component({
  selector: 'app-report-pdf',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; }
    .pdf-preview {
      background: #ffffff;
      color: #0f172a;
      font-family: 'Helvetica', 'Arial', sans-serif;
    }
  `],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div class="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full flex flex-col max-h-[90vh] shadow-2xl overflow-hidden text-white">

        <!-- Modal Header -->
        <div class="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center font-bold text-sm">
              PDF
            </div>
            <div>
              <h3 class="font-bold text-base text-slate-100">Certificat de Calibration Wattnow</h3>
              <p class="text-xs text-slate-400 font-mono">Génération et export du rapport usine officiel</p>
            </div>
          </div>
          <button (click)="closeModal()" class="text-slate-400 hover:text-white text-xl font-bold px-2 py-1">✕</button>
        </div>

        <!-- Modal Body / PDF Canvas Container -->
        <div class="flex-1 overflow-y-auto p-6 bg-slate-950/50">

          <!-- Operateur Input -->
          <div class="mb-4 flex items-center gap-4 bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs font-mono">
            <label class="text-slate-400 font-bold">Nom du Technicien / Opérateur :</label>
            <input type="text" [(ngModel)]="operatorName" class="bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-lg text-cyan-300 w-64 focus:outline-none focus:border-cyan-500" placeholder="ex: Jean Dupont" />
            <span class="text-slate-500 ml-auto">Date : {{ currentDate }}</span>
          </div>

          <!-- Printable Area (White PDF style) -->
          <div #pdfContent class="pdf-preview p-8 rounded-xl shadow-2xl border border-slate-200 text-slate-800 space-y-6">

            <!-- Header logo & title -->
            <div class="flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <h1 class="text-2xl font-black tracking-tight text-slate-900">WATTNOW</h1>
                <p class="text-xs text-slate-500 font-bold uppercase tracking-widest">Rapport Officiel de Calibration Usine</p>
              </div>
              <div class="text-right font-mono text-xs text-slate-600">
                <p><strong>Réf Doc :</strong> WATT-CAL-2026-V2</p>
                <p><strong>Date :</strong> {{ currentDate }}</p>
                <p><strong>Banc :</strong> {{ activeTab }} ({{ activeTab === 'CT_10A' ? '10A / 230V' : '100A / 230V' }})</p>
              </div>
            </div>

            <!-- Summary Text -->
            <div class="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p>Ce document certifie la calibration des analyseurs d'énergie triphasés Wattnow ci-dessous. Les mesures ont été comparées à une source étalon 230V / {{ activeTab === 'CT_10A' ? '10A' : '100A' }} (cos φ = 1.0 et cos φ = 0.5).</p>
            </div>

            <!-- Table of Active Devices -->
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-900 text-white font-mono">
                  <th class="p-2.5 border border-slate-900">Emplacement</th>
                  <th class="p-2.5 border border-slate-900">N° de Série</th>
                  <th class="p-2.5 border border-slate-900">Tension (V)</th>
                  <th class="p-2.5 border border-slate-900">Courant (A)</th>
                  <th class="p-2.5 border border-slate-900">Puis. Act. (W)</th>
                  <th class="p-2.5 border border-slate-900">cos φ</th>
                  <th class="p-2.5 border border-slate-900">Gains ADE Baseline</th>
                  <th class="p-2.5 border border-slate-900 text-center">Résultat</th>
                </tr>
              </thead>
              <tbody class="font-mono text-[11px]">
                <tr *ngFor="let s of activeSlots; let idx = index" class="border-b border-slate-200 hover:bg-slate-50">
                  <td class="p-2 border border-slate-200 font-bold">Slot {{ s.slotIndex + 1 }}</td>
                  <td class="p-2 border border-slate-200 font-bold text-slate-900">{{ s.sn }}</td>
                  <td class="p-2 border border-slate-200">{{ s.telemetry?.volA || '—' }} V</td>
                  <td class="p-2 border border-slate-200">{{ s.telemetry?.curA || '—' }} A</td>
                  <td class="p-2 border border-slate-200">{{ s.telemetry?.paA || '—' }} W</td>
                  <td class="p-2 border border-slate-200">{{ s.telemetry?.phiA || '—' }}</td>
                  <td class="p-2 border border-slate-200 text-[9px] text-slate-600">
                    <div *ngIf="s.diagAde">
                      AV: {{ s.diagAde.Avgain }} | AI: {{ s.diagAde.Aigain }}
                    </div>
                    <div *ngIf="!s.diagAde" class="text-amber-700 italic">Non capturée</div>
                  </td>
                  <td class="p-2 border border-slate-200 text-center font-bold">
                    <span [ngClass]="isSlotPass(s) ? 'text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300' : 'text-red-700 bg-red-100 px-2 py-0.5 rounded border border-red-300'">
                      {{ isSlotPass(s) ? 'PASS ✓' : 'FAIL ✗' }}
                    </span>
                  </td>
                </tr>
                <tr *ngIf="activeSlots.length === 0">
                  <td colspan="8" class="p-4 text-center text-slate-500 italic">Aucun appareil connecté.</td>
                </tr>
              </tbody>
            </table>

            <!-- Signatures -->
            <div class="pt-8 grid grid-cols-2 gap-8 text-xs font-mono border-t border-slate-200">
              <div>
                <p class="font-bold text-slate-900 mb-8">Opérateur de Calibration :</p>
                <p class="text-slate-700 border-b border-slate-400 pb-1">Signature : {{ operatorName || '________________' }}</p>
              </div>
              <div>
                <p class="font-bold text-slate-900 mb-8">Responsable Qualité Wattnow :</p>
                <p class="text-slate-700 border-b border-slate-400 pb-1">Signature : ________________________</p>
              </div>
            </div>

          </div>

        </div>

        <!-- Modal Footer -->
        <div class="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button (click)="closeModal()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-mono font-bold text-slate-300">
            Fermer
          </button>
          <button (click)="exportPdf()" [disabled]="isExporting" class="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/25 flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            <span>{{ isExporting ? 'Génération du PDF...' : 'Télécharger Certificat PDF' }}</span>
          </button>
        </div>

      </div>
    </div>
  `
})
export class ReportPdfComponent implements OnInit, OnChanges, OnDestroy {
  @Input() isOpen: boolean = false;
  @Input() slots: DeviceSlotState[] = [];
  @Input() activeTab: TabMode = 'CT_10A';
  @Output() close = new EventEmitter<void>();

  operatorName: string = 'Technicien Wattnow';
  currentDate: string = new Date().toLocaleDateString('fr-FR') + ' ' + new Date().toLocaleTimeString('fr-FR');
  isExporting: boolean = false;
  private sub = new Subscription();

  constructor(
    private stateService: CalibrationStateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.sub.add(this.stateService.slots$.subscribe(s => {
      this.slots = [...s];
      this.cdr.markForCheck();
    }));
    this.sub.add(this.stateService.activeTab$.subscribe(t => {
      this.activeTab = t;
      this.cdr.markForCheck();
    }));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && changes['isOpen'].currentValue) {
      this.currentDate = new Date().toLocaleDateString('fr-FR') + ' ' + new Date().toLocaleTimeString('fr-FR');
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  get activeSlots(): DeviceSlotState[] {
    return (this.slots || []).filter(s => s.active && s.sn);
  }

  closeModal(): void {
    this.close.emit();
  }

  isSlotPass(s: DeviceSlotState): boolean {
    if (!s.baselineCaptured || !s.telemetry) return false;
    const t = s.telemetry;
    return ValidationUtils.isVoltageValid(t.volA) &&
           ValidationUtils.isCurrentValid(t.curA, this.activeTab) &&
           ValidationUtils.isActivePowerValid(t.paA, this.activeTab);
  }

  async exportPdf(): Promise<void> {
    const el = document.querySelector('.pdf-preview') as HTMLElement;
    if (!el) return;

    this.isExporting = true;
    try {
      const canvas = await html2canvas(el, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Certificat_Calibration_Wattnow_${Date.now()}.pdf`);
    } catch (err) {
      console.error('Erreur génération PDF:', err);
    } finally {
      this.isExporting = false;
    }
  }
}

