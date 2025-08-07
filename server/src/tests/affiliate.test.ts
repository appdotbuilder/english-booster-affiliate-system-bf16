import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getAffiliateByCode, getAllAffiliates, generateUniqueAffiliateCode } from '../handlers/affiliate';

// Test data
const affiliateUser1 = {
  email: 'affiliate1@example.com',
  password_hash: 'hashed_password_1',
  full_name: 'John Affiliate',
  role: 'affiliate' as const,
  affiliate_code: 'AFF123'
};

const affiliateUser2 = {
  email: 'affiliate2@example.com',
  password_hash: 'hashed_password_2',
  full_name: 'Jane Affiliate',
  role: 'affiliate' as const,
  affiliate_code: 'AFF456'
};

const adminUser = {
  email: 'admin@example.com',
  password_hash: 'hashed_password_admin',
  full_name: 'Admin User',
  role: 'admin' as const,
  affiliate_code: null
};

describe('Affiliate Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('getAffiliateByCode', () => {
    it('should return affiliate by code', async () => {
      // Create test affiliate
      await db.insert(usersTable).values(affiliateUser1).execute();

      const result = await getAffiliateByCode('AFF123');

      expect(result).toBeDefined();
      expect(result!.email).toEqual('affiliate1@example.com');
      expect(result!.full_name).toEqual('John Affiliate');
      expect(result!.role).toEqual('affiliate');
      expect(result!.affiliate_code).toEqual('AFF123');
      expect(result!.id).toBeDefined();
      expect(result!.created_at).toBeInstanceOf(Date);
      expect(result!.updated_at).toBeInstanceOf(Date);
    });

    it('should return null for non-existent affiliate code', async () => {
      const result = await getAffiliateByCode('NONEXISTENT');

      expect(result).toBeNull();
    });

    it('should return null for empty affiliate code', async () => {
      const result = await getAffiliateByCode('');

      expect(result).toBeNull();
    });

    it('should handle case-sensitive affiliate codes', async () => {
      // Create test affiliate
      await db.insert(usersTable).values(affiliateUser1).execute();

      // Test with different case
      const result = await getAffiliateByCode('aff123');

      expect(result).toBeNull();
    });
  });

  describe('getAllAffiliates', () => {
    it('should return all affiliates', async () => {
      // Create test users
      await db.insert(usersTable).values([
        affiliateUser1,
        affiliateUser2,
        adminUser
      ]).execute();

      const result = await getAllAffiliates();

      expect(result).toHaveLength(2);
      expect(result.every(user => user.role === 'affiliate')).toBe(true);
      
      const emails = result.map(user => user.email);
      expect(emails).toContain('affiliate1@example.com');
      expect(emails).toContain('affiliate2@example.com');
      expect(emails).not.toContain('admin@example.com');

      // Verify all fields are present
      result.forEach(affiliate => {
        expect(affiliate.id).toBeDefined();
        expect(affiliate.email).toBeDefined();
        expect(affiliate.full_name).toBeDefined();
        expect(affiliate.role).toEqual('affiliate');
        expect(affiliate.affiliate_code).toBeDefined();
        expect(affiliate.created_at).toBeInstanceOf(Date);
        expect(affiliate.updated_at).toBeInstanceOf(Date);
      });
    });

    it('should return empty array when no affiliates exist', async () => {
      // Create only admin user
      await db.insert(usersTable).values(adminUser).execute();

      const result = await getAllAffiliates();

      expect(result).toHaveLength(0);
    });

    it('should return empty array when no users exist', async () => {
      const result = await getAllAffiliates();

      expect(result).toHaveLength(0);
    });
  });

  describe('generateUniqueAffiliateCode', () => {
    it('should generate a unique affiliate code', async () => {
      const code = await generateUniqueAffiliateCode();

      expect(code).toBeDefined();
      expect(code).toMatch(/^AFF[A-Z0-9]{5}$/); // Should start with AFF followed by 5 alphanumeric chars
      expect(code.length).toEqual(8);
    });

    it('should generate different codes on multiple calls', async () => {
      const code1 = await generateUniqueAffiliateCode();
      const code2 = await generateUniqueAffiliateCode();
      const code3 = await generateUniqueAffiliateCode();

      expect(code1).not.toEqual(code2);
      expect(code2).not.toEqual(code3);
      expect(code1).not.toEqual(code3);
    });

    it('should avoid existing affiliate codes', async () => {
      // Create affiliate with specific code
      await db.insert(usersTable).values({
        ...affiliateUser1,
        affiliate_code: 'AFF123456' // Specific pattern to potentially conflict
      }).execute();

      const newCode = await generateUniqueAffiliateCode();

      expect(newCode).not.toEqual('AFF123456');
      expect(newCode).toMatch(/^AFF[A-Z0-9]{5}$/);

      // Verify the new code doesn't exist in database
      const existingWithNewCode = await db.select()
        .from(usersTable)
        .where(eq(usersTable.affiliate_code, newCode))
        .execute();

      expect(existingWithNewCode).toHaveLength(0);
    });

    it('should generate valid codes that can be used in database', async () => {
      const code = await generateUniqueAffiliateCode();

      // Try to create a user with this code
      const newAffiliate = {
        email: 'test@example.com',
        password_hash: 'hashed',
        full_name: 'Test User',
        role: 'affiliate' as const,
        affiliate_code: code
      };

      await db.insert(usersTable).values(newAffiliate).execute();

      // Verify the user was created successfully
      const created = await db.select()
        .from(usersTable)
        .where(eq(usersTable.affiliate_code, code))
        .execute();

      expect(created).toHaveLength(1);
      expect(created[0].affiliate_code).toEqual(code);
    });

    it('should handle database with many existing codes', async () => {
      // Create multiple affiliates with codes
      const existingAffiliates = [];
      for (let i = 0; i < 5; i++) {
        existingAffiliates.push({
          email: `affiliate${i}@example.com`,
          password_hash: 'hashed',
          full_name: `Affiliate ${i}`,
          role: 'affiliate' as const,
          affiliate_code: `AFF${String(i).padStart(5, '0')}`
        });
      }

      await db.insert(usersTable).values(existingAffiliates).execute();

      // Generate new code - should still work
      const newCode = await generateUniqueAffiliateCode();

      expect(newCode).toBeDefined();
      expect(newCode).toMatch(/^AFF[A-Z0-9]{5}$/);

      // Verify it's not one of the existing codes
      const existingCodes = existingAffiliates.map(a => a.affiliate_code);
      expect(existingCodes).not.toContain(newCode);
    });
  });
});