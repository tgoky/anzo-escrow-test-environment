use anchor_lang::prelude::*;

use anchor_spl::{
    token::Token, 
    token_interface::TokenAccount
};

use crate::{
    constants::{CONTROLLER_NAMESPACE, ESCROW_NAMESPACE, BUY_INTENT_NAMESPACE, BUY_OFFER_NAMESPACE}, 
    states::{Controller, BuyIntent, BuyOffer},
};

#[derive(Accounts)]
#[instruction(intent_id: u64, offer_id: u64)] 
pub struct CancelBuyIntent<'info> {
    #[account(
        constraint = authority.key() == controller.authority 
            || authority.key() == taker_authority.key()
            || authority.key() == maker_authority.key()
    )]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [CONTROLLER_NAMESPACE],
        bump,
    )]
    pub controller: Box<Account<'info, Controller>>,

    /// CHECK: This account is not dangerous because we don't read or write from this account
    pub taker_authority: AccountInfo<'info>,

    /// CHECK: This account is not dangerous because we don't read or write from this account
    pub maker_authority: AccountInfo<'info>,

    #[account(
        seeds = [
            BUY_OFFER_NAMESPACE,
            maker_authority.key().as_ref(),
            &offer_id.to_ne_bytes()
        ],
        bump,
    )]
    pub offer: Box<Account<'info, BuyOffer>>,

    #[account(
        mut,
        seeds = [
            BUY_INTENT_NAMESPACE, 
            offer.key().as_ref(),
            &intent_id.to_ne_bytes()
        ],
        bump,
        constraint = intent.status == 0,
        constraint = intent.taker_authority == taker_authority.key(),
        constraint = intent.offer == offer.key(),
    )]
    pub intent: Box<Account<'info, BuyIntent>>,

    #[account(
        mut,
        seeds =  [
            ESCROW_NAMESPACE,
            intent.key().as_ref(),
        ],
        bump,
        constraint = escrow_ata.key() == intent.escrow_ata  
    )]
    pub escrow_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        constraint = refund_ata.key() == intent.refund_ata
    )]
    pub refund_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(ctx: Context<CancelBuyIntent>, intent_id: u64, _offer_id: u64) -> Result<()> {
    let intent = &mut ctx.accounts.intent;

    let offer_pubkey = ctx.accounts.offer.key();

    let intend_seeds: &[&[&[u8]]] = &[&[
        BUY_INTENT_NAMESPACE, 
        offer_pubkey.as_ref(),
        &intent_id.to_ne_bytes(),
        &[intent.bump]
    ]];

    // 2: Cancelled
    intent.status = 2;

    anchor_spl::token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Transfer {
                from: ctx.accounts.escrow_ata.to_account_info(),
                to: ctx.accounts.refund_ata.to_account_info(),
                authority: ctx.accounts.intent.to_account_info(),
            },
            intend_seeds
        ),
        ctx.accounts.escrow_ata.amount,
    )?;

    Ok(())
}
