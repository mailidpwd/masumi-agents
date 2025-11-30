/**
 * Marketplace Dummy Data Service
 * Provides dummy data for Mentors and Habit Buddies for MVP/demo purposes
 */
import { Mentor, HabitBuddy } from '../types/marketplace';

/**
 * Get initials from a name
 */
function getInitials(name: string): string {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

/**
 * Dummy Mentors data
 * Based on the design specifications with realistic ratings, success rates, and rates
 */
export const DUMMY_MENTORS: Mentor[] = [
  {
    id: 'm1',
    name: 'Sarah Chen',
    category: 'Meditation & Mindfulness',
    specialties: ['Meditation', 'SDG_GoodHealth', 'Mindfulness', 'Stress Management'],
    rating: 4.9,
    reviews: 127,
    successRate: 89,
    rate: 50,
    avatarInitials: 'SC',
    gender: 'female',
  },
  {
    id: 'm2',
    name: 'Marcus Johnson',
    category: 'Fitness & Running',
    specialties: ['Fitness', 'Running', 'SDG_GoodHealth', 'Exercise'],
    rating: 4.8,
    reviews: 203,
    successRate: 85,
    rate: 75,
    avatarInitials: 'MJ',
    gender: 'male',
  },
  {
    id: 'm3',
    name: 'Elena Rodriguez',
    category: 'Sustainable Living',
    specialties: ['SDG_ClimateAction', 'Sustainable Living', 'Eco-Friendly', 'Green Habits'],
    rating: 5.0,
    reviews: 95,
    successRate: 92,
    rate: 40,
    avatarInitials: 'ER',
    gender: 'female',
  },
  {
    id: 'm4',
    name: 'David Kim',
    category: 'Learning & Education',
    specialties: ['Learning', 'SDG_QualityEducation', 'Study Habits', 'Productivity'],
    rating: 4.7,
    reviews: 156,
    successRate: 87,
    rate: 60,
    avatarInitials: 'DK',
    gender: 'male',
  },
  {
    id: 'm5',
    name: 'Priya Patel',
    category: 'Nutrition & Health',
    specialties: ['Nutrition', 'SDG_GoodHealth', 'Healthy Eating', 'Meal Planning'],
    rating: 4.9,
    reviews: 189,
    successRate: 91,
    rate: 55,
    avatarInitials: 'PP',
    gender: 'female',
  },
];

/**
 * Dummy Habit Buddies data
 * Based on the design specifications with realistic habits, streaks, and compatibility scores
 */
export const DUMMY_BUDDIES: HabitBuddy[] = [
  {
    id: 'b1',
    name: 'Alex Thompson',
    habits: 'Daily Journaling, Reading',
    habitCategories: ['Journaling', 'Reading', 'SDG_QualityEducation'],
    streak: 45,
    compatibility: 95,
    avatarInitials: 'AT',
    gender: 'male',
  },
  {
    id: 'b2',
    name: 'Priya Sharma',
    habits: 'Yoga Practice, Plant-Based Diet',
    habitCategories: ['Yoga', 'SDG_GoodHealth', 'Plant-Based', 'Meditation'],
    streak: 82,
    compatibility: 88,
    avatarInitials: 'PS',
    gender: 'female',
  },
  {
    id: 'b3',
    name: 'James Wilson',
    habits: 'Coding Practice, Language Learning',
    habitCategories: ['Coding', 'Language Learning', 'SDG_QualityEducation', 'Productivity'],
    streak: 30,
    compatibility: 91,
    avatarInitials: 'JW',
    gender: 'male',
  },
  {
    id: 'b4',
    name: 'Maria Garcia',
    habits: 'Morning Exercise, Meditation',
    habitCategories: ['Exercise', 'Meditation', 'SDG_GoodHealth', 'Fitness'],
    streak: 67,
    compatibility: 93,
    avatarInitials: 'MG',
    gender: 'female',
  },
  {
    id: 'b5',
    name: 'Chris Anderson',
    habits: 'Sustainable Commuting, Zero Waste',
    habitCategories: ['SDG_ClimateAction', 'Sustainable Living', 'Eco-Friendly', 'Green Habits'],
    streak: 52,
    compatibility: 86,
    avatarInitials: 'CA',
    gender: 'male',
  },
];

/**
 * Get all mentors
 */
export function getAllMentors(): Mentor[] {
  return DUMMY_MENTORS;
}

/**
 * Get all buddies
 */
export function getAllBuddies(): HabitBuddy[] {
  return DUMMY_BUDDIES;
}

/**
 * Get mentors filtered by specialties
 */
export function getMentorsBySpecialties(specialties: string[]): Mentor[] {
  if (specialties.length === 0) {
    return DUMMY_MENTORS;
  }
  return DUMMY_MENTORS.filter((mentor) =>
    mentor.specialties.some((specialty) => specialties.includes(specialty))
  );
}

/**
 * Get buddies filtered by habit categories
 */
export function getBuddiesByHabits(habitCategories: string[]): HabitBuddy[] {
  if (habitCategories.length === 0) {
    return DUMMY_BUDDIES;
  }
  return DUMMY_BUDDIES.filter((buddy) =>
    buddy.habitCategories.some((category) => habitCategories.includes(category))
  );
}

/**
 * Get mentor by ID
 */
export function getMentorById(id: string): Mentor | undefined {
  return DUMMY_MENTORS.find((m) => m.id === id);
}

/**
 * Get buddy by ID
 */
export function getBuddyById(id: string): HabitBuddy | undefined {
  return DUMMY_BUDDIES.find((b) => b.id === id);
}

