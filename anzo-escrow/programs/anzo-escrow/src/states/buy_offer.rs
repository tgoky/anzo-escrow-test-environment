use std::mem::size_of;

use anchor_lang::prelude::*;

#[account]
pub struct BuyOffer {
    pub bump: u8,

    pub id: u64,

    pub maker_authority: Pubkey,

    pub mint: Pubkey,

    pub receiver_ata: Pubkey,

    pub total_intents: u64,

    pub data: [u8; 256],
}

impl BuyOffer {
    pub const SPACE: usize = 8
        + size_of::<u8>() // bump
        + size_of::<u64>() // id
        + size_of::<Pubkey>() // maker_authority
        + size_of::<Pubkey>() // mint
        + size_of::<Pubkey>() // receiver_ata
        + size_of::<u64>() // total_intents
        + size_of::<[u8; 256]>(); // data
}
