import { relations } from "drizzle-orm/relations";
import { makers, transactions, offers, makerPricing, makerPaymentInstructions } from "./schema";
import { financialAccounts, paymentMethods } from "../shared/schema";

export const transactionsRelations = relations(transactions, ({one}) => ({
        maker: one(makers, {
                fields: [transactions.makerId],
                references: [makers.id]
        }),
        offer: one(offers, {
                fields: [transactions.offerId],
                references: [offers.id]
        }),
}));

export const makersRelations = relations(makers, ({many}) => ({
        transactions: many(transactions),
        makerPricings: many(makerPricing),
        makerPaymentInstructions: many(makerPaymentInstructions),
        offers: many(offers),
}));

export const offersRelations = relations(offers, ({one, many}) => ({
        transactions: many(transactions),
        maker: one(makers, {
                fields: [offers.makerId],
                references: [makers.id]
        }),
}));

export const makerPricingRelations = relations(makerPricing, ({one}) => ({
        maker: one(makers, {
                fields: [makerPricing.makerId],
                references: [makers.id]
        }),
}));

export const makerPaymentInstructionsRelations = relations(makerPaymentInstructions, ({one}) => ({
        maker: one(makers, {
                fields: [makerPaymentInstructions.makerId],
                references: [makers.id]
        }),
}));

// Relation between financial accounts and payment methods
export const financialAccountsRelations = relations(financialAccounts, ({one}) => ({
        paymentMethod: one(paymentMethods, {
                fields: [financialAccounts.paymentMethodId],
                references: [paymentMethods.id]
        }),
}));

// Relation between payment methods and financial accounts (reverse)
export const paymentMethodsRelations = relations(paymentMethods, ({many}) => ({
        financialAccounts: many(financialAccounts),
}));