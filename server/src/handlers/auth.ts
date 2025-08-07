import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

// Simple password hashing function (in production, use bcrypt or similar)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate unique affiliate code
function generateAffiliateCode(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `AFF${timestamp}${random}`.toUpperCase();
}

export async function registerUser(input: CreateUserInput): Promise<User> {
  try {
    // Check if email already exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .limit(1)
      .execute();

    if (existingUser.length > 0) {
      throw new Error('Email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Generate affiliate code if role is affiliate
    let affiliateCode: string | null = null;
    if (input.role === 'affiliate') {
      let isUnique = false;
      while (!isUnique) {
        affiliateCode = generateAffiliateCode();
        const existingCode = await db.select()
          .from(usersTable)
          .where(eq(usersTable.affiliate_code, affiliateCode))
          .limit(1)
          .execute();
        isUnique = existingCode.length === 0;
      }
    }

    // Create user record
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        password_hash: passwordHash,
        full_name: input.full_name,
        role: input.role,
        affiliate_code: affiliateCode
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
}

export async function loginUser(input: LoginInput): Promise<User> {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .limit(1)
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // Verify password
    const hashedInput = await hashPassword(input.password);
    if (hashedInput !== user.password_hash) {
      throw new Error('Invalid email or password');
    }

    return user;
  } catch (error) {
    console.error('User login failed:', error);
    throw error;
  }
}