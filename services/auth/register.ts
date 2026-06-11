import bcrypt from "bcryptjs"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { registerSchema } from "@/lib/validations/auth"
import { provisionTenant } from "@/lib/corsair/tenant"

export async function registerUser(input: unknown) {
  const parsed = registerSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, status: 400, error: parsed.error.flatten() }
  }

  const { email, password, name } = parsed.data

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (existing.length) {
    return { ok: false, status: 409, error: "DUPLICATE_EMAIL" }
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const userId = crypto.randomUUID()

  const user = await db.insert(users).values({
    id: userId,
    email,
    password: passwordHash,
    name,
    emailVerified: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning({
    id: users.id,
    email: users.email,
    name: users.name,
    createdAt: users.createdAt,
  })

  try {
    await provisionTenant(userId)
  } catch (error) {
    console.error("Tenant provision failed:", error)
  }

  return { ok: true, status: 201, user: user[0] }
}
