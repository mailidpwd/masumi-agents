/**
 * Storage Service
 * Handles data persistence using AsyncStorage
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyGoal } from '../types/rdm';

const STORAGE_KEYS = {
  GOALS: '@rdm:goals',
  MEDAA1_STATE: '@rdm:medaa1_state',
  MEDAA2_STATE: '@rdm:medaa2_state',
  MEDAA3_STATE: '@rdm:medaa3_state',
  CHARITY_PREFERENCES: '@rdm:charity_preferences',
};

export class StorageService {
  /**
   * Save goals to storage
   */
  static async saveGoals(goals: DailyGoal[]): Promise<void> {
    try {
      const json = JSON.stringify(goals.map(goal => ({
        ...goal,
        createdAt: goal.createdAt.toISOString(),
        targetDate: goal.targetDate.toISOString(),
        completedAt: goal.completedAt?.toISOString(),
        verifiedAt: goal.verifiedAt?.toISOString(),
      })));
      await AsyncStorage.setItem(STORAGE_KEYS.GOALS, json);
    } catch (error) {
      console.error('Error saving goals:', error);
    }
  }

  /**
   * Load goals from storage
   */
  static async loadGoals(): Promise<DailyGoal[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.GOALS);
      if (!json) return [];
      
      const data = JSON.parse(json);
      return data.map((goal: any) => ({
        ...goal,
        createdAt: new Date(goal.createdAt),
        targetDate: new Date(goal.targetDate),
        completedAt: goal.completedAt ? new Date(goal.completedAt) : undefined,
        verifiedAt: goal.verifiedAt ? new Date(goal.verifiedAt) : undefined,
      }));
    } catch (error) {
      console.error('Error loading goals:', error);
      return [];
    }
  }

  /**
   * Save Medaa1 agent state
   */
  static async saveMedaa1State(state: any): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MEDAA1_STATE, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving Medaa1 state:', error);
    }
  }

  /**
   * Load Medaa1 agent state
   */
  static async loadMedaa1State(): Promise<any | null> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.MEDAA1_STATE);
      return json ? JSON.parse(json) : null;
    } catch (error) {
      console.error('Error loading Medaa1 state:', error);
      return null;
    }
  }

  /**
   * Save Medaa3 charity preferences
   */
  static async saveCharityPreferences(preferences: any): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CHARITY_PREFERENCES, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving charity preferences:', error);
    }
  }

  /**
   * Load charity preferences
   */
  static async loadCharityPreferences(): Promise<any | null> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.CHARITY_PREFERENCES);
      return json ? JSON.parse(json) : null;
    } catch (error) {
      console.error('Error loading charity preferences:', error);
      return null;
    }
  }

  /**
   * Clear all stored data
   */
  static async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }
}

