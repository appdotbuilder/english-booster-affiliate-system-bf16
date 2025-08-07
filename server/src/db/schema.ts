import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums for PostgreSQL
export const programTypeEnum = pgEnum('program_type', ['online', 'offline_pare', 'rombongan', 'cabang']);
export const commissionTypeEnum = pgEnum('commission_type', ['percentage', 'flat']);
export const userRoleEnum = pgEnum('user_role', ['affiliate', 'admin']);
export const payoutStatusEnum = pgEnum('payout_status', ['pending', 'paid']);
export const registrationStatusEnum = pgEnum('registration_status', ['pending', 'payment_verified']);

// Users table (both affiliates and admin)
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name').notNull(),
  role: userRoleEnum('role').notNull(),
  affiliate_code: text('affiliate_code').unique(), // Only for affiliates, nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Programs table
export const programsTable = pgTable('programs', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: programTypeEnum('type').notNull(),
  fee: numeric('fee', { precision: 12, scale: 2 }).notNull(), // Program fee in rupiah
  commission_rate: numeric('commission_rate', { precision: 10, scale: 2 }).notNull(), // Percentage or flat amount
  commission_type: commissionTypeEnum('commission_type').notNull(),
  description: text('description'), // Nullable
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Registrations table (when someone signs up through affiliate link)
export const registrationsTable = pgTable('registrations', {
  id: serial('id').primaryKey(),
  affiliate_id: integer('affiliate_id').notNull().references(() => usersTable.id),
  program_id: integer('program_id').notNull().references(() => programsTable.id),
  student_name: text('student_name').notNull(),
  student_email: text('student_email').notNull(),
  student_phone: text('student_phone').notNull(),
  status: registrationStatusEnum('status').default('pending').notNull(),
  commission_amount: numeric('commission_amount', { precision: 12, scale: 2 }).notNull(), // Calculated commission
  registration_date: timestamp('registration_date').defaultNow().notNull(),
  payment_verified_at: timestamp('payment_verified_at'), // Nullable - set when admin verifies payment
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Link clicks tracking table
export const linkClicksTable = pgTable('link_clicks', {
  id: serial('id').primaryKey(),
  affiliate_id: integer('affiliate_id').notNull().references(() => usersTable.id),
  ip_address: text('ip_address').notNull(),
  user_agent: text('user_agent'), // Nullable
  clicked_at: timestamp('clicked_at').defaultNow().notNull(),
});

// Payout requests table
export const payoutRequestsTable = pgTable('payout_requests', {
  id: serial('id').primaryKey(),
  affiliate_id: integer('affiliate_id').notNull().references(() => usersTable.id),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  bank_name: text('bank_name').notNull(),
  account_number: text('account_number').notNull(),
  account_holder_name: text('account_holder_name').notNull(),
  status: payoutStatusEnum('status').default('pending').notNull(),
  requested_at: timestamp('requested_at').defaultNow().notNull(),
  processed_at: timestamp('processed_at'), // Nullable - set when admin processes
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  registrations: many(registrationsTable),
  linkClicks: many(linkClicksTable),
  payoutRequests: many(payoutRequestsTable),
}));

export const programsRelations = relations(programsTable, ({ many }) => ({
  registrations: many(registrationsTable),
}));

export const registrationsRelations = relations(registrationsTable, ({ one }) => ({
  affiliate: one(usersTable, {
    fields: [registrationsTable.affiliate_id],
    references: [usersTable.id],
  }),
  program: one(programsTable, {
    fields: [registrationsTable.program_id],
    references: [programsTable.id],
  }),
}));

export const linkClicksRelations = relations(linkClicksTable, ({ one }) => ({
  affiliate: one(usersTable, {
    fields: [linkClicksTable.affiliate_id],
    references: [usersTable.id],
  }),
}));

export const payoutRequestsRelations = relations(payoutRequestsTable, ({ one }) => ({
  affiliate: one(usersTable, {
    fields: [payoutRequestsTable.affiliate_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Program = typeof programsTable.$inferSelect;
export type NewProgram = typeof programsTable.$inferInsert;
export type Registration = typeof registrationsTable.$inferSelect;
export type NewRegistration = typeof registrationsTable.$inferInsert;
export type LinkClick = typeof linkClicksTable.$inferSelect;
export type NewLinkClick = typeof linkClicksTable.$inferInsert;
export type PayoutRequest = typeof payoutRequestsTable.$inferSelect;
export type NewPayoutRequest = typeof payoutRequestsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  programs: programsTable,
  registrations: registrationsTable,
  linkClicks: linkClicksTable,
  payoutRequests: payoutRequestsTable,
};

export const tableRelations = {
  usersRelations,
  programsRelations,
  registrationsRelations,
  linkClicksRelations,
  payoutRequestsRelations,
};