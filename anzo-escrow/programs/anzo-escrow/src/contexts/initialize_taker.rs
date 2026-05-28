use anchor_lang::prelude::*;

use crate::{
    states::{Controller, Taker},
    CONTROLLER_NAMESPACE, TAKER_NAMESPACE,
};

#[derive(Accounts)]
pub struct InitializeTaker<'info> {
    pub authority: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [CONTROLLER_NAMESPACE],
        bump,
        has_one = authority
    )]
    pub controller: Box<Account<'info, Controller>>,

    pub taker_authority: Signer<'info>,

    #[account(
        init,
        seeds = [
            TAKER_NAMESPACE,
            taker_authority.key().as_ref(),
        ],
        bump,
        payer = payer,
        space = Taker::SPACE,
    )]
    pub taker: Box<Account<'info, Taker>>,

    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(ctx: Context<InitializeTaker>, data: [u8; 256]) -> Result<()> {
    let taker = &mut ctx.accounts.taker;

    taker.bump = ctx.bumps.taker;
    taker.authority = ctx.accounts.taker_authority.key();
    taker.data = data;

    Ok(())
}
