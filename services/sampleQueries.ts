/**
 * Sample Cardano-related queries for testing the agent
 */
export const SAMPLE_QUERIES = {
  cardano_basics: 'What is Cardano and how does it differ from other blockchains?',
  wallet_help: 'How do I connect my Cardano wallet to this DApp?',
  transaction_help: 'How do I send ADA from my wallet?',
  staking: 'How does staking work on Cardano?',
  smart_contracts: 'What are Plutus smart contracts?',
  dapp_development: 'How do I build DApps on Cardano?',
  wallets_comparison: 'What are the differences between Nami, Eternl, and Flint wallets?',
  ada_info: 'What is ADA and how is it used on Cardano?',
  network_info: 'What is the difference between Cardano mainnet and testnet?',
  delegation: 'How do I delegate my ADA to a stake pool?',
} as const;

export type SampleQueryType = keyof typeof SAMPLE_QUERIES;

