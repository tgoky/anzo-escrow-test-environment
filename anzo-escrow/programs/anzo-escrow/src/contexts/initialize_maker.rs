use anchor_lang::prelude::*;

use crate::{
    states::{Controller, Maker},
    CONTROLLER_NAMESPACE, MAKER_NAMESPACE,
};

#[derive(Accounts)]
pub struct InitializeMaker<'info> {
    pub authority: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [CONTROLLER_NAMESPACE],
        bump,
        has_one = authority
    )]
    pub controller: Box<Account<'info, Controller>>,

    pub maker_authority: Signer<'info>,

    #[account(
        init,
        seeds = [
            MAKER_NAMESPACE,
            maker_authority.key().as_ref(),
        ],
        bump,
        payer = payer,
        space = Maker::SPACE,
    )]
    pub maker: Box<Account<'info, Maker>>,

    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(ctx: Context<InitializeMaker>, data: [u8; 256]) -> Result<()> {
    let maker = &mut ctx.accounts.maker;

    maker.bump = ctx.bumps.maker;
    maker.authority = ctx.accounts.authority.key();
    maker.total_offers = 0;
    maker.data = data;

    Ok(())
}
