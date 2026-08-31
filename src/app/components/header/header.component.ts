import { Component, ChangeDetectionStrategy, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MqttService } from '../../services/mqtt.service';
import { CalibrationStateService } from '../../services/calibration-state.service';
import { CosPhiMode } from '../../models/calibration.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; }
  `],
  template: `
    <header class="glass-panel border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between text-white shadow-xl">

      <!-- Logo & Title -->
      <div class="flex items-center space-x-3.5">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 flex items-center justify-center font-black text-base shadow-lg shadow-cyan-500/20 text-white tracking-wider">
          W
        </div>
        <div>
          <div class="flex items-center space-x-2">
            <h1 class="font-extrabold text-base tracking-tight text-white">WATTNOW</h1>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
              CALIB V2
            </span>
          </div>
          <p class="text-[11px] text-slate-400 font-mono tracking-tight">
            Analyseurs Triphasés (1 ADE & Multi-départ 5 ADE)
          </p>
        </div>
      </div>

      <!-- Center Badge: Detected Cos Phi -->
      <div class="hidden md:flex items-center space-x-2 bg-slate-900/80 border border-slate-800 px-4 py-1.5 rounded-full font-mono text-xs shadow-inner">
        <span class="w-2 h-2 rounded-full" [ngClass]="cosPhiMode === 'NORMAL_1_0' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'"></span>
        <span class="text-slate-400">Cos φ Détecté :</span>
        <span class="font-bold" [ngClass]="cosPhiMode === 'NORMAL_1_0' ? 'text-emerald-400' : 'text-amber-400'">
          {{ cosPhiMode === 'NORMAL_1_0' ? 'Normal (≈ 1.0)' : 'Phase (≈ 0.5)' }}
        </span>
      </div>

      <!-- Right Controls: Sim Toggle + Broker Status -->
      <div class="flex items-center space-x-4">

        <!-- Simulator Toggle -->
        <button (click)="toggleSimulator()"
          class="flex items-center space-x-2 px-3 py-1.5 rounded-xl font-mono text-xs font-semibold border transition-all duration-200"
          [ngClass]="isSimulator
            ? 'bg-purple-950/60 text-purple-300 border-purple-800/60 shadow-sm shadow-purple-950'
            : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'">
          <span class="w-2 h-2 rounded-full" [ngClass]="isSimulator ? 'bg-purple-400 animate-pulse' : 'bg-slate-600'"></span>
          <span>{{ isSimulator ? 'Mode Simulateur Actif' : 'Mode Broker Live' }}</span>
        </button>

        <!-- Broker Status -->
        <div class="flex items-center space-x-2 bg-slate-900/90 border border-slate-800/80 px-3.5 py-1.5 rounded-xl font-mono text-xs">
          <span class="w-2.5 h-2.5 rounded-full"
            [ngClass]="isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/80' : 'bg-red-500 animate-pulse'"></span>
          <span [ngClass]="isConnected ? 'text-slate-200' : 'text-red-400'" class="font-medium">
            {{ isConnected ? 'broker.emqx.io:8083' : 'Déconnecté' }}
          </span>
          <button (click)="openConfigModal()" class="text-slate-500 hover:text-cyan-400 transition-colors ml-1 font-bold text-[10px] uppercase tracking-wider">
            Config
          </button>
        </div>

      </div>

    </header>

    <!-- Broker Config Modal -->
    <div *ngIf="showConfigModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div class="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-white">
        <h3 class="font-bold text-base text-slate-100 flex items-center justify-between">
          <span>Configuration Broker MQTT</span>
          <button (click)="showConfigModal = false" class="text-slate-400 hover:text-white">✕</button>
        </h3>
        <div class="space-y-3 font-mono text-xs">
          <div>
            <label class="block text-slate-400 mb-1">Host WebSocket :</label>
            <input type="text" [(ngModel)]="configHost" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label class="block text-slate-400 mb-1">Port WebSocket :</label>
            <input type="number" [(ngModel)]="configPort" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500" />
          </div>
        </div>
        <div class="flex justify-end space-x-2 pt-2">
          <button (click)="showConfigModal = false" class="px-4 py-2 bg-slate-800 rounded-xl text-xs font-mono text-slate-300">Annuler</button>
          <button (click)="saveConfig()" class="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-xs font-mono font-bold text-white shadow-lg shadow-cyan-600/30">Connecter</button>
        </div>
      </div>
    </div>
  `
})
export class HeaderComponent implements OnDestroy {
  isConnected = false;
  isSimulator = true;
  cosPhiMode: CosPhiMode = 'NORMAL_1_0';
  showConfigModal = false;
  configHost = 'broker.emqx.io';
  configPort = 8083;

  private sub = new Subscription();

  constructor(
    private mqttService: MqttService,
    private stateService: CalibrationStateService,
    private cdr: ChangeDetectorRef
  ) {
    this.sub.add(this.mqttService.isConnected$.subscribe(c => {
      this.isConnected = c;
      this.cdr.markForCheck();
    }));
    this.sub.add(this.mqttService.isSimulator$.subscribe(s => {
      this.isSimulator = s;
      this.cdr.markForCheck();
    }));
    this.sub.add(this.stateService.slots$.subscribe(() => {
      this.cosPhiMode = this.stateService.getOverallCosPhiMode();
      this.cdr.markForCheck();
    }));
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  toggleSimulator(): void {
    this.mqttService.setSimulatorMode(!this.isSimulator);
  }

  openConfigModal(): void {
    this.showConfigModal = true;
  }

  saveConfig(): void {
    this.mqttService.connect({
      host: this.configHost,
      port: Number(this.configPort),
      protocol: 'ws',
      path: '/mqtt'
    });
    this.showConfigModal = false;
  }
}
