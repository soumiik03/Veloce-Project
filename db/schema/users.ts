import { pgTable, text, uuid, timestamp, boolean } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: text('clerk_id').unique().notNull(),
  email: text('email').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  morningBriefingEnabled: boolean('morning_briefing_enabled').default(true).notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
