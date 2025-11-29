/**
 * Goal Form Types
 * Types for the Create Goal feature specification
 */

export enum GoalCategory {
  // SDG Categories
  SDG_ClimateAction = 'SDG_ClimateAction',
  SDG_ZeroHunger = 'SDG_ZeroHunger',
  SDG_GoodHealth = 'SDG_GoodHealth',
  SDG_QualityEducation = 'SDG_QualityEducation',
  SDG_CleanWater = 'SDG_CleanWater',
  // ESG Categories
  ESG_Environmental = 'ESG_Environmental',
  ESG_Social = 'ESG_Social',
  ESG_Governance = 'ESG_Governance',
  // Personal Categories
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

export interface GoalFormData {
  title: string;
  description: string;
  category: GoalCategory | '';
  startDate: Date;
  endDate: Date | null;
  pledgeAmount: number; // RDM tokens
  verificationMethod: VerificationMethod;
  verifierEmail: string;
  checkInFrequency: CheckInFrequency;
  hasBuddy: boolean;
}

export const GoalCategoryLabels: Record<GoalCategory, string> = {
  [GoalCategory.SDG_ClimateAction]: '🌍 Climate Action (SDG)',
  [GoalCategory.SDG_ZeroHunger]: '🍽️ Zero Hunger (SDG)',
  [GoalCategory.SDG_GoodHealth]: '💪 Good Health (SDG)',
  [GoalCategory.SDG_QualityEducation]: '📚 Quality Education (SDG)',
  [GoalCategory.SDG_CleanWater]: '💧 Clean Water (SDG)',
  [GoalCategory.ESG_Environmental]: '🌱 Environmental (ESG)',
  [GoalCategory.ESG_Social]: '🤝 Social (ESG)',
  [GoalCategory.ESG_Governance]: '⚖️ Governance (ESG)',
  [GoalCategory.Personal_Fitness]: '🏃 Personal Fitness',
  [GoalCategory.Personal_Learning]: '🎓 Personal Learning',
  [GoalCategory.Personal_Creativity]: '🎨 Personal Creativity',
  [GoalCategory.Community_Service]: '❤️ Community Service',
};

export const VerificationMethodLabels: Record<VerificationMethod, string> = {
  [VerificationMethod.self_report]: 'Self Report',
  [VerificationMethod.peer_verification]: 'Peer Verification',
  [VerificationMethod.photo_evidence]: 'Photo Evidence',
  [VerificationMethod.buddy_confirmation]: 'Habit Buddy Confirmation',
  [VerificationMethod.iot_device]: 'IoT Device',
  [VerificationMethod.third_party_app]: 'Third Party App',
};

export const CheckInFrequencyLabels: Record<CheckInFrequency, string> = {
  [CheckInFrequency.daily]: 'Daily',
  [CheckInFrequency.every_3_days]: 'Every 3 Days',
  [CheckInFrequency.weekly]: 'Weekly',
  [CheckInFrequency.biweekly]: 'Bi-weekly',
};

// Validation helper functions
export function requiresVerifierEmail(verificationMethod: VerificationMethod): boolean {
  return (
    verificationMethod === VerificationMethod.peer_verification ||
    verificationMethod === VerificationMethod.buddy_confirmation
  );
}

