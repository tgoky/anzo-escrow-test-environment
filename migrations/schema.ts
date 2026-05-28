import { pgTable, unique, serial, text, foreignKey, numeric, timestamp, integer, boolean, json } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const users = pgTable("users", {
        id: serial().primaryKey().notNull(),
        username: text().notNull(),
        password: text().notNull(),
}, (table) => [
        unique("users_username_unique").on(table.username),
]);

export const transactions = pgTable("transactions", {
        id: serial().primaryKey().notNull(),
        type: text().notNull(),
        status: text().default('pending').notNull(),
        amount: numeric({ precision: 18, scale:  8 }).notNull(),
        usdAmount: numeric("usd_amount", { precision: 10, scale:  2 }).notNull(),
        token: text().notNull(),
        walletAddress: text("wallet_address").notNull(),
        counterpartyAddress: text("counterparty_address"),
        bankAccountId: text("bank_account_id"),
        bankName: text("bank_name"),
        bankAccountMask: text("bank_account_mask"),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
        timeoutAt: timestamp("timeout_at", { mode: 'string' }),
        failureReason: text("failure_reason"),
        makerId: integer("maker_id"),
        offerId: integer("offer_id"),
}, (table) => [
        foreignKey({
                        columns: [table.makerId],
                        foreignColumns: [makers.id],
                        name: "transactions_maker_id_makers_id_fk"
                }),
        foreignKey({
                        columns: [table.offerId],
                        foreignColumns: [offers.id],
                        name: "transactions_offer_id_offers_id_fk"
                }),
]);

export const makerPricing = pgTable("maker_pricing", {
        id: serial().primaryKey().notNull(),
        makerId: integer("maker_id").notNull(),
        token: text().notNull(),
        markup: numeric({ precision: 5, scale:  2 }).notNull(),
        isActive: boolean("is_active").default(true).notNull(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        foreignKey({
                        columns: [table.makerId],
                        foreignColumns: [makers.id],
                        name: "maker_pricing_maker_id_makers_id_fk"
                }),
]);

export const makers = pgTable("makers", {
        id: serial().primaryKey().notNull(),
        walletAddress: text("wallet_address").notNull(),
        isActive: boolean("is_active").default(true).notNull(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        unique("makers_wallet_address_unique").on(table.walletAddress),
]);

export const makerPaymentInstructions = pgTable("maker_payment_instructions", {
        id: serial().primaryKey().notNull(),
        makerId: integer("maker_id").notNull(),
        instructions: text().notNull(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
        foreignKey({
                        columns: [table.makerId],
                        foreignColumns: [makers.id],
                        name: "maker_payment_instructions_maker_id_makers_id_fk"
                }),
]);

export const offers = pgTable("offers", {
        id: serial().primaryKey().notNull(),
        makerId: integer("maker_id"),
        type: text().notNull(),
        token: text().notNull(),
        amount: numeric({ precision: 18, scale:  8 }).notNull(),
        price: numeric({ precision: 10, scale:  2 }).notNull(),
        paymentMethods: text("payment_methods").array().notNull(),
        status: text().default('active').notNull(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
        walletAddress: text("wallet_address").notNull(),
        fiatCurrency: text("fiat_currency").default('USD').notNull(),
        priceType: text("price_type").default('fixed').notNull(),
        priceMargin: numeric({ precision: 6, scale: 2 }),
        minOrderAmount: numeric("min_order_amount", { precision: 10, scale: 2 }),
        maxOrderAmount: numeric("max_order_amount", { precision: 10, scale: 2 }),
        paymentTimeLimit: integer("payment_time_limit").default(15),
        remarks: text("remarks"),
        autoReply: text("auto_reply"),
        availableRegions: text("available_regions").array(),
        counterpartyConditions: json("counterparty_conditions"),
        visibility: text("visibility").default('public').notNull(),
}, (table) => [
        foreignKey({
                        columns: [table.makerId],
                        foreignColumns: [makers.id],
                        name: "offers_maker_id_makers_id_fk"
                }),
]);
