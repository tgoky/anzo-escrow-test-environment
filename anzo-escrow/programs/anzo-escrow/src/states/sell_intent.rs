use std::mem::size_of;

use anchor_lang::prelude::*;

#[account]
pub struct SellIntent {
    pub bump: u8,

    pub id: u64,

    pub offer: Pubkey,

    pub taker_authority: Pubkey,

    pub escrow_ata: Pubkey,

    pub receiver_ata: Pubkey,

    /*
        0: Open
        1: Confirmed
        2: Cancelled
    */
    pub status: u8,
    pub expiration: i64,

    pub data: [u8; 256],
}

impl SellIntent {
    pub const SPACE: usize = 8
        + size_of::<u8>() // bump
        + size_of::<u64>() // id
        + size_of::<Pubkey>() // offer
        + size_of::<Pubkey>() // taker_authority
        + size_of::<Pubkey>() // escrow_ata
        + size_of::<Pubkey>() // receiver_ata
        + size_of::<u8>() // status
        + size_of::<i64>() // expiration
        + size_of::<[u8; 256]>(); // data
}