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
        SellOffer,
        SellIntent,
        Taker
    }, 
    constants::{
        ESCROW_NAMESPACE, 
        SELL_INTENT_NAMESPACE, 
        SELL_OFFER_NAMESPACE, 
        TAKER_NAMESPACE, 
        VAULT_NAMESPACE
    },
};

#[derive(Accounts)]
#[instruction(offer_id: u64, amount: u64, data: [u8; 256])]
pub struct InitializeSellIntent<'info> {
    pub taker_authority: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    // Checks taker is initialized
    #[account(
        seeds = [
            TAKER_NAMESPACE,
            taker_authority.key().as_ref()
        ],
        bump,
    )]
    pub taker: Box<Account<'info, Taker>>,

    /// CHECK: This account is not dangerous because we don't read or write from this account
    pub maker_authority: AccountInfo<'info>,

    #[account(
        seeds = [
            SELL_OFFER_NAMESPACE,
            maker_authority.key().as_ref(),
            &offer_id.to_ne_bytes()
        ],
        bump,
        constraint = offer.mint == mint.key()
    )]
    pub offer: Box<Account<'info, SellOffer>>,

    #[account(
        init,
        seeds = [
            SELL_INTENT_NAMESPACE, 
            offer.key().as_ref(),
            &offer.total_intents.to_ne_bytes()
        ],
        bump,
        payer = payer,
        space = SellIntent::SPACE,        
    )]
    pub intent: Box<Account<'info, SellIntent>>,

    pub mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        seeds =  [
            VAULT_NAMESPACE, 
            offer.key().as_ref()
        ],
        bump,
        constraint = vault_ata.amount >= amount,
        constraint = vault_ata.mint == mint.key()
    )]
    pub vault_ata: Box<InterfaceAccount<'info, TokenAccount>>,

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
        constraint = receiver_ata.mint == mint.key()
    )]
    pub receiver_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(
    ctx: Context<InitializeSellIntent>, 
    offer_id: u64, 
    amount: u64, 
    data: [u8; 256]
) -> Result<()> {
    let offer = &mut ctx.accounts.offer;
    let intent = &mut ctx.accounts.intent;

    let maker_authority = ctx.accounts.maker_authority.key();

    let offer_seeds: &[&[&[u8]]] = &[&[
        SELL_OFFER_NAMESPACE, 
        maker_authority.as_ref(),
        &offer_id.to_ne_bytes(),
        &[offer.bump]
    ]];

    intent.bump = ctx.bumps.intent;
    intent.id = offer.total_intents;
    intent.offer = offer.key();
    intent.taker_authority = ctx.accounts.taker_authority.key();
    intent.escrow_ata = ctx.accounts.escrow_ata.key();
    intent.receiver_ata = ctx.accounts.receiver_ata.key();
    intent.status = 0;
    intent.expiration = Clock::get()?.unix_timestamp + (24 * 60 * 60); // 24 hour timeout
    intent.data = data;

    offer.total_intents = offer.total_intents.checked_add(1).unwrap();

    anchor_spl::token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Transfer {
                from: ctx.accounts.vault_ata.to_account_info(),
                to: ctx.accounts.escrow_ata.to_account_info(),
                authority: ctx.accounts.offer.to_account_info(),
            },
            offer_seeds
        ),
        amount,
    )?;

    Ok(())
}