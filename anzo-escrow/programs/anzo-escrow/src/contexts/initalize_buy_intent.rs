use anchor_lang::prelude::*;

use anchor_spl::{
    token::Token, 
    token_interface::{
        Mint, 
        TokenAccount
    }
};

use crate::{
    states::{
        BuyIntent, 
        BuyOffer
    }, 
    constants::{
        BUY_INTENT_NAMESPACE,
        BUY_OFFER_NAMESPACE,
        ESCROW_NAMESPACE
    }
};

#[derive(Accounts)]
#[instruction(offer_id: u64, amount: u64, data: [u8; 256])]
pub struct InitializeBuyIntent<'info> {
    pub taker_authority: Signer<'info>,

    pub sender: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: This account is not dangerous because we don't read or write from this account
    pub maker_authority: AccountInfo<'info>,

    #[account(
        seeds = [
            BUY_OFFER_NAMESPACE,
            maker_authority.key().as_ref(),
            &offer_id.to_ne_bytes()
        ],
        bump,
        constraint = offer.mint == mint.key()
    )]
    pub offer: Box<Account<'info, BuyOffer>>,

    #[account(
        init,
        seeds = [
            BUY_INTENT_NAMESPACE, 
            offer.key().as_ref(),
            &offer.total_intents.to_ne_bytes()
        ],
        bump,
        payer = payer,
        space = BuyIntent::SPACE,
    )]
    pub intent: Box<Account<'info, BuyIntent>>,

    pub mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        init,
        seeds =  [
            ESCROW_NAMESPACE,
            intent.key().as_ref(),
        ],
        token::mint = mint,
        token::authority = intent,
        bump,
        payer = payer,
    )]
    pub escrow_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        constraint = refund_ata.mint == mint.key(),
    )]
    pub refund_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = sender_ata.amount >= amount,
        constraint = sender_ata.mint == mint.key(),
    )]
    pub sender_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(
    ctx: Context<InitializeBuyIntent>, 
    _offer_id: u64, 
    amount: u64, 
    data: [u8; 256]
) -> Result<()> {
    let offer = &mut ctx.accounts.offer;
    let intent = &mut ctx.accounts.intent;

    intent.bump = ctx.bumps.intent;
    intent.id = offer.total_intents;
    intent.offer = offer.key();
    intent.taker_authority = ctx.accounts.taker_authority.key();
    intent.escrow_ata = ctx.accounts.escrow_ata.key();
    intent.refund_ata = ctx.accounts.refund_ata.key();
    intent.status = 0;
    intent.expiration = Clock::get()?.unix_timestamp + (24 * 60 * 60); // 24 hour timeout
    intent.data = data;

    offer.total_intents = offer.total_intents.checked_add(1).unwrap();

    anchor_spl::token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Transfer {
                from: ctx.accounts.sender_ata.to_account_info(),
                to: ctx.accounts.escrow_ata.to_account_info(),
                authority: ctx.accounts.sender.to_account_info(),
            },
        ),
        amount,
    )?;

    Ok(())
}