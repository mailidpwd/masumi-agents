/**
 * Verification Types
 * Comprehensive verification system with media, third-party, and IoT hooks
 */

export type VerificationStatus = 'pending' | 'self_verified' | 'verified' | 'rejected' | 'unverified';
export type VerificationSource = 'self' | 'media' | 'third_party' | 'iot' | 'peer' | 'verifier';

export interface MediaEvidence {
  id: string;
  type: 'photo' | 'video' | 'document' | 'audio';
  uri: string; // Local file path or URL
  thumbnailUri?: string;
  mimeType: string;
  size: number; // In bytes
  uploadedAt: Date;
  metadata?: Record<string, any>;
}

export interface VerificationHook {
  id: string;
  type: 'third_party_app' | 'iot_device' | 'external_api' | 'manual_verifier';
  name: string;
  endpoint?: string; // API endpoint or device identifier
  config: Record<string, any>; // Configuration for the hook
  enabled: boolean;
  lastVerifiedAt?: Date;
}

export interface ThirdPartyVerification {
  hookId: string;
  verified: boolean;
  verificationData: Record<string, any>;
  timestamp: Date;
  confidence: number; // 0-1 confidence score
}

export interface IoTVerification {
  deviceId: string;
  deviceType: string;
  data: Record<string, any>;
  timestamp: Date;
  verified: boolean;
}

export interface PeerVerifier {
  id: string;
  userId: string;
  name: string;
  email?: string;
  relationship: 'friend' | 'family' | 'colleague' | 'other';
  status: 'pending' | 'approved' | 'rejected';
  invitedAt: Date;
}

export interface VerifierInput {
  verifierId: string;
  goalId: string;
  rating: number; // 1-5 or similar scale
  comments?: string;
  verified: boolean;
  submittedAt: Date;
  evidenceReviewed: string[]; // Media IDs reviewed
}

export interface ReflectionEvidence {
  activityLog: string; // Text-based activity log ("Tell your story")
  media: MediaEvidence[]; // Uploaded photos, videos, documents
  selfScore: 'done' | 'not_done' | 'partially_done';
  self_percentage?: number; // 0-100, quantitative assessment from slider
  notes?: string; // Journaling/reflection notes (optional additional context)
  submittedAt: Date;
  thirdPartyVerifications: ThirdPartyVerification[];
  iotVerifications: IoTVerification[];
  verifierInputs: VerifierInput[];
}

/**
 * Reflection Entity
 * A single check-in or update from the user
 */
export interface Reflection {
  id: string;
  goal_id: string;
  content: string; // Text description of progress ("What happened?")
  self_score: 'done' | 'partially_done' | 'not_done';
  self_percentage: number; // 0-100, quantitative assessment
  notes?: string; // Optional additional context
  media_urls: string[]; // Array of image/video URLs (evidence)
  created_date: Date;
  // Additional metadata
  verificationResult?: VerificationResult;
}

export interface VerificationResult {
  goalId: string;
  reflectionEvidence: ReflectionEvidence;
  overallStatus: VerificationStatus;
  verificationScore: number; // Weighted score 0-1
  sources: VerificationSource[];
  verifiedAt?: Date;
  verifiedBy?: string; // Verifier ID or 'system'
  flags: string[]; // Structured data flags for Agent 2
}

export interface VerificationMetadata {
  mediaLinks: string[];
  timestamps: Date[];
  sources: VerificationSource[];
  confidence: number;
  evidenceCount: number;
}

