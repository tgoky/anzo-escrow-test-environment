use anchor_lang::prelude::*;

use anchor_spl::{
    token::Token,
    token_interface::{Mint, TokenAccount},
};

use crate::{
    constants::{BUY_OFFER_NAMESPACE, MAKER_NAMESPACE},
    states::{Maker, BuyOffer},
};

#[derive(Accounts)]
pub struct IntializeBuyOffer<'info> {
    pub maker_authority: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
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
            BUY_OFFER_NAMESPACE,
            maker_authority.key().as_ref(),
            &maker.total_offers.to_ne_bytes()
        ],
        bump,
        payer = payer,
        space = BuyOffer::SPACE,
    )]
    pub offer: Box<Account<'info, BuyOffer>>,

    pub mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        constraint = receiver_ata.mint == mint.key()
    )]
    pub receiver_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(ctx: Context<IntializeBuyOffer>, data: [u8; 256]) -> Result<()> {
    let maker = &mut ctx.accounts.maker;
    let offer = &mut ctx.accounts.offer;

    offer.bump = ctx.bumps.offer;
    offer.id = maker.total_offers;
    offer.maker_authority = ctx.accounts.maker_authority.key();
    offer.mint = ctx.accounts.mint.key();
    offer.receiver_ata = ctx.accounts.receiver_ata.key();
    offer.total_intents = 0;
    offer.data = data;

    maker.total_offers = maker.total_offers.checked_add(1).unwrap();

    Ok(())
}
