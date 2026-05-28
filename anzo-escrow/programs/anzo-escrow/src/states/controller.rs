use std::mem::size_of;

use anchor_lang::prelude::*;

#[account]
pub struct Controller {
    pub bump: u8,

    pub authority: Pubkey,
}

impl Controller {
    pub const SPACE: usize = 8
        + size_of::<u8>() // bump
        + size_of::<Pubkey>(); // authority
}