import { serial, text, pgTable, timestamp, numeric, integer, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Distributors table
export const distributorsTable = pgTable('distributors', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  referrerId: integer('referrer_id'), // Nullable by default for top-level distributors
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    referrerIdIdx: index('distributors_referrer_id_idx').on(table.referrerId),
  };
});

// Sales table
export const salesTable = pgTable('sales', {
  id: serial('id').primaryKey(),
  distributorId: integer('distributor_id').notNull(),
  productName: text('product_name').notNull(),
  quantity: integer('quantity').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(), // Use numeric for monetary values
  date: timestamp('date').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    distributorIdIdx: index('sales_distributor_id_idx').on(table.distributorId),
    dateIdx: index('sales_date_idx').on(table.date),
  };
});

// Define relations between tables
export const distributorsRelations = relations(distributorsTable, ({ one, many }) => ({
  // Self-referencing relationship for referrer
  referrer: one(distributorsTable, {
    fields: [distributorsTable.referrerId],
    references: [distributorsTable.id],
    relationName: 'referrer'
  }),
  // One-to-many relationship for referred distributors (downline)
  referredDistributors: many(distributorsTable, {
    relationName: 'referrer'
  }),
  // One-to-many relationship for sales
  sales: many(salesTable),
}));

export const salesRelations = relations(salesTable, ({ one }) => ({
  // Many-to-one relationship with distributor
  distributor: one(distributorsTable, {
    fields: [salesTable.distributorId],
    references: [distributorsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type Distributor = typeof distributorsTable.$inferSelect; // For SELECT operations
export type NewDistributor = typeof distributorsTable.$inferInsert; // For INSERT operations

export type Sale = typeof salesTable.$inferSelect; // For SELECT operations
export type NewSale = typeof salesTable.$inferInsert; // For INSERT operations

// Export all tables and relations for proper query building
export const tables = { 
  distributors: distributorsTable, 
  sales: salesTable 
};

export const tableRelations = {
  distributorsRelations,
  salesRelations
};