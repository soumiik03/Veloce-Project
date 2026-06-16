import { pgTable, text, uuid, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'

export const commitments = pgTable('commitments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  promise: text('promise').notNull(),
  deadline: timestamp('deadline', { withTimezone: true }).notNull(),
  status: text('status').default('pending').notNull(),
  priority: text('priority').default('medium').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Commitment = typeof commitments.$inferSelect
export type NewCommitment = typeof commitments.$inferInsert
