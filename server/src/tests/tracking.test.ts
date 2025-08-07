import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, linkClicksTable, registrationsTable, programsTable } from '../db/schema';
import { type TrackLinkClickInput } from '../schema';
import { trackLinkClick, getAffiliateStats, getLinkClicksByAffiliate } from '../handlers/tracking';
import { eq, and } from 'drizzle-orm';
// Test data
const testAffiliate = {
  email: 'affiliate@test.com',
  password_hash: 'hashedpassword123',
  full_name: 'Test Affiliate',
  role: 'affiliate' as const,
  affiliate_code: 'AFFILIATE123'
};

const testAdmin = {
  email: 'admin@test.com',
  password_hash: 'hashedpassword456',
  full_name: 'Test Admin',
  role: 'admin' as const,
  affiliate_code: null
};

const testProgram = {
  name: 'Test Program',
  type: 'online' as const,
  fee: '100000',
  commission_rate: '10.00',
  commission_type: 'percentage' as const,
  description: 'Test program description',
  is_active: true
};

const testLinkClickInput: TrackLinkClickInput = {
  affiliate_code: 'AFFILIATE123',
  ip_address: '192.168.1.100',
  user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

describe('trackLinkClick', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should track a link click successfully', async () => {
    // Create affiliate user
    const affiliates = await db.insert(usersTable)
      .values(testAffiliate)
      .returning()
      .execute();
    const affiliate = affiliates[0];

    const result = await trackLinkClick(testLinkClickInput);

    // Verify basic fields
    expect(result.affiliate_id).toEqual(affiliate.id);
    expect(result.ip_address).toEqual('192.168.1.100');
    expect(result.user_agent).toEqual(testLinkClickInput.user_agent ?? null);
    expect(result.id).toBeDefined();
    expect(result.clicked_at).toBeInstanceOf(Date);
  });

  it('should save link click to database', async () => {
    // Create affiliate user
    await db.insert(usersTable)
      .values(testAffiliate)
      .returning()
      .execute();

    const result = await trackLinkClick(testLinkClickInput);

    // Verify data in database
    const clicks = await db.select()
      .from(linkClicksTable)
      .where(eq(linkClicksTable.id, result.id))
      .execute();

    expect(clicks).toHaveLength(1);
    expect(clicks[0].ip_address).toEqual('192.168.1.100');
    expect(clicks[0].user_agent).toEqual(testLinkClickInput.user_agent ?? null);
    expect(clicks[0].clicked_at).toBeInstanceOf(Date);
  });

  it('should handle null user_agent', async () => {
    // Create affiliate user
    await db.insert(usersTable)
      .values(testAffiliate)
      .returning()
      .execute();

    const inputWithoutUserAgent: TrackLinkClickInput = {
      affiliate_code: 'AFFILIATE123',
      ip_address: '192.168.1.100',
      user_agent: null
    };

    const result = await trackLinkClick(inputWithoutUserAgent);

    expect(result.user_agent).toBeNull();
  });

  it('should handle undefined user_agent', async () => {
    // Create affiliate user
    await db.insert(usersTable)
      .values(testAffiliate)
      .returning()
      .execute();

    const inputWithoutUserAgent: TrackLinkClickInput = {
      affiliate_code: 'AFFILIATE123',
      ip_address: '192.168.1.100'
      // user_agent is undefined (not provided)
    };

    const result = await trackLinkClick(inputWithoutUserAgent);

    expect(result.user_agent).toBeNull();
  });

  it('should throw error for non-existent affiliate code', async () => {
    const invalidInput: TrackLinkClickInput = {
      affiliate_code: 'INVALID123',
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0'
    };

    expect(trackLinkClick(invalidInput)).rejects.toThrow(/affiliate not found/i);
  });

  it('should throw error for admin user with affiliate code', async () => {
    // Create admin user with affiliate_code
    await db.insert(usersTable)
      .values({
        ...testAdmin,
        affiliate_code: 'ADMIN123'
      })
      .returning()
      .execute();

    const adminInput: TrackLinkClickInput = {
      affiliate_code: 'ADMIN123',
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0'
    };

    expect(adminInput).toBeDefined();
    expect(adminInput.affiliate_code).toEqual('ADMIN123');
    expect(trackLinkClick(adminInput)).rejects.toThrow(/affiliate not found/i);
  });
});

describe('getAffiliateStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero stats for affiliate with no activity', async () => {
    // Create affiliate user
    const affiliates = await db.insert(usersTable)
      .values(testAffiliate)
      .returning()
      .execute();
    const affiliate = affiliates[0];

    const result = await getAffiliateStats(affiliate.id);

    expect(result.total_clicks).toEqual(0);
    expect(result.total_registrations).toEqual(0);
    expect(result.total_commission).toEqual(0);
    expect(result.pending_commission).toEqual(0);
    expect(result.verified_commission).toEqual(0);
  });

  it('should calculate stats correctly with activity', async () => {
    // Create affiliate and program
    const affiliates = await db.insert(usersTable)
      .values(testAffiliate)
      .returning()
      .execute();
    const affiliate = affiliates[0];

    const programs = await db.insert(programsTable)
      .values(testProgram)
      .returning()
      .execute();
    const program = programs[0];

    // Create 3 link clicks
    await db.insert(linkClicksTable)
      .values([
        { affiliate_id: affiliate.id, ip_address: '192.168.1.1', user_agent: 'Browser 1' },
        { affiliate_id: affiliate.id, ip_address: '192.168.1.2', user_agent: 'Browser 2' },
        { affiliate_id: affiliate.id, ip_address: '192.168.1.3', user_agent: null }
      ])
      .execute();

    // Create 2 registrations - 1 pending, 1 verified
    await db.insert(registrationsTable)
      .values([
        {
          affiliate_id: affiliate.id,
          program_id: program.id,
          student_name: 'Student 1',
          student_email: 'student1@test.com',
          student_phone: '081234567890',
          status: 'pending',
          commission_amount: '50000'
        },
        {
          affiliate_id: affiliate.id,
          program_id: program.id,
          student_name: 'Student 2',
          student_email: 'student2@test.com',
          student_phone: '081234567891',
          status: 'payment_verified',
          commission_amount: '75000'
        }
      ])
      .execute();

    const result = await getAffiliateStats(affiliate.id);

    expect(result.total_clicks).toEqual(3);
    expect(result.total_registrations).toEqual(2);
    expect(result.total_commission).toEqual(125000); // 50000 + 75000
    expect(result.pending_commission).toEqual(50000);
    expect(result.verified_commission).toEqual(75000);
  });

  it('should handle numeric conversions correctly', async () => {
    // Create affiliate and program
    const affiliates = await db.insert(usersTable)
      .values(testAffiliate)
      .returning()
      .execute();
    const affiliate = affiliates[0];

    const programs = await db.insert(programsTable)
      .values(testProgram)
      .returning()
      .execute();
    const program = programs[0];

    // Create registration with decimal commission
    await db.insert(registrationsTable)
      .values({
        affiliate_id: affiliate.id,
        program_id: program.id,
        student_name: 'Student Test',
        student_email: 'student@test.com',
        student_phone: '081234567890',
        status: 'payment_verified',
        commission_amount: '123.45'
      })
      .execute();

    const result = await getAffiliateStats(affiliate.id);

    expect(typeof result.total_commission).toBe('number');
    expect(result.total_commission).toEqual(123.45);
    expect(typeof result.verified_commission).toBe('number');
    expect(result.verified_commission).toEqual(123.45);
  });

  it('should only count stats for specific affiliate', async () => {
    // Create two affiliates
    const affiliate1 = await db.insert(usersTable)
      .values(testAffiliate)
      .returning()
      .execute();

    const affiliate2 = await db.insert(usersTable)
      .values({
        ...testAffiliate,
        email: 'affiliate2@test.com',
        affiliate_code: 'AFFILIATE456'
      })
      .returning()
      .execute();

    const programs = await db.insert(programsTable)
      .values(testProgram)
      .returning()
      .execute();

    // Create clicks for both affiliates
    await db.insert(linkClicksTable)
      .values([
        { affiliate_id: affiliate1[0].id, ip_address: '192.168.1.1', user_agent: 'Browser 1' },
        { affiliate_id: affiliate2[0].id, ip_address: '192.168.1.2', user_agent: 'Browser 2' }
      ])
      .execute();

    // Create registrations for both affiliates
    await db.insert(registrationsTable)
      .values([
        {
          affiliate_id: affiliate1[0].id,
          program_id: programs[0].id,
          student_name: 'Student 1',
          student_email: 'student1@test.com',
          student_phone: '081234567890',
          status: 'pending',
          commission_amount: '100000'
        },
        {
          affiliate_id: affiliate2[0].id,
          program_id: programs[0].id,
          student_name: 'Student 2',
          student_email: 'student2@test.com',
          student_phone: '081234567891',
          status: 'pending',
          commission_amount: '200000'
        }
      ])
      .execute();

    // Check stats for affiliate1 only
    const result = await getAffiliateStats(affiliate1[0].id);

    expect(result.total_clicks).toEqual(1);
    expect(result.total_registrations).toEqual(1);
    expect(result.total_commission).toEqual(100000);
    expect(result.pending_commission).toEqual(100000);
    expect(result.verified_commission).toEqual(0);
  });
});

