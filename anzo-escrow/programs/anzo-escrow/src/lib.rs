#![allow(clippy::result_large_err)]
use anchor_lang::prelude::*;

pub mod constants;
pub mod contexts;
pub mod states;

pub use constants::*;
pub use contexts::*;
pub use states::*;

declare_id!("6swJPHnA6dJXUbtu2D2vTwqZVr1RzHe1k1mbDCqbwL3X");

#[program]
pub mod anzo_escrow {
    use super::*;

    pub fn initialize_controller(ctx: Context<InitializeController>) -> Result<()> {
        initialize_controller::handler(ctx)
    }

    pub fn initialize_maker(ctx: Context<InitializeMaker>, data: [u8; 256]) -> Result<()> {
        initialize_maker::handler(ctx, data)
    }

    pub fn initialize_taker(ctx: Context<InitializeTaker>, data: [u8; 256]) -> Result<()> {
        initialize_taker::handler(ctx, data)
    }

    pub fn initialize_sell_offer(
        ctx: Context<IntializeSellOffer>,
        data: [u8; 256],
        amount: u64,
    ) -> Result<()> {
        initialize_sell_offer::handler(ctx, data, amount)
    }

    pub fn initialize_buy_offer(ctx: Context<IntializeBuyOffer>, data: [u8; 256]) -> Result<()> {
        initalize_buy_offer::handler(ctx, data)
    }

    pub fn initialize_sell_intent(
        ctx: Context<InitializeSellIntent>,
        offer_id: u64,
        amount: u64,
        data: [u8; 256],
    ) -> Result<()> {
        initialize_sell_intent::handler(ctx, offer_id, amount, data)
    }

    pub fn initalize_buy_intent(
        ctx: Context<InitializeBuyIntent>,
        offer_id: u64,
        amount: u64,
        data: [u8; 256],
    ) -> Result<()> {
        initalize_buy_intent::handler(ctx, offer_id, amount, data)
    }

    pub fn cancel_sell_intent(
        ctx: Context<CancelSellIntent>,
        intent_id: u64,
        offer_id: u64,
    ) -> Result<()> {
        cancel_sell_intent::handler(ctx, intent_id, offer_id)
    }

    pub fn cancel_buy_intent(
        ctx: Context<CancelBuyIntent>,
        intent_id: u64,
        offer_id: u64,
    ) -> Result<()> {
        cancel_buy_intent::handler(ctx, intent_id, offer_id)
    }

    pub fn confirm_sell_intent(
        ctx: Context<ConfirmSellIntent>,
        intent_id: u64,
        offer_id: u64,
    ) -> Result<()> {
        confirm_sell_intent::handler(ctx, intent_id, offer_id)
    }

    pub fn confirm_buy_intent(
        ctx: Context<ConfirmBuyIntent>,
        intent_id: u64,
        offer_id: u64,
    ) -> Result<()> {
        confirm_buy_intent::handler(ctx, intent_id, offer_id)
    }

    pub fn withdraw_sell_offer(
        ctx: Context<WithdrawSellOffer>,
        offer_id: u64,
        amount: u64,
    ) -> Result<()> {
        withdraw_sell_offer::handler(ctx, offer_id, amount)
    }
}
