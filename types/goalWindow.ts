/**
 * Goal Window Types
 * Time-windowed goals and check-in schedules
 */

export type GoalDuration = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
export type CheckInFrequency = 'daily' | 'every_2_days' | 'every_3_days' | 'weekly' | 'custom';

export interface TimeWindow {
  startDate: Date;
  endDate: Date;
  duration: GoalDuration;
  customDays?: number; // For custom duration
}

export interface CheckInSchedule {
  frequency: CheckInFrequency;
  customInterval?: number; // For custom frequency (in days)
  times?: string[]; // Preferred check-in times (e.g., ['09:00', '18:00'])
  remindersEnabled: boolean;
}

export interface CheckIn {
  id: string;
  goalId: string;
  scheduledDate: Date;
  completedDate?: Date;
  reflectionSubmitted: boolean;
  status: 'pending' | 'completed' | 'missed';
}

export interface GoalProgress {
  goalId: string;
  timeWindow: TimeWindow;
  checkIns: CheckIn[];
  completionRate: number; // Percentage of check-ins completed
  daysRemaining: number;
  progressPercentage: number; // Overall progress toward goal
}

export function calculateTimeWindow(duration: GoalDuration, customDays?: number): TimeWindow {
  const startDate = new Date();
  const endDate = new Date();
  
  switch (duration) {
    case 'daily':
      endDate.setDate(endDate.getDate() + 1);
      break;
    case 'weekly':
      endDate.setDate(endDate.getDate() + 7);
      break;
    case 'biweekly':
      endDate.setDate(endDate.getDate() + 14);
      break;
    case 'monthly':
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    case 'custom':
      if (customDays) {
        endDate.setDate(endDate.getDate() + customDays);
      }
      break;
  }
  
  return {
    startDate,
    endDate,
    duration,
    customDays,
  };
}

export function generateCheckIns(
  goalId: string,
  timeWindow: TimeWindow,
  schedule: CheckInSchedule
): CheckIn[] {
  const checkIns: CheckIn[] = [];
  const start = new Date(timeWindow.startDate);
  const end = new Date(timeWindow.endDate);
  
  let intervalDays = 1;
  switch (schedule.frequency) {
    case 'daily':
      intervalDays = 1;
      break;
    case 'every_2_days':
      intervalDays = 2;
      break;
    case 'every_3_days':
      intervalDays = 3;
      break;
    case 'weekly':
      intervalDays = 7;
      break;
    case 'custom':
      intervalDays = schedule.customInterval || 1;
      break;
  }
  
  let currentDate = new Date(start);
  while (currentDate <= end) {
    checkIns.push({
      id: `checkin_${goalId}_${currentDate.getTime()}`,
      goalId,
      scheduledDate: new Date(currentDate),
      reflectionSubmitted: false,
      status: 'pending',
    });
    currentDate.setDate(currentDate.getDate() + intervalDays);
  }
  
  return checkIns;
}

