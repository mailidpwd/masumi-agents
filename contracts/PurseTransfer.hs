{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE DeriveAnyClass      #-}
{-# LANGUAGE DeriveGeneric       #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE ScopedTypeVariables  #-}
{-# LANGUAGE TemplateHaskell     #-}
{-# LANGUAGE OverloadedStrings   #-}

module PurseTransfer where

import           PlutusTx
import           PlutusTx.Prelude
import           Plutus.V2.Ledger.Api
import           Plutus.V2.Ledger.Contexts
import           Plutus.Script.Utils.V2.Typed.Scripts.Validators
import           Plutus.Script.Utils.V2.Scripts
import           Codec.Serialise
import qualified Data.ByteString.Lazy as LBS
import qualified Data.ByteString.Short as SBS

-- | Purse Type Enum
data PurseType = BasePurse | RewardPurse | RemorsePurse | CharityPurse
    deriving (Show, Eq)

PlutusTx.unstableMakeIsData ''PurseType

-- | Token Amount
data TokenAmount = TokenAmount
    { taAda      :: Integer  -- Amount in Lovelace
    , taRdmToken :: Maybe Integer  -- Optional RDM token amount
    }
    deriving (Show, Eq)

PlutusTx.unstableMakeIsData ''TokenAmount

-- | Transfer Datum
data TransferDatum = TransferDatum
    { tdFromPurse :: PurseType
    , tdToPurse   :: PurseType
    , tdAmount    :: TokenAmount
    , tdGoalId    :: Maybe BuiltinByteString
    }
    deriving (Show, Eq)

PlutusTx.unstableMakeIsData ''TransferDatum

-- | Redeemer
data TransferRedeemer = TransferRedeemer
    { trSignature :: BuiltinByteString  -- Signature for authorization
    }
    deriving (Show, Eq)

PlutusTx.unstableMakeIsData ''TransferRedeemer

-- | Validator Logic
{-# INLINABLE validateTransfer #-}
validateTransfer :: TransferDatum -> TransferRedeemer -> ScriptContext -> Bool
validateTransfer datum redeemer ctx =
    let
        info :: TxInfo
        info = scriptContextTxInfo ctx

        -- Check that transaction has correct inputs/outputs
        inputs = txInfoInputs info
        outputs = txInfoOutputs info

        -- Validate that amount is being transferred correctly
        -- This is a simplified version - in production, add more validation
        amountValid = taAda (tdAmount datum) > 0

        -- Check signature (simplified - in production use proper cryptographic verification)
        signatureValid = lengthOfByteString (trSignature redeemer) > 0

    in
        amountValid && signatureValid

-- | Typed Validator
transferValidator :: ValidatorTypes TransferDatum TransferRedeemer
transferValidator = ValidatorTypes
    { datumType = TransferDatum
    , redeemerType = TransferRedeemer
    }

-- | Compiled Validator
transferValidatorCompiled :: CompiledCode (TransferDatum -> TransferRedeemer -> ScriptContext -> Bool)
transferValidatorCompiled = $$(PlutusTx.compile [|| validateTransfer ||])

-- | Validator Script
transferValidatorScript :: Validator
transferValidatorScript = mkValidatorScript transferValidatorCompiled

-- | Script Hash
transferValidatorHash :: ValidatorHash
transferValidatorHash = validatorHash transferValidatorScript

-- | Serialized Script (for deployment)
transferScript :: SBS.ShortByteString
transferScript = SBS.toShort . LBS.toStrict $ serialise transferValidatorScript

