/* Local Storage Abstraction with Schema Versioning */

import type { SaveData, Profile, MissionProgress, MissionFeedback } from '../types/profile';

const STORAGE_KEY = 'cosmic-cadets-save';
const CURRENT_VERSION = '1.0.0';

export class StorageService {
  private static instance: StorageService;
  
  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Check if a profile exists (onboarding check)
   */
  hasProfile(): boolean {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return false;
      const saveData = JSON.parse(data) as SaveData;
      return !!saveData.profile;
    } catch {
      return false;
    }
  }

  /**
   * Get the current save data
   */
  getSaveData(): SaveData | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return null;
      const saveData = JSON.parse(data) as SaveData;
      
      // Handle schema migration if needed
      if (saveData.version !== CURRENT_VERSION) {
        return this.migrateSaveData(saveData);
      }
      
      return saveData;
    } catch (error) {
      console.error('Error loading save data:', error);
      return null;
    }
  }

  /**
   * Get the current profile
   */
  getProfile(): Profile | null {
    const saveData = this.getSaveData();
    return saveData?.profile || null;
  }

  /**
   * Initialize save data with a new profile (onboarding completion)
   */
  createProfile(profile: Omit<Profile, 'createdAt' | 'lastPlayed'>): void {
    const saveData: SaveData = {
      version: CURRENT_VERSION,
      profile: {
        ...profile,
        createdAt: Date.now(),
        lastPlayed: Date.now(),
      },
      missions: {},
    };
    
    this.save(saveData);
  }

  /**
   * Update profile (partial update)
   */
  updateProfile(updates: Partial<Profile>): void {
    const saveData = this.getSaveData();
    if (!saveData) {
      throw new Error('No save data found. Cannot update profile.');
    }
    
    saveData.profile = {
      ...saveData.profile,
      ...updates,
      lastPlayed: Date.now(),
    };
    
    this.save(saveData);
  }

  /**
   * Get mission progress for a specific mission
   */
  getMissionProgress(missionId: number): MissionProgress | null {
    const saveData = this.getSaveData();
    return saveData?.missions[missionId] || null;
  }

  /**
   * Update mission progress
   */
  updateMissionProgress(missionId: number, progress: Partial<MissionProgress>): void {
    const saveData = this.getSaveData();
    if (!saveData) {
      throw new Error('No save data found. Cannot update mission progress.');
    }
    
    const existing = saveData.missions[missionId] || {
      missionId,
      completed: false,
    };
    
    saveData.missions[missionId] = {
      ...existing,
      ...progress,
      lastPlayed: Date.now(),
    };
    
    // If mission completed, add badge
    if (progress.completed && !saveData.profile.badges.includes(missionId)) {
      saveData.profile.badges.push(missionId);
      saveData.profile.badges.sort((a, b) => a - b);
    }
    
    saveData.profile.lastPlayed = Date.now();
    this.save(saveData);
  }

  /**
   * Save feedback for a mission
   */
  saveMissionFeedback(missionId: number, feedback: MissionFeedback): void {
    const progress = this.getMissionProgress(missionId) || {
      missionId,
      completed: true,
    };
    
    this.updateMissionProgress(missionId, {
      ...progress,
      feedback,
    });
  }

  /**
   * Delete all save data (privacy feature)
   */
  deleteAll(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Export save data as JSON (privacy feature)
   */
  exportData(): string {
    const saveData = this.getSaveData();
    return JSON.stringify(saveData, null, 2);
  }

  /**
   * Internal: Save to localStorage
   */
  private save(saveData: SaveData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
    } catch (error) {
      console.error('Error saving data:', error);
      // Handle quota exceeded or other storage errors
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded. Please free up space.');
      }
      throw error;
    }
  }

  /**
   * Internal: Migrate save data between schema versions
   */
  private migrateSaveData(oldData: SaveData): SaveData {
    // For now, just update version. Future migrations can transform data here.
    return {
      ...oldData,
      version: CURRENT_VERSION,
    };
  }
}

// Export singleton instance
export const storage = StorageService.getInstance();

