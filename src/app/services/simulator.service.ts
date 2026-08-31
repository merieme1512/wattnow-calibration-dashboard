import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { TelemetryData, DiagAdeData, CTModel } from '../models/calibration.model';

@Injectable({ providedIn: 'root' })
export class SimulatorService {
  private isSimulating = false;
  private intervalId: any = null;

  private messageSubject = new Subject<{ topic: string; payload: any }>();
  public message$: Observable<{ topic: string; payload: any }> = this.messageSubject.asObservable();

  private activeSns: string[] = [];
  private currentCtModel: CTModel = 'CT_600A';
  private targetCosPhi: number = 1.0;
  private frameCounters: { [sn: string]: number } = {};

  startSimulator(sns: string[]): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.activeSns = sns.filter(s => !!s);
    if (this.activeSns.length === 0) this.activeSns = ['sn-13-99991'];
    this.isSimulating = true;

    // Initialize frame counters
    this.activeSns.forEach(sn => { this.frameCounters[sn] = 0; });

    // Emit first telemetry frames immediately
    this.activeSns.forEach(sn => this.emitTelemetryFrame(sn));

    // Emit DiagAde after 1.5s
    setTimeout(() => {
      if (this.isSimulating) {
        this.activeSns.forEach(sn => this.emitDiagAdeFrame(sn));
      }
    }, 1500);

    // Recurring telemetry every 1s
    this.intervalId = setInterval(() => {
      if (!this.isSimulating) return;
      this.activeSns.forEach(sn => this.emitTelemetryFrame(sn));
    }, 1000);
  }

  stopSimulator(): void {
    this.isSimulating = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  setActiveSns(sns: string[]): void {
    const filtered = sns.filter(s => !!s);
    
    // Find new SNs to initialize
    filtered.forEach(sn => {
      if (!this.activeSns.includes(sn)) {
        this.frameCounters[sn] = 0;
        // Send immediate first frame for new SN
        if (this.isSimulating) this.emitTelemetryFrame(sn);
      }
    });

    this.activeSns = filtered;
  }

  setCosPhiTarget(val: number): void {
    this.targetCosPhi = val;
  }

  handlePublishedCommand(topic: string, payload: any): void {
    const snMatch = topic.match(/wattnow-v2\/cmd\/(.+)/);
    const sn = snMatch ? snMatch[1] : null;

    if (payload.diag_mode_ade === 1) {
      const targets = sn ? [sn] : this.activeSns;
      targets.forEach(s => this.emitDiagAdeFrame(s));
    }

    if (payload.cmd && payload.cmd.startsWith('CT_')) {
      this.currentCtModel = payload.cmd as CTModel;
    }

    if (payload.CALIBRATION_PHASE_ENABLE === 1) {
      this.targetCosPhi = 0.5;
      this.activeSns.forEach(s => this.emitTelemetryFrame(s));
    } else if (payload.CALIBRATION_ENABLE === 1) {
      this.targetCosPhi = 1.0;
      this.activeSns.forEach(s => this.emitTelemetryFrame(s));
    }
  }

  private emitDiagAdeFrame(sn: string): void {
    const diagPayload: DiagAdeData = {
      serial: sn,
      device: `dn-${sn.substring(3)}`,
      FW_ver: '0.6.0',
      BL_ver: '0.4.2',
      Update_flag: 2,
      rssi: 22,
      relay_status_d: 'OFF',
      Frame: 'DiagAde',
      Avgain: 1445168 + Math.floor((Math.random() - 0.5) * 2000),
      Bvgain: 1270912 + Math.floor((Math.random() - 0.5) * 2000),
      Cvgain: 1407200 + Math.floor((Math.random() - 0.5) * 2000),
      Aigain: 168480 + Math.floor((Math.random() - 0.5) * 500),
      Bigain: 1244240 + Math.floor((Math.random() - 0.5) * 500),
      Cigain: -329744 + Math.floor((Math.random() - 0.5) * 500),
      A_Phase_gain: -32151094,
      B_Phase_gain: -46666085,
      C_Phase_gain: -25506136,
      Apgain: 152897,
      Bpgain: 305802,
      Cpgain: 312636,
      vts: '0.0012484395',
      cts: 3000,
      adc_redirect: 2097089,
      AIgain_Inversion: 'OFF',
      BIgain_Inversion: 'OFF',
      CIgain_Inversion: 'OFF',
      timestamp: Date.now()
    };

    this.messageSubject.next({ topic: `wattnow-v2/log/${sn}`, payload: diagPayload });
  }

  private emitTelemetryFrame(sn: string): void {
    const is1000A = ['CT_1000A', 'CT_2000A', 'CT_4000A', 'CT_RCG'].includes(this.currentCtModel);
    const nomCur = is1000A ? 100 : 10;
    const nomVol = 230;
    const phi = this.targetCosPhi;

    const jitter = () => (Math.random() - 0.5) * 0.04; // ±2% noise
    const cur = (n: number) => Number((n * (1 + jitter())).toFixed(3));
    const vol = (n: number) => Number((n + (Math.random() - 0.5) * 0.15).toFixed(3));

    const curA = cur(nomCur), curB = cur(nomCur), curC = cur(nomCur);
    const volA = vol(nomVol), volB = vol(nomVol), volC = vol(nomVol);
    const phiA = Number(Math.min(1, Math.max(0, phi + (Math.random() - 0.5) * 0.005)).toFixed(4));
    const phiB = Number(Math.min(1, Math.max(0, phi + (Math.random() - 0.5) * 0.005)).toFixed(4));
    const phiC = Number(Math.min(1, Math.max(0, phi + (Math.random() - 0.5) * 0.005)).toFixed(4));

    const pa = (v: number, c: number, p: number) => Number((v * c * p).toFixed(2));
    const pac = (v: number, c: number) => Number((v * c).toFixed(2));
    const pre = (v: number, c: number, p: number) => Number((v * c * Math.sqrt(Math.max(0, 1 - p * p)) * (Math.random() > 0.5 ? 1 : -1)).toFixed(2));

    const payload: TelemetryData = {
      serial: sn,
      device: `dn-${sn.substring(3)}`,
      rssi: 18 + Math.floor(Math.random() * 6),
      freq: Number((50.0 + (Math.random() - 0.5) * 0.05).toFixed(3)),
      volA, volB, volC,
      curA, curB, curC,
      paA: pa(volA, curA, phiA), paB: pa(volB, curB, phiB), paC: pa(volC, curC, phiC),
      pacA: pac(volA, curA), pacB: pac(volB, curB), pacC: pac(volC, curC),
      preA: re(volA, curA, phiA), preB: re(volB, curB, phiB), preC: re(volC, curC, phiC),
      phiA, phiB, phiC,
      FW_ver: '0.6.0',
      MCU_RTC: new Date().toLocaleTimeString('fr-FR'),
      Frame: 'Data',
      sensor_type: 'ADE9000',
      timestamp: Date.now()
    };

    this.messageSubject.next({ topic: `wattnow-v2/data/${sn}`, payload });
  }
}

// small helper outside class to avoid 'this' in arrow fn
function re(v: number, c: number, phi: number): number {
  return Number((v * c * Math.sqrt(Math.max(0, 1 - phi * phi)) * (Math.random() > 0.5 ? 1 : -1)).toFixed(2));
}
