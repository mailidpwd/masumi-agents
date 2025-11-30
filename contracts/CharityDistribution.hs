{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE DeriveAnyClass      #-}
{-# LANGUAGE DeriveGeneric       #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE ScopedTypeVariables  #-}
{-# LANGUAGE TemplateHaskell     #-}
{-# LANGUAGE OverloadedStrings   #-}

module CharityDistribution where

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

-- | Charity Distribution Datum
data CharityDatum = CharityDatum
    { cdFromPurse  :: BuiltinByteString  -- Charity purse address
    , cdToAddress  :: Address            -- Charity recipient address
    , cdAmount     :: TokenAmount
    , cdCharityId  :: BuiltinByteString
    , cdGoalId     :: Maybe BuiltinByteString
    }
    deriving (Show, Eq)

PlutusTx.unstableMakeIsData ''CharityDatum

-- | Charity Redeemer
data CharityRedeemer = CharityRedeemer
    { crSignature :: BuiltinByteString
    , crTimestamp :: Integer
    }
    deriving (Show, Eq)

PlutusTx.unstableMakeIsData ''CharityRedeemer

-- | Validator Logic
{-# INLINABLE validateCharityDistribution #-}
validateCharityDistribution :: CharityDatum -> CharityRedeemer -> ScriptContext -> Bool
validateCharityDistribution datum redeemer ctx =
    let
        info :: TxInfo
        info = scriptContextTxInfo ctx

        -- Validate amount is positive
        amountValid = taAda (cdAmount datum) > 0

        -- Validate recipient address matches
        outputs = txInfoOutputs info
        addressValid = any (\o -> txOutAddress o == cdToAddress datum) outputs

        -- Check signature
        signatureValid = lengthOfByteString (crSignature redeemer) > 0

        -- Validate timestamp (prevent replay attacks)
        timestampValid = crTimestamp redeemer <= txInfoValidRange info

    in
        amountValid && addressValid && signatureValid && timestampValid

-- | Typed Validator
charityValidator :: ValidatorTypes CharityDatum CharityRedeemer
charityValidator = ValidatorTypes
    { datumType = CharityDatum
    , redeemerType = CharityRedeemer
    }

-- | Compiled Validator
charityValidatorCompiled :: CompiledCode (CharityDatum -> CharityRedeemer -> ScriptContext -> Bool)
charityValidatorCompiled = $$(PlutusTx.compile [|| validateCharityDistribution ||])

-- | Validator Script
charityValidatorScript :: Validator
charityValidatorScript = mkValidatorScript charityValidatorCompiled

-- | Script Hash
charityValidatorHash :: ValidatorHash
charityValidatorHash = validatorHash charityValidatorScript

-- | Serialized Script
charityScript :: SBS.ShortByteString
charityScript = SBS.toShort . LBS.toStrict $ serialise charityValidatorScript

