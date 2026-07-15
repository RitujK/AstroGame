/* Age-Band Tuning Engine */

import type { AgeBand } from '../types/profile';

export interface AgeBandConfig {
  uiScale: number;
  hintFrequency: 'none' | 'low' | 'medium' | 'high';
  showTimers: boolean;
  timerStrict: boolean; // true = failure on timeout, false = bonus points only
  autoAssists: boolean; // auto-snap for drag-and-drop, etc.
  tapTargetSize: number; // minimum size in pixels
}

const AGE_BAND_CONFIGS: Record<AgeBand, AgeBandConfig> = {
  '5-7': {
    uiScale: 1.2,
    hintFrequency: 'high',
    showTimers: false,
    timerStrict: false,
    autoAssists: true,
    tapTargetSize: 56, // Larger for younger kids
  },
  '8-11': {
    uiScale: 1.0,
    hintFrequency: 'medium',
    showTimers: true,
    timerStrict: false, // Soft timers for bonus
    autoAssists: false,
    tapTargetSize: 44,
  },
  '12-15': {
    uiScale: 1.0,
    hintFrequency: 'low',
    showTimers: true,
    timerStrict: false, // Still soft, but tighter timing
    autoAssists: false,
    tapTargetSize: 44,
  },
};

export class AgeBandService {
  private static instance: AgeBandService;
  private currentAgeBand: AgeBand = '8-11'; // Default

  static getInstance(): AgeBandService {
    if (!AgeBandService.instance) {
      AgeBandService.instance = new AgeBandService();
    }
    return AgeBandService.instance;
  }

  setAgeBand(ageBand: AgeBand): void {
    this.currentAgeBand = ageBand;
  }

  getAgeBand(): AgeBand {
    return this.currentAgeBand;
  }

  getConfig(): AgeBandConfig {
    return AGE_BAND_CONFIGS[this.currentAgeBand];
  }

  getUiScale(): number {
    return this.getConfig().uiScale;
  }

  getHintFrequency(): 'none' | 'low' | 'medium' | 'high' {
    return this.getConfig().hintFrequency;
  }

  shouldShowHint(missionProgress: number): boolean {
    const frequency = this.getHintFrequency();
    if (frequency === 'none') return false;
    
    // Hint probability based on frequency and progress
    const thresholds: Record<string, number> = {
      high: 0.7,    // 70% chance after delay
      medium: 0.4, // 40% chance after delay
      low: 0.1,    // 10% chance after delay
    };

    // Simple implementation: hint available if progress < threshold
    return missionProgress < thresholds[frequency];
  }

  shouldShowTimer(): boolean {
    return this.getConfig().showTimers;
  }

  isTimerStrict(): boolean {
    return this.getConfig().timerStrict;
  }

  hasAutoAssists(): boolean {
    return this.getConfig().autoAssists;
  }

  getTapTargetSize(): number {
    return this.getConfig().tapTargetSize;
  }

  getTimerConfig(missionDuration: number): { duration: number; warningTime: number } {
    // Timer configurations based on age band
    const baseDuration = missionDuration; // seconds
    const multiplier = this.currentAgeBand === '5-7' ? 0 : 
                      this.currentAgeBand === '8-11' ? 1.2 : 1.0;
    
    return {
      duration: baseDuration * multiplier,
      warningTime: baseDuration * 0.2, // 20% remaining = warning
    };
  }
}

export const ageBandService = AgeBandService.getInstance();

