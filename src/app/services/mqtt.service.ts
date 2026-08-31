import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import * as mqtt from 'mqtt';
import { MqttConfig } from '../models/calibration.model';
import { SimulatorService } from './simulator.service';

@Injectable({
  providedIn: 'root'
})
export class MqttService {
  private client: mqtt.MqttClient | null = null;
  private isConnectedSubject = new BehaviorSubject<boolean>(false);
  public isConnected$: Observable<boolean> = this.isConnectedSubject.asObservable();

  private isSimulatorSubject = new BehaviorSubject<boolean>(true); // Default to simulator mode for instant demo
  public isSimulator$: Observable<boolean> = this.isSimulatorSubject.asObservable();

  private messageSubject = new Subject<{ topic: string; payload: any }>();
  public message$: Observable<{ topic: string; payload: any }> = this.messageSubject.asObservable();

  private currentConfig: MqttConfig = {
    host: 'broker.emqx.io',
    port: 8083,
    protocol: 'ws',
    path: '/mqtt',
    clientId: `wattnow_calib_${Math.random().toString(16).substring(2, 8)}`
  };

  private activeSubscribedSns: string[] = [];

  constructor(private simulatorService: SimulatorService) {
    // Listen to simulator messages when simulator mode is active
    this.simulatorService.message$.subscribe(msg => {
      if (this.isSimulatorSubject.value) {
        this.messageSubject.next(msg);
      }
    });

    // Auto-start simulator on init
    this.enableSimulator(['sn-13-99991', 'sn-13-99992']);
  }

  enableSimulator(sns: string[]): void {
    if (this.client) {
      this.client.removeAllListeners();
      this.client.end(true);
      this.client = null;
    }
    this.isSimulatorSubject.next(true);
    this.isConnectedSubject.next(true);
    this.simulatorService.startSimulator(sns);
  }

  setSimulatorMode(enabled: boolean): void {
    if (enabled) {
      this.enableSimulator(this.activeSubscribedSns.length ? this.activeSubscribedSns : ['sn-13-99991', 'sn-13-99992']);
    } else {
      this.connect();
    }
  }

  connect(config?: Partial<MqttConfig>): void {
    if (config) {
      this.currentConfig = { ...this.currentConfig, ...config };
    }

    this.simulatorService.stopSimulator();
    this.isSimulatorSubject.next(false);

    if (this.client) {
      this.client.removeAllListeners();
      this.client.end(true);
    }

    const { protocol, host, port, path, clientId, username, password } = this.currentConfig;
    const url = `${protocol}://${host}:${port}${path}`;

    try {
      const connectFn = (mqtt as any).connect || (mqtt as any).default?.connect;
      this.client = connectFn(url, {
        clientId,
        username,
        password,
        reconnectPeriod: 3000,
        connectTimeout: 5000
      });

      this.client?.on('connect', () => {
        console.log('[MQTT] Connected to broker:', url);
        if (!this.isSimulatorSubject.value) {
          this.isConnectedSubject.next(true);
          this.resubscribeActiveSns();
        }
      });

      this.client?.on('message', (topic: string, message: Buffer) => {
        try {
          const payloadStr = message.toString();
          const payload = JSON.parse(payloadStr);
          this.messageSubject.next({ topic, payload });
        } catch (err) {
          console.error('[MQTT] Error parsing message payload:', err);
        }
      });

      this.client?.on('error', (err) => {
        console.error('[MQTT] Connection error:', err);
        if (!this.isSimulatorSubject.value) {
          this.isConnectedSubject.next(false);
        }
      });

      this.client?.on('close', () => {
        if (!this.isSimulatorSubject.value) {
          this.isConnectedSubject.next(false);
        }
      });
    } catch (err) {
      console.error('[MQTT] Setup error:', err);
      if (!this.isSimulatorSubject.value) {
        this.isConnectedSubject.next(false);
      }
    }
  }

  disconnect(): void {
    if (this.client) {
      this.client.end(true);
      this.client = null;
    }
    this.simulatorService.stopSimulator();
    this.isConnectedSubject.next(false);
  }

  subscribeDeviceTopics(sn: string): void {
    if (!sn) return;
    if (!this.activeSubscribedSns.includes(sn)) {
      this.activeSubscribedSns.push(sn);
    }

    if (this.isSimulatorSubject.value) {
      this.simulatorService.setActiveSns(this.activeSubscribedSns);
      return;
    }

    if (this.client && this.isConnectedSubject.value) {
      const dataTopic = `wattnow-v2/data/${sn}`;
      const logTopic = `wattnow-v2/log/${sn}`;
      this.client.subscribe([dataTopic, logTopic], (err) => {
        if (err) console.error(`[MQTT] Failed to subscribe to topics for ${sn}:`, err);
      });
    }
  }

  unsubscribeDeviceTopics(sn: string): void {
    this.activeSubscribedSns = this.activeSubscribedSns.filter(s => s !== sn);
    if (this.isSimulatorSubject.value) {
      this.simulatorService.setActiveSns(this.activeSubscribedSns);
      return;
    }

    if (this.client && this.isConnectedSubject.value) {
      const dataTopic = `wattnow-v2/data/${sn}`;
      const logTopic = `wattnow-v2/log/${sn}`;
      this.client.unsubscribe([dataTopic, logTopic]);
    }
  }

  publishCommand(sn: string, commandPayload: any): void {
    const topic = `wattnow-v2/cmd/${sn}`;

    if (this.isSimulatorSubject.value) {
      this.simulatorService.handlePublishedCommand(topic, commandPayload);
      return;
    }

    if (this.client && this.isConnectedSubject.value) {
      const payloadStr = JSON.stringify(commandPayload);
      this.client.publish(topic, payloadStr, { qos: 0 }, (err) => {
        if (err) console.error(`[MQTT] Failed to publish command to ${topic}:`, err);
      });
    }
  }

  broadcastCommand(sns: string[], commandPayload: any): void {
    sns.forEach(sn => {
      this.publishCommand(sn, commandPayload);
    });
  }

  getConfig(): MqttConfig {
    return this.currentConfig;
  }

  private resubscribeActiveSns(): void {
    this.activeSubscribedSns.forEach(sn => {
      const dataTopic = `wattnow-v2/data/${sn}`;
      const logTopic = `wattnow-v2/log/${sn}`;
      this.client?.subscribe([dataTopic, logTopic]);
    });
  }
}
