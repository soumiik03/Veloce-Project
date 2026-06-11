import { pgTable, text, uuid, timestamp, integer } from 'drizzle-orm/pg-core'
import { users } from './users'

export const accounts = pgTable('accounts', {
  id:                uuid().defaultRandom().primaryKey(),
  userId:            uuid().notNull().references(() => users.id, { onDelete: 'cascade' }),
  type:              text().notNull(),                          // "oauth" | "oidc" | "email"
  provider:          text().notNull(),                          // "google" | "github" etc
  providerAccountId: text().notNull(),                          // Google's sub (user ID)
  refresh_token:     text(),
  access_token:      text(),
  expires_at:        integer(),                                 // unix timestamp seconds
  token_type:        text(),
  scope:             text(),
  id_token:          text(),
  session_state:     text(),
  createdAt:         timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt:         timestamp({ withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
})

export type Account = typeof accounts.$inferSelect
export type NewAccount = typeof accounts.$inferInsert

