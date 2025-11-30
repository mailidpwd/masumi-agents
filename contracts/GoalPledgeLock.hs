{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE DeriveAnyClass      #-}
{-# LANGUAGE DeriveGeneric       #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE ScopedTypeVariables  #-}
{-# LANGUAGE TemplateHaskell     #-}
{-# LANGUAGE OverloadedStrings   #-}

module GoalPledgeLock where

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

-- | Goal Pledge Datum
data GoalPledgeDatum = GoalPledgeDatum
    { gpdGoalId       :: BuiltinByteString
    , gpdUserId       :: BuiltinByteString
    , gpdPledgedAmount :: TokenAmount
    , gpdLockUntil    :: POSIXTime  -- Target date for goal
    , gpdCreatedAt    :: POSIXTime
    }
    deriving (Show, Eq)

PlutusTx.unstableMakeIsData ''GoalPledgeDatum

-- | Pledge Redeemer
data PledgeRedeemer = LockPledge | UnlockPledge | CancelPledge
    deriving (Show, Eq)

PlutusTx.unstableMakeIsData ''PledgeRedeemer

-- | Validator Logic
{-# INLINABLE validateGoalPledge #-}
validateGoalPledge :: GoalPledgeDatum -> PledgeRedeemer -> ScriptContext -> Bool
validateGoalPledge datum redeemer ctx =
    let
        info :: TxInfo
        info = scriptContextTxInfo ctx

        currentTime = txInfoValidRange info

        case redeemer of
            LockPledge ->
                -- Validate lock: amount must be positive, time must be in future
                taAda (gpdPledgedAmount datum) > 0 &&
                gpdLockUntil datum > gpdCreatedAt datum

            UnlockPledge ->
                -- Unlock: can only unlock after lock period or goal completion
                -- In production, add goal completion verification
                True  -- Simplified for now

            CancelPledge ->
                -- Cancel: only before lock period starts
                True  -- Simplified for now

    in
        True  -- Placeholder - implement full logic

-- | Typed Validator
pledgeValidator :: ValidatorTypes GoalPledgeDatum PledgeRedeemer
pledgeValidator = ValidatorTypes
    { datumType = GoalPledgeDatum
    , redeemerType = PledgeRedeemer
    }

-- | Compiled Validator
pledgeValidatorCompiled :: CompiledCode (GoalPledgeDatum -> PledgeRedeemer -> ScriptContext -> Bool)
pledgeValidatorCompiled = $$(PlutusTx.compile [|| validateGoalPledge ||])

-- | Validator Script
pledgeValidatorScript :: Validator
pledgeValidatorScript = mkValidatorScript pledgeValidatorCompiled

-- | Script Hash
pledgeValidatorHash :: ValidatorHash
pledgeValidatorHash = validatorHash pledgeValidatorScript

-- | Serialized Script
pledgeScript :: SBS.ShortByteString
pledgeScript = SBS.toShort . LBS.toStrict $ serialise pledgeValidatorScript

