use anchor_lang::prelude::*;

use anchor_spl::{token::Token, token_interface::TokenAccount};

use crate::{
    constants::{
        CONTROLLER_NAMESPACE, ESCROW_NAMESPACE, SELL_INTENT_NAMESPACE,
        SELL_OFFER_NAMESPACE,
    },
    states:: {
        SellIntent,
        SellOffer,
        Controller
    }
};

#[derive(Accounts)]
#[instruction(intent_id: u64, offer_id: u64)]
pub struct ConfirmSellIntent<'info> {
    #[account(
        constraint = authority.key() == controller.authority || authority.key() == offer.maker_authority
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
    pub maker_authority: AccountInfo<'info>,

    #[account(
        seeds = [
            SELL_OFFER_NAMESPACE,
            maker_authority.key().as_ref(),
            &offer_id.to_ne_bytes()
        ],
        bump,
    )]
    pub offer: Box<Account<'info, SellOffer>>,

    #[account(
        mut,
        seeds = [
            SELL_INTENT_NAMESPACE,
            offer.key().as_ref(),
            &intent_id.to_ne_bytes()
        ],
        bump,
        constraint = intent.status == 0,
        constraint = intent.expiration > Clock::get()?.unix_timestamp,
        constraint = intent.offer == offer.key()
    )]
    pub intent: Box<Account<'info, SellIntent>>,

    #[account(
        mut,
        seeds = [
            ESCROW_NAMESPACE,
            intent.key().as_ref(),
        ],
        bump,
        constraint = escrow_ata.key() == intent.escrow_ata
    )]
    pub escrow_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = receiver_ata.key() == intent.receiver_ata,
    )]
    pub receiver_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(
    ctx: Context<ConfirmSellIntent>,
    intent_id: u64,
    _offer_id: u64,
) -> Result<()> {
    let intent = &mut ctx.accounts.intent;

    let offer_pubkey = ctx.accounts.offer.key();

    let intend_seeds: &[&[&[u8]]] = &[&[
        SELL_INTENT_NAMESPACE,
        offer_pubkey.as_ref(),
        &intent_id.to_ne_bytes(),
        &[intent.bump],
    ]];

    // 1: Confirmed
    intent.status = 1;

    anchor_spl::token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Transfer {
                from: ctx.accounts.escrow_ata.to_account_info(),
                to: ctx.accounts.receiver_ata.to_account_info(),
                authority: ctx.accounts.intent.to_account_info(),
            },
            intend_seeds,
        ),
        ctx.accounts.escrow_ata.amount,
    )?;

    Ok(())
}
