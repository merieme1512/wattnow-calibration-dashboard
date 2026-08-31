import { TabMode, CosPhiMode } from '../models/calibration.model';

export class ValidationUtils {
  // Voltage target: 229.8 - 230.1 V
  static isVoltageValid(v: number): boolean {
    return v >= 229.8 && v <= 230.1;
  }

  // Frequency target: 49.5 - 50.5 Hz
  static isFrequencyValid(f: number): boolean {
    return f >= 49.5 && f <= 50.5;
  }

  // RSSI target: 13 - 25 dB
  static isRssiValid(rssi: number | string): boolean {
    const val = typeof rssi === 'string' ? parseFloat(rssi) : rssi;
    return !isNaN(val) && val >= 13 && val <= 25;
  }

  // Current target: 10A mode -> 9.9 - 10.1 A; 1000A mode -> 99.5 - 100.5 A
  static isCurrentValid(i: number, tabMode: TabMode): boolean {
    if (tabMode === 'CT_10A') {
      return i >= 9.9 && i <= 10.1;
    } else {
      return i >= 99.5 && i <= 100.5;
    }
  }

  // Current safety lock range: 10A mode -> [9.5, 10.5]; 1000A mode -> [99.5, 100.5]
  static isCurrentInSafetyRange(curA: number, curB: number, curC: number, tabMode: TabMode): boolean {
    if (tabMode === 'CT_10A') {
      return curA >= 9.5 && curA <= 10.5 &&
             curB >= 9.5 && curB <= 10.5 &&
             curC >= 9.5 && curC <= 10.5;
    } else {
      return curA >= 99.5 && curA <= 100.5 &&
             curB >= 99.5 && curB <= 100.5 &&
             curC >= 99.5 && curC <= 100.5;
    }
  }

  // Active power target: 10A -> 2297 - 2303 W; 1000A -> 22000 - 24000 W
  static isActivePowerValid(p: number, tabMode: TabMode): boolean {
    if (tabMode === 'CT_10A') {
      return p >= 2297 && p <= 2303;
    } else {
      return p >= 22000 && p <= 24000;
    }
  }

  // Reactive power target: 10A -> -1 to 1.5 VAR; 1000A -> -10 to 15 VAR
  static isReactivePowerValid(q: number, tabMode: TabMode): boolean {
    if (tabMode === 'CT_10A') {
      return q >= -1.0 && q <= 1.5;
    } else {
      return q >= -10.0 && q <= 15.0;
    }
  }

  // Power factor target: Normal (1.0) -> [0.98, 1.0]; Phase (0.5) -> [0.48, 0.51]
  static isPowerFactorValid(phi: number, cosPhiMode: CosPhiMode): boolean {
    if (cosPhiMode === 'NORMAL_1_0') {
      return phi >= 0.98 && phi <= 1.0;
    } else {
      return phi >= 0.48 && phi <= 0.51;
    }
  }

  // SN format validation: sn-{family}-{alphanumeric} where family is 13, 14, 17, or 18
  static validateSN(sn: string): boolean {
    if (!sn) return false;
    const cleanSn = sn.trim().toLowerCase();
    const regex = /^sn-(13|14|17|18)-[a-z0-9]+$/;
    return regex.test(cleanSn);
  }
}
