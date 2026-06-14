import { pgTable, boolean, uuid, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'

export const onboardingStatus = pgTable('onboarding_status', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  connectedGmail: boolean('connected_gmail').default(false).notNull(),
  connectedCalendar: boolean('connected_calendar').default(false).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
})

export type OnboardingStatus = typeof onboardingStatus.$inferSelect
export type NewOnboardingStatus = typeof onboardingStatus.$inferInsert
