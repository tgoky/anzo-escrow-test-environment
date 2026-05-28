use anchor_lang::prelude::*;

use anchor_spl::{
    token::Token,
    token_interface::{Mint, TokenAccount, transfer_checked, TransferChecked},
};

use crate::{
    states::{
        Maker, 
        SellOffer
    },
    constants::{
        MAKER_NAMESPACE, 
        SELL_OFFER_NAMESPACE, 
        VAULT_NAMESPACE
    },
};

#[derive(Accounts)]
pub struct IntializeSellOffer<'info> {
    pub maker_authority: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [
            MAKER_NAMESPACE,
            maker_authority.key().as_ref(),
        ],
        bump,
    )]
    pub maker: Box<Account<'info, Maker>>,

    #[account(
        init,
        seeds = [
            SELL_OFFER_NAMESPACE,
            maker_authority.key().as_ref(),
            &maker.total_offers.to_ne_bytes()
        ],
        bump,
        payer = payer,
        space = SellOffer::SPACE,
    )]
    pub offer: Box<Account<'info, SellOffer>>,

    pub mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        constraint = maker_token_account.owner == maker_authority.key(),
        constraint = maker_token_account.mint == mint.key()
    )]
    pub maker_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init,
        seeds =  [
            VAULT_NAMESPACE, 
            offer.key().as_ref()
        ],
        token::mint = mint,
        token::authority = offer,
        bump,
        payer = payer,
    )]
    pub vault_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(
    ctx: Context<IntializeSellOffer>,
    data: [u8; 256],
    amount: u64,
) -> Result<()> {
    let maker = &mut ctx.accounts.maker;
    let offer = &mut ctx.accounts.offer;

    offer.bump = ctx.bumps.offer;
    offer.id = maker.total_offers;
    offer.maker_authority = ctx.accounts.maker_authority.key();
    offer.mint = ctx.accounts.mint.key();
    offer.vault_ata = ctx.accounts.vault_ata.key();
    offer.total_intents = 0;
    offer.data = data;

    maker.total_offers = maker.total_offers.checked_add(1).unwrap();

   // TODO: Transfer tokens to offer vault
     // Transfer tokens from maker to vault
     transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.maker_token_account.to_account_info(),
                to: ctx.accounts.vault_ata.to_account_info(),
                authority: ctx.accounts.maker_authority.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
            },
        ),
        amount,
        ctx.accounts.mint.decimals,
    )?;

    Ok(())
}