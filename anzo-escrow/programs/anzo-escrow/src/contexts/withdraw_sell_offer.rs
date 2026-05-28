use anchor_lang::prelude::*;

use anchor_spl::{
    token::Token,
    token_interface::TokenAccount
};

use crate::{
    states::SellOffer, 
    constants::{
        SELL_OFFER_NAMESPACE, 
        VAULT_NAMESPACE
    }
};

#[derive(Accounts)]
#[instruction(offer_id: u64, amount: u64)]
pub struct WithdrawSellOffer<'info> {
    pub authority: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [
            SELL_OFFER_NAMESPACE,
            authority.key().as_ref(),
            &offer_id.to_ne_bytes()
        ],
        bump,
    )]
    pub offer: Box<Account<'info, SellOffer>>,

    #[account(
        mut,
        seeds =  [
            VAULT_NAMESPACE, 
            offer.key().as_ref()
        ],
        bump,
        constraint = vault_ata.amount >= amount,
        constraint = vault_ata.key() == offer.vault_ata
    )]
    pub vault_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = receiver_ata.mint == offer.mint
    )]
    pub receiver_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(ctx: Context<WithdrawSellOffer>, offer_id: u64, amount: u64) -> Result<()> {
    let offer = &ctx.accounts.offer;

    let maker_authority = ctx.accounts.authority.key();

    let offer_seeds: &[&[&[u8]]] = &[&[
        SELL_OFFER_NAMESPACE, 
        maker_authority.as_ref(),
        &offer_id.to_ne_bytes(),
        &[offer.bump]
    ]];

    anchor_spl::token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Transfer {
                from: ctx.accounts.vault_ata.to_account_info(),
                to: ctx.accounts.receiver_ata.to_account_info(),
                authority: ctx.accounts.offer.to_account_info(),
            },
            offer_seeds
        ),
        amount,
    )?;
    
    Ok(())
}