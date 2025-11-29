/**
 * SDG/ESG Types
 * United Nations Sustainable Development Goals alignment
 */

export enum SDG {
  NO_POVERTY = 1,
  ZERO_HUNGER = 2,
  GOOD_HEALTH = 3,
  QUALITY_EDUCATION = 4,
  GENDER_EQUALITY = 5,
  CLEAN_WATER = 6,
  AFFORDABLE_ENERGY = 7,
  DECENT_WORK = 8,
  INDUSTRY_INNOVATION = 9,
  REDUCED_INEQUALITIES = 10,
  SUSTAINABLE_CITIES = 11,
  RESPONSIBLE_CONSUMPTION = 12,
  CLIMATE_ACTION = 13,
  LIFE_BELOW_WATER = 14,
  LIFE_ON_LAND = 15,
  PEACE_JUSTICE = 16,
  PARTNERSHIPS = 17,
}

export interface SDGCategory {
  id: SDG;
  name: string;
  description: string;
  targets: string[];
}

export interface ESGAlignment {
  environmental: boolean;
  social: boolean;
  governance: boolean;
  sdgGoals: SDG[];
}

export interface PersonalValue {
  id: string;
  name: string;
  description: string;
  sdgAlignment: SDG[];
}

export const SDG_CATEGORIES: Record<SDG, SDGCategory> = {
  [SDG.NO_POVERTY]: {
    id: SDG.NO_POVERTY,
    name: 'No Poverty',
    description: 'End poverty in all its forms everywhere',
    targets: ['Eradicate extreme poverty', 'Reduce poverty by half', 'Social protection systems'],
  },
  [SDG.ZERO_HUNGER]: {
    id: SDG.ZERO_HUNGER,
    name: 'Zero Hunger',
    description: 'End hunger, achieve food security and improved nutrition',
    targets: ['End hunger', 'End malnutrition', 'Double agricultural productivity'],
  },
  [SDG.GOOD_HEALTH]: {
    id: SDG.GOOD_HEALTH,
    name: 'Good Health and Well-being',
    description: 'Ensure healthy lives and promote well-being for all',
    targets: ['Reduce maternal mortality', 'End preventable deaths', 'Universal health coverage'],
  },
  [SDG.QUALITY_EDUCATION]: {
    id: SDG.QUALITY_EDUCATION,
    name: 'Quality Education',
    description: 'Ensure inclusive and equitable quality education',
    targets: ['Free primary and secondary education', 'Equal access to education', 'Increase qualified teachers'],
  },
  [SDG.GENDER_EQUALITY]: {
    id: SDG.GENDER_EQUALITY,
    name: 'Gender Equality',
    description: 'Achieve gender equality and empower all women and girls',
    targets: ['End discrimination', 'Eliminate violence', 'Equal participation'],
  },
  [SDG.CLEAN_WATER]: {
    id: SDG.CLEAN_WATER,
    name: 'Clean Water and Sanitation',
    description: 'Ensure availability and sustainable management of water',
    targets: ['Universal access to safe water', 'Improve water quality', 'Water-use efficiency'],
  },
  [SDG.AFFORDABLE_ENERGY]: {
    id: SDG.AFFORDABLE_ENERGY,
    name: 'Affordable and Clean Energy',
    description: 'Ensure access to affordable, reliable, sustainable energy',
    targets: ['Universal energy access', 'Increase renewable energy', 'Improve energy efficiency'],
  },
  [SDG.DECENT_WORK]: {
    id: SDG.DECENT_WORK,
    name: 'Decent Work and Economic Growth',
    description: 'Promote sustained, inclusive economic growth',
    targets: ['Sustain economic growth', 'Achieve full employment', 'Protect labor rights'],
  },
  [SDG.INDUSTRY_INNOVATION]: {
    id: SDG.INDUSTRY_INNOVATION,
    name: 'Industry, Innovation and Infrastructure',
    description: 'Build resilient infrastructure and promote innovation',
    targets: ['Develop quality infrastructure', 'Promote inclusive industrialization', 'Enhance research'],
  },
  [SDG.REDUCED_INEQUALITIES]: {
    id: SDG.REDUCED_INEQUALITIES,
    name: 'Reduced Inequalities',
    description: 'Reduce inequality within and among countries',
    targets: ['Reduce income inequality', 'Promote social inclusion', 'Facilitate migration'],
  },
  [SDG.SUSTAINABLE_CITIES]: {
    id: SDG.SUSTAINABLE_CITIES,
    name: 'Sustainable Cities and Communities',
    description: 'Make cities and human settlements inclusive, safe, resilient',
    targets: ['Safe housing', 'Sustainable transport', 'Protect cultural heritage'],
  },
  [SDG.RESPONSIBLE_CONSUMPTION]: {
    id: SDG.RESPONSIBLE_CONSUMPTION,
    name: 'Responsible Consumption and Production',
    description: 'Ensure sustainable consumption and production patterns',
    targets: ['Sustainable use of resources', 'Reduce waste generation', 'Recycling and reuse'],
  },
  [SDG.CLIMATE_ACTION]: {
    id: SDG.CLIMATE_ACTION,
    name: 'Climate Action',
    description: 'Take urgent action to combat climate change',
    targets: ['Strengthen resilience', 'Integrate climate measures', 'Improve education'],
  },
  [SDG.LIFE_BELOW_WATER]: {
    id: SDG.LIFE_BELOW_WATER,
    name: 'Life Below Water',
    description: 'Conserve and sustainably use oceans and marine resources',
    targets: ['Reduce marine pollution', 'Protect marine ecosystems', 'Sustainable fishing'],
  },
  [SDG.LIFE_ON_LAND]: {
    id: SDG.LIFE_ON_LAND,
    name: 'Life on Land',
    description: 'Protect, restore and promote sustainable use of terrestrial ecosystems',
    targets: ['Conserve forests', 'Combat desertification', 'Protect biodiversity'],
  },
  [SDG.PEACE_JUSTICE]: {
    id: SDG.PEACE_JUSTICE,
    name: 'Peace, Justice and Strong Institutions',
    description: 'Promote peaceful and inclusive societies',
    targets: ['Reduce violence', 'End abuse and exploitation', 'Promote rule of law'],
  },
  [SDG.PARTNERSHIPS]: {
    id: SDG.PARTNERSHIPS,
    name: 'Partnerships for the Goals',
    description: 'Strengthen means of implementation',
    targets: ['Mobilize resources', 'Develop technologies', 'Capacity building'],
  },
};

