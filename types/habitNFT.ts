/**
 * HabitNFT Types
 * NFT lifecycle from commitment to achievement
 */
import { TokenAmount } from './rdm';
import { SDG } from './sdg';

export type NFTLifecyclePhase = 'commitment' | 'progress' | 'achievement';
export type NFTTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type NFTStatus = 'active' | 'completed' | 'expired' | 'burned';

export interface HabitNFTMetadata {
  // Basic info
  habitType: string;
  goalDescription: string;
  userId: string;
  username: string;
  
  // Lifecycle
  phase: NFTLifecyclePhase;
  status: NFTStatus;
  
  // Dates
  mintedAt: Date;
  startedAt: Date;
  completedAt?: Date;
  
  // Progress tracking
  milestones: NFTMilestone[];
  currentMilestone: number;
  totalMilestones: number;
  milestonesCompleted: number; // Number of completed milestones
  progressPercentage: number;
  
  // Achievement data
  achievementLevel?: NFTTier;
  completionScore?: number; // 0-100
  verificationScore?: number; // 0-1
  
  // SDG alignment
  sdgAlignment?: SDG[];
  
  // Community
  ratings: number; // Average rating
  viewCount: number;
  
  // Metadata
  imageUri?: string; // NFT image URL
  animationUri?: string; // Optional animation
  attributes: NFTAttribute[];
}

export interface NFTMilestone {
  id: string;
  name: string;
  description: string;
  targetDate: Date;
  completed: boolean;
  completedAt?: Date;
  verificationMethod: string;
  reward?: TokenAmount;
}

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
  display_type?: 'number' | 'string' | 'date' | 'boost_percentage';
}

export interface HabitNFT {
  id: string; // NFT token ID
  policyId: string; // Cardano policy ID
  assetName: string; // Asset name
  metadata: HabitNFTMetadata;
  owner: string; // Cardano address
  mintedAt: Date;
  transactionHash?: string;
  // For LP eligibility
  isLPQualified: boolean;
  lpPoolId?: string;
}

export interface NFTProgressUpdate {
  nftId: string;
  milestoneId: string;
  completed: boolean;
  evidence?: {
    media: string[];
    thirdPartyVerification?: any;
    iotData?: any;
  };
  timestamp: Date;
}

export interface NFTEvolution {
  nftId: string;
  fromPhase: NFTLifecyclePhase;
  toPhase: NFTLifecyclePhase;
  triggeredAt: Date;
  triggerReason: string;
  newMetadata: Partial<HabitNFTMetadata>;
}

export interface NFTMarketData {
  nftId: string;
  floorPrice?: TokenAmount;
  lastSalePrice?: TokenAmount;
  totalVolume: TokenAmount;
  listings: NFTListing[];
  offers: NFTOffer[];
}

export interface NFTListing {
  id: string;
  nftId: string;
  seller: string;
  price: TokenAmount;
  listedAt: Date;
  expiresAt?: Date;
  status: 'active' | 'sold' | 'cancelled';
}

export interface NFTOffer {
  id: string;
  nftId: string;
  buyer: string;
  offerAmount: TokenAmount;
  offeredAt: Date;
  expiresAt?: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
}

