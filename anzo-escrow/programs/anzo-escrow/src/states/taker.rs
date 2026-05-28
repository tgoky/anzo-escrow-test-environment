use std::mem::size_of;

use anchor_lang::prelude::*;

#[account]
pub struct Taker {
    pub bump: u8,

    pub authority: Pubkey,

    pub data: [u8; 256],
}

impl Taker {
    pub const SPACE: usize = 8
        + size_of::<u8>() // bump
        + size_of::<Pubkey>() // authority
        + size_of::<[u8; 256]>(); // data
}