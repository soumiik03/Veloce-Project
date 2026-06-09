import { pgTable, text, uuid, timestamp, boolean } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id:               uuid().defaultRandom().primaryKey(),
  email:            text().unique().notNull(),
  emailVerified:    timestamp({ withTimezone: true }),          // required by NextAuth Google
  password:         text(),                                     // null for OAuth-only users
  name:             text(),
  image:            text(),                                     // Google profile picture
  corsairTenantId:  text().unique(),                            // set on user creation
  createdAt:        timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt:        timestamp({ withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
