use anchor_lang::prelude::*;

use crate::{
    constants::CONTROLLER_NAMESPACE,
    states::Controller,
};

#[derive(Accounts)]
pub struct InitializeController<'info> {
    pub authority: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        seeds = [CONTROLLER_NAMESPACE],
        bump,
        payer = payer,
        space = Controller::SPACE,
    )]
    pub controller: Box<Account<'info, Controller>>,

    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(ctx: Context<InitializeController>) -> Result<()> {
    let controller = &mut ctx.accounts.controller;

    controller.bump = ctx.bumps.controller;
    controller.authority = ctx.accounts.authority.key();

    Ok(())
}