export function getSDGById(id: SDG): SDGCategory {
  return SDG_CATEGORIES[id];
}

export function getSDGsByGoal(goalDescription: string): SDG[] {
  // AI-powered SDG matching would go here
  // For now, return common SDGs based on keywords
  const lowerDescription = goalDescription.toLowerCase();
  const matchedSDGs: SDG[] = [];

  if (lowerDescription.includes('recycle') || lowerDescription.includes('waste') || lowerDescription.includes('plastic')) {
    matchedSDGs.push(SDG.RESPONSIBLE_CONSUMPTION);
  }
  if (lowerDescription.includes('energy') || lowerDescription.includes('solar') || lowerDescription.includes('renewable')) {
    matchedSDGs.push(SDG.AFFORDABLE_ENERGY);
  }
  if (lowerDescription.includes('water') || lowerDescription.includes('clean') || lowerDescription.includes('sanitation')) {
    matchedSDGs.push(SDG.CLEAN_WATER);
  }
  if (lowerDescription.includes('exercise') || lowerDescription.includes('health') || lowerDescription.includes('wellness')) {
    matchedSDGs.push(SDG.GOOD_HEALTH);
  }
  if (lowerDescription.includes('education') || lowerDescription.includes('learn') || lowerDescription.includes('study')) {
    matchedSDGs.push(SDG.QUALITY_EDUCATION);
  }
  if (lowerDescription.includes('climate') || lowerDescription.includes('carbon') || lowerDescription.includes('emission')) {
    matchedSDGs.push(SDG.CLIMATE_ACTION);
  }

  return matchedSDGs.length > 0 ? matchedSDGs : [SDG.PARTNERSHIPS];
}

