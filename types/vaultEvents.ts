/**
 * Vault Event Types
 * Events for time-locked vault operations
 */
import { AgentEvent } from './rdm';
import { AgentEventType } from './rdm';
import { VaultConfig, VaultUnlockRequest, PartialUnlock } from './vault';
import { TokenAmount } from './rdm';

export interface VaultCreatedEvent extends AgentEvent {
  type: AgentEventType.VAULT_CREATED;
  payload: {
    vaultId: string;
    vault: VaultConfig;
    lockedRDM: TokenAmount;
    lockDuration: number; // Years
  };
}

export interface VaultVerifiedUnlockEvent extends AgentEvent {
  type: AgentEventType.VAULT_VERIFIED_UNLOCK;
  payload: {
    vaultId: string;
    unlockRequest: VaultUnlockRequest;
    unlockedAmount: TokenAmount;
    verificationConfidence: number; // 0-1
  };
}

export interface VaultPartialUnlockEvent extends AgentEvent {
  type: AgentEventType.VAULT_PARTIAL_UNLOCK;
  payload: {
    vaultId: string;
    partialUnlock: PartialUnlock;
    remainingLocked: TokenAmount;
  };
}

export interface VaultExpiredEvent extends AgentEvent {
  type: AgentEventType.VAULT_EXPIRED;
  payload: {
    vaultId: string;
    expiredAt: Date;
    charityAmount: TokenAmount;
    returnedAmount?: TokenAmount; // If partial unlocks occurred
  };
}

