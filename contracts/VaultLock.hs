{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE DeriveAnyClass      #-}
{-# LANGUAGE DeriveGeneric       #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE ScopedTypeVariables  #-}
{-# LANGUAGE TemplateHaskell     #-}
{-# LANGUAGE OverloadedStrings   #-}

module VaultLock where

import           PlutusTx
import           PlutusTx.Prelude
import           Plutus.V2.Ledger.Api
import           Plutus.V2.Ledger.Contexts
import           Plutus.Script.Utils.V2.Typed.Scripts.Validators
import           Plutus.Script.Utils.V2.Scripts
import           Codec.Serialise
import qualified Data.ByteString.Lazy as LBS
import qualified Data.ByteString.Short as SBS

-- | Token Amount
data TokenAmount = TokenAmount
    { taAda      :: Integer
    , taRdmToken :: Maybe Integer
    }
    deriving (Show, Eq)

PlutusTx.unstableMakeIsData ''TokenAmount

-- | Vault Type
data VaultType = PersonalVault | GenerationalVault | InstitutionalVault
    deriving (Show, Eq)

PlutusTx.unstableMakeIsData ''VaultType

-- | Vault Lock Datum
data VaultLockDatum = VaultLockDatum
    { vldVaultId        :: BuiltinByteString
    , vldCreatorId      :: BuiltinByteString
    , vldBeneficiaryId  :: BuiltinByteString
    , vldVaultType      :: VaultType
    , vldLockedAmount   :: TokenAmount
    , vldLockDuration   :: Integer  -- Duration in years
    , vldLockStartDate  :: POSIXTime
    , vldLockEndDate    :: POSIXTime
    , vldMinLockAmount  :: Integer  -- Minimum lock amount
    }
    deriving (Show, Eq)

PlutusTx.unstableMakeIsData ''VaultLockDatum

-- | Vault Redeemer
data VaultRedeemer = LockVault | UnlockVault | PartialUnlock Integer
    deriving (Show, Eq)

PlutusTx.unstableMakeIsData ''VaultRedeemer

-- | Validator Logic
{-# INLINABLE validateVaultLock #-}
validateVaultLock :: VaultLockDatum -> VaultRedeemer -> ScriptContext -> Bool
validateVaultLock datum redeemer ctx =
    let
        info :: TxInfo
        info = scriptContextTxInfo ctx

        currentTime = txInfoValidRange info
        lockedAmount = taAda (vldLockedAmount datum)

        case redeemer of
            LockVault ->
                -- Validate lock: amount must meet minimum, duration must be positive
                lockedAmount >= vldMinLockAmount datum &&
                vldLockDuration datum > 0 &&
                vldLockEndDate datum > vldLockStartDate datum

            UnlockVault ->
                -- Unlock: can only unlock after lock period or with verification
                True  -- Simplified - add verification logic

            PartialUnlock percentage ->
                -- Partial unlock: percentage must be valid (0-100)
                percentage > 0 && percentage <= 100 &&
                lockedAmount >= vldMinLockAmount datum

    in
        True  -- Placeholder - implement full logic

-- | Typed Validator
vaultValidator :: ValidatorTypes VaultLockDatum VaultRedeemer
vaultValidator = ValidatorTypes
    { datumType = VaultLockDatum
    , redeemerType = VaultRedeemer
    }

-- | Compiled Validator
vaultValidatorCompiled :: CompiledCode (VaultLockDatum -> VaultRedeemer -> ScriptContext -> Bool)
vaultValidatorCompiled = $$(PlutusTx.compile [|| validateVaultLock ||])

-- | Validator Script
vaultValidatorScript :: Validator
vaultValidatorScript = mkValidatorScript vaultValidatorCompiled

-- | Script Hash
vaultValidatorHash :: ValidatorHash
vaultValidatorHash = validatorHash vaultValidatorScript

-- | Serialized Script
vaultScript :: SBS.ShortByteString
vaultScript = SBS.toShort . LBS.toStrict $ serialise vaultValidatorScript