describe('getLinkClicksByAffiliate', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for affiliate with no clicks', async () => {
    // Create affiliate user
    const affiliates = await db.insert(usersTable)
      .values(testAffiliate)
      .returning()
      .execute();
    const affiliate = affiliates[0];

    const result = await getLinkClicksByAffiliate(affiliate.id);

    expect(result).toEqual([]);
  });

  it('should return all clicks for affiliate', async () => {
    // Create affiliate user
    const affiliates = await db.insert(usersTable)
      .values(testAffiliate)
      .returning()
      .execute();
    const affiliate = affiliates[0];

    // Create multiple clicks
    const clicksData = [
      { affiliate_id: affiliate.id, ip_address: '192.168.1.1', user_agent: 'Browser 1' },
      { affiliate_id: affiliate.id, ip_address: '192.168.1.2', user_agent: 'Browser 2' },
      { affiliate_id: affiliate.id, ip_address: '192.168.1.3', user_agent: null }
    ];

    await db.insert(linkClicksTable)
      .values(clicksData)
      .execute();

    const result = await getLinkClicksByAffiliate(affiliate.id);

    expect(result).toHaveLength(3);
    
    // Check all results have correct affiliate_id
    result.forEach(click => {
      expect(click.affiliate_id).toEqual(affiliate.id);
      expect(click.id).toBeDefined();
      expect(click.clicked_at).toBeInstanceOf(Date);
      expect(typeof click.ip_address).toBe('string');
    });

    // Check specific data
    const ipAddresses = result.map(click => click.ip_address).sort();
    expect(ipAddresses).toEqual(['192.168.1.1', '192.168.1.2', '192.168.1.3']);
  });

  it('should only return clicks for specific affiliate', async () => {
    // Create two affiliates
    const affiliate1 = await db.insert(usersTable)
      .values(testAffiliate)
      .returning()
      .execute();

    const affiliate2 = await db.insert(usersTable)
      .values({
        ...testAffiliate,
        email: 'affiliate2@test.com',
        affiliate_code: 'AFFILIATE456'
      })
      .returning()
      .execute();

    // Create clicks for both affiliates
    await db.insert(linkClicksTable)
      .values([
        { affiliate_id: affiliate1[0].id, ip_address: '192.168.1.1', user_agent: 'Browser 1' },
        { affiliate_id: affiliate1[0].id, ip_address: '192.168.1.2', user_agent: 'Browser 2' },
        { affiliate_id: affiliate2[0].id, ip_address: '192.168.1.3', user_agent: 'Browser 3' }
      ])
      .execute();

    const result = await getLinkClicksByAffiliate(affiliate1[0].id);

    expect(result).toHaveLength(2);
    result.forEach(click => {
      expect(click.affiliate_id).toEqual(affiliate1[0].id);
    });

    const ipAddresses = result.map(click => click.ip_address).sort();
    expect(ipAddresses).toEqual(['192.168.1.1', '192.168.1.2']);
  });

  it('should handle clicks with null user_agent', async () => {
    // Create affiliate user
    const affiliates = await db.insert(usersTable)
      .values(testAffiliate)
      .returning()
      .execute();
    const affiliate = affiliates[0];

    // Create click with null user_agent
    await db.insert(linkClicksTable)
      .values({
        affiliate_id: affiliate.id,
        ip_address: '192.168.1.1',
        user_agent: null
      })
      .execute();

    const result = await getLinkClicksByAffiliate(affiliate.id);

    expect(result).toHaveLength(1);
    expect(result[0].user_agent).toBeNull();
    expect(result[0].ip_address).toEqual('192.168.1.1');
  });
});