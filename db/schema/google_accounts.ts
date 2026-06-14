import { pgTable, text, uuid, timestamp, integer } from 'drizzle-orm/pg-core'
import { users } from './users'

export const googleAccounts = pgTable('google_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  tokenExpiry: integer('token_expiry'), // unix timestamp in seconds
  scopes: text('scopes'),
  connectedAt: timestamp('connected_at', { withTimezone: true }).defaultNow().notNull(),
})

export type GoogleAccount = typeof googleAccounts.$inferSelect
export type NewGoogleAccount = typeof googleAccounts.$inferInsert
