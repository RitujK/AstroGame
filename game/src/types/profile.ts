/* Profile Types */

export type AgeBand = '5-7' | '8-11' | '12-15';

export interface Profile {
  callsign: string;
  email: string;
  ageBand: AgeBand;
  avatar?: string;
  badges: number[]; // Array of completed mission IDs
  createdAt: number; // Timestamp
  lastPlayed: number; // Timestamp
}

export interface MissionProgress {
  missionId: number;
  completed: boolean;
  bestScore?: number;
  feedback?: MissionFeedback;
  lastPlayed?: number;
}

export interface MissionFeedback {
  enjoyment: number; // 1-10
  understanding: number; // 1-10
  wouldRecommend: boolean;
  timestamp: number;
}

export interface SaveData {
  version: string; // Schema version for migration
  profile: Profile;
  missions: Record<number, MissionProgress>; // keyed by mission ID
}

