/**
 * Goal Creation Types
 * Types for the Create Goal feature specification
 */

export enum GoalCategory {
  SDG_ClimateAction = 'SDG_ClimateAction',
  SDG_ZeroHunger = 'SDG_ZeroHunger',
  SDG_GoodHealth = 'SDG_GoodHealth',
  SDG_QualityEducation = 'SDG_QualityEducation',
  SDG_CleanWater = 'SDG_CleanWater',
  ESG_Environmental = 'ESG_Environmental',
  ESG_Social = 'ESG_Social',
  ESG_Governance = 'ESG_Governance',
  Personal_Fitness = 'Personal_Fitness',
  Personal_Learning = 'Personal_Learning',
  Personal_Creativity = 'Personal_Creativity',
  Community_Service = 'Community_Service',
}

export enum VerificationMethod {
  self_report = 'self_report',
  peer_verification = 'peer_verification',
  photo_evidence = 'photo_evidence',
  buddy_confirmation = 'buddy_confirmation',
  iot_device = 'iot_device',
  third_party_app = 'third_party_app',
}

export enum CheckInFrequency {
  daily = 'daily',
  every_3_days = 'every_3_days',
  weekly = 'weekly',
  biweekly = 'biweekly',
}

export interface GoalCategoryOption {
  value: GoalCategory;
  label: string;
  emoji: string;
}

export interface VerificationMethodOption {
  value: VerificationMethod;
  label: string;
  requiresEmail: boolean;
}

export interface CheckInFrequencyOption {
  value: CheckInFrequency;
  label: string;
}

export const GOAL_CATEGORIES: GoalCategoryOption[] = [
  { value: GoalCategory.SDG_ClimateAction, label: 'Climate Action (SDG)', emoji: '🌍' },
  { value: GoalCategory.SDG_ZeroHunger, label: 'Zero Hunger (SDG)', emoji: '🍽️' },
  { value: GoalCategory.SDG_GoodHealth, label: 'Good Health (SDG)', emoji: '💪' },
  { value: GoalCategory.SDG_QualityEducation, label: 'Quality Education (SDG)', emoji: '📚' },
  { value: GoalCategory.SDG_CleanWater, label: 'Clean Water (SDG)', emoji: '💧' },
  { value: GoalCategory.ESG_Environmental, label: 'Environmental (ESG)', emoji: '🌱' },
  { value: GoalCategory.ESG_Social, label: 'Social (ESG)', emoji: '🤝' },
  { value: GoalCategory.ESG_Governance, label: 'Governance (ESG)', emoji: '⚖️' },
  { value: GoalCategory.Personal_Fitness, label: 'Personal Fitness', emoji: '🏃' },
  { value: GoalCategory.Personal_Learning, label: 'Personal Learning', emoji: '🎓' },
  { value: GoalCategory.Personal_Creativity, label: 'Personal Creativity', emoji: '🎨' },
  { value: GoalCategory.Community_Service, label: 'Community Service', emoji: '❤️' },
];

export const VERIFICATION_METHODS: VerificationMethodOption[] = [
  { value: VerificationMethod.self_report, label: 'Self Report', requiresEmail: false },
  { value: VerificationMethod.peer_verification, label: 'Peer Verification', requiresEmail: true },
  { value: VerificationMethod.photo_evidence, label: 'Photo Evidence', requiresEmail: false },
  { value: VerificationMethod.buddy_confirmation, label: 'Habit Buddy Confirmation', requiresEmail: true },
  { value: VerificationMethod.iot_device, label: 'IoT Device', requiresEmail: false },
  { value: VerificationMethod.third_party_app, label: 'Third Party App', requiresEmail: false },
];

export const CHECK_IN_FREQUENCIES: CheckInFrequencyOption[] = [
  { value: CheckInFrequency.daily, label: 'Daily' },
  { value: CheckInFrequency.every_3_days, label: 'Every 3 Days' },
  { value: CheckInFrequency.weekly, label: 'Weekly' },
  { value: CheckInFrequency.biweekly, label: 'Bi-weekly' },
];

export interface CreateGoalFormData {
  title: string;
  description: string;
  category: GoalCategory | '';
  startDate: Date;
  endDate: Date | null;
  pledgeAmount: number;
  verificationMethod: VerificationMethod;
  verifierEmail: string;
  checkInFrequency: CheckInFrequency;
  hasBuddy: boolean;
}

