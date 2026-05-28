use anchor_lang::prelude::*;

#[constant]
pub const CONTROLLER_NAMESPACE: &[u8] = b"CONTROLLER";
pub const MAKER_NAMESPACE: &[u8] = b"MAKER";
pub const TAKER_NAMESPACE: &[u8] = b"TAKER";
pub const SELL_OFFER_NAMESPACE: &[u8] = b"SELL_OFFER";
pub const BUY_OFFER_NAMESPACE: &[u8] = b"BUY_OFFER";
pub const VAULT_NAMESPACE: &[u8] = b"VAULT";
pub const SELL_INTENT_NAMESPACE: &[u8] = b"SELL_INTENT";
pub const BUY_INTENT_NAMESPACE: &[u8] = b"BUY_INTENT";
pub const ESCROW_NAMESPACE: &[u8] = b"ESCROW";
