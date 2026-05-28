use std::mem::size_of;

use anchor_lang::prelude::*;

#[account]
pub struct Maker {
    pub bump: u8,

    pub authority: Pubkey,

    pub total_offers: u64,

    pub data: [u8; 256],
}

impl Maker {
    pub const SPACE: usize = 8
        + size_of::<u8>() // bump
        + size_of::<Pubkey>() // authority
        + size_of::<u64>() // total_offers
        + size_of::<[u8; 256]>(); // data
}