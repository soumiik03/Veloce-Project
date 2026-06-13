import { pgTable, text, uuid, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'

export const agent_messages = pgTable('agent_messages', {
  id:          uuid().defaultRandom().primaryKey(),
  userId:      uuid().notNull().references(() => users.id, { onDelete: 'cascade' }),
  threadId:    text().notNull(),
  threadTitle: text().default('New conversation'),
  role:        text().notNull(),
  content:     text().notNull(),
  createdAt:   timestamp({ withTimezone: true }).defaultNow().notNull(),
})

export type AgentMessage = typeof agent_messages.$inferSelect

