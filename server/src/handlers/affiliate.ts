import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type User } from '../schema';

export async function getAffiliateByCode(affiliateCode: string): Promise<User | null> {
  try {
    const results = await db.select()
      .from(usersTable)
      .where(eq(usersTable.affiliate_code, affiliateCode))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const affiliate = results[0];
    return {
      ...affiliate,
      created_at: new Date(affiliate.created_at),
      updated_at: new Date(affiliate.updated_at)
    };
  } catch (error) {
    console.error('Failed to get affiliate by code:', error);
    throw error;
  }
}

export async function getAllAffiliates(): Promise<User[]> {
  try {
    const results = await db.select()
      .from(usersTable)
      .where(eq(usersTable.role, 'affiliate'))
      .execute();

    return results.map(user => ({
      ...user,
      created_at: new Date(user.created_at),
      updated_at: new Date(user.updated_at)
    }));
  } catch (error) {
    console.error('Failed to get all affiliates:', error);
    throw error;
  }
}

export async function generateUniqueAffiliateCode(): Promise<string> {
  try {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      // Generate a random 8-character alphanumeric code (AFF + 5 chars)
      const code = 'AFF' + Math.random().toString(36).substring(2, 7).toUpperCase();
      
      // Check if this code already exists
      const existing = await db.select()
        .from(usersTable)
        .where(eq(usersTable.affiliate_code, code))
        .execute();

      if (existing.length === 0) {
        return code;
      }

      attempts++;
    }

    // If we can't generate a unique code after max attempts, use timestamp
    const timestamp = Date.now().toString().slice(-6);
    return `AFF${timestamp}`;
  } catch (error) {
    console.error('Failed to generate unique affiliate code:', error);
    throw error;
  }
}