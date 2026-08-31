export type CTModel = 
  | 'CT_600A' 
  | 'CT_200A' 
  | 'CT_5A' 
  | 'CT_1000A' 
  | 'CT_2000A' 
  | 'CT_4000A' 
  | 'CT_RCG';

export type TabMode = 'CT_10A' | 'CT_1000A';

export type CosPhiMode = 'NORMAL_1_0' | 'PHASE_0_5';

export interface TelemetryData {
  serial: string;
  device?: string;
  rssi: number | string;
  freq: number;
  curA: number;
  curB: number;
  curC: number;
  volA: number;
  volB: number;
  volC: number;
  paA: number;
  paB: number;
  paC: number;
  pacA: number;
  pacB: number;
  pacC: number;
  preA: number;
  preB: number;
  preC: number;
  phiA: number;
  phiB: number;
  phiC: number;
  kwhA?: number;
  kwhB?: number;
  kwhC?: number;
  varhA?: number;
  varhB?: number;
  varhC?: number;
  thdiA?: number;
  thdiB?: number;
  thdiC?: number;
  thdvA?: number;
  thdvB?: number;
  thdvC?: number;
  FW_ver?: string;
  MCU_RTC?: string;
  Frame: 'Data' | 'Bootcheck';
  sensor_type?: string;
  timestamp: number;
}

export interface DiagAdeData {
  serial: string;
  device?: string;
  FW_ver?: string;
  BL_ver?: string;
  Update_flag?: number;
  rssi?: number;
  relay_status_d?: string;
  userid?: string;
  Frame: 'DiagAde';
  Avgain: number;
  Bvgain: number;
  Cvgain: number;
  Aigain: number;
  Bigain: number;
  Cigain: number;
  A_Phase_gain: number;
  B_Phase_gain: number;
  C_Phase_gain: number;
  Apgain: number;
  Bpgain: number;
  Cpgain: number;
  vts?: string | number;
  cts?: number;
  adc_redirect?: number;
  AIgain_Inversion?: string;
  BIgain_Inversion?: string;
  CIgain_Inversion?: string;
  timestamp: number;
}

export interface DeviceSlotState {
  slotIndex: number;
  sn: string;
  active: boolean;
  telemetry: TelemetryData | null;
  diagAde: DiagAdeData | null;
  baselineCaptured: boolean;
  cosPhiMode: CosPhiMode;
  consecutiveModeCounts: { mode: CosPhiMode; count: number };
  isCurrentValidForCalibration: boolean;
  isSticky: boolean;
  lastUpdated: number;
}

export interface MqttConfig {
  host: string;
  port: number;
  protocol: 'ws' | 'wss';
  path: string;
  clientId: string;
  username?: string;
  password?: string;
}

export interface CalibrationReportData {
  reportId: string;
  generatedAt: string;
  operatorName: string;
  ctModel: CTModel;
  tabMode: TabMode;
  devices: {
    sn: string;
    baselineCaptured: boolean;
    diagAde?: DiagAdeData;
    telemetry?: TelemetryData;
    status: 'PASS' | 'FAIL';
  }[];
}
