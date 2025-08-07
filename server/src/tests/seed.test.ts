import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { programsTable, usersTable } from '../db/schema';
import { seedPrograms, createAdminUser } from '../handlers/seed';
import { eq } from 'drizzle-orm';

describe('seedPrograms', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create all 30 programs', async () => {
    const result = await seedPrograms();

    expect(result).toHaveLength(30);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should save programs to database with correct types', async () => {
    await seedPrograms();

    const programs = await db.select()
      .from(programsTable)
      .execute();

    expect(programs).toHaveLength(30);
    
    // Test first program (Online Kids)
    const onlineKids = programs.find(p => p.name === 'Online Kids');
    expect(onlineKids).toBeDefined();
    expect(onlineKids!.type).toBe('online');
    expect(parseFloat(onlineKids!.fee)).toBe(1500000);
    expect(parseFloat(onlineKids!.commission_rate)).toBe(10);
    expect(onlineKids!.commission_type).toBe('percentage');
    expect(onlineKids!.is_active).toBe(true);
    expect(onlineKids!.description).toContain('Online Kids program offered by English Booster');
  });

  it('should create programs with correct commission structures', async () => {
    await seedPrograms();

    const programs = await db.select()
      .from(programsTable)
      .execute();

    // Test online programs (10% commission)
    const onlinePrograms = programs.filter(p => p.type === 'online');
    expect(onlinePrograms).toHaveLength(8);
    onlinePrograms.forEach(program => {
      expect(parseFloat(program.commission_rate)).toBe(10);
      expect(program.commission_type).toBe('percentage');
    });

    // Test offline_pare programs (7% commission)
    const parePrograms = programs.filter(p => p.type === 'offline_pare');
    expect(parePrograms).toHaveLength(7);
    parePrograms.forEach(program => {
      expect(parseFloat(program.commission_rate)).toBe(7);
      expect(program.commission_type).toBe('percentage');
    });

    // Test rombongan programs (flat Rp100,000 commission)
    const rombonganPrograms = programs.filter(p => p.type === 'rombongan');
    expect(rombonganPrograms).toHaveLength(3);
    rombonganPrograms.forEach(program => {
      expect(parseFloat(program.commission_rate)).toBe(100000);
      expect(program.commission_type).toBe('flat');
    });

    // Test cabang programs (5% commission)
    const cabangPrograms = programs.filter(p => p.type === 'cabang');
    expect(cabangPrograms).toHaveLength(12);
    cabangPrograms.forEach(program => {
      expect(parseFloat(program.commission_rate)).toBe(5);
      expect(program.commission_type).toBe('percentage');
    });
  });

  it('should return programs with numeric types converted correctly', async () => {
    const result = await seedPrograms();

    // Verify numeric fields are returned as numbers, not strings
    result.forEach(program => {
      expect(typeof program.fee).toBe('number');
      expect(typeof program.commission_rate).toBe('number');
      expect(program.fee).toBeGreaterThan(0);
      expect(program.commission_rate).toBeGreaterThan(0);
    });
  });

  it('should include programs from all locations', async () => {
    await seedPrograms();

    const programs = await db.select()
      .from(programsTable)
      .execute();

    // Check for Malang programs
    const malangPrograms = programs.filter(p => p.name.includes('Malang'));
    expect(malangPrograms).toHaveLength(4);

    // Check for Sidoarjo programs
    const sidoarjoPrograms = programs.filter(p => p.name.includes('Sidoarjo'));
    expect(sidoarjoPrograms).toHaveLength(4);

    // Check for Nganjuk programs
    const nganjukPrograms = programs.filter(p => p.name.includes('Nganjuk'));
    expect(nganjukPrograms).toHaveLength(4);
  });
});

describe('createAdminUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create admin user', async () => {
    const result = await createAdminUser();

    expect(result.email).toBe('admin@englishbooster.com');
    expect(result.full_name).toBe('English Booster Admin');
    expect(result.role).toBe('admin');
    expect(result.affiliate_code).toBeNull();
    expect(result.password_hash).toBe('admin123'); // In production, this would be hashed
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save admin user to database', async () => {
    const result = await createAdminUser();

    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('admin@englishbooster.com');
    expect(users[0].role).toBe('admin');
    expect(users[0].affiliate_code).toBeNull();
  });

  it('should return existing admin user if already exists', async () => {
    // Create admin user first time
    const firstResult = await createAdminUser();

    // Try to create again
    const secondResult = await createAdminUser();

    // Should return the same user
    expect(secondResult.id).toBe(firstResult.id);
    expect(secondResult.email).toBe(firstResult.email);

    // Verify only one admin exists in database
    const allAdmins = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, 'admin@englishbooster.com'))
      .execute();

    expect(allAdmins).toHaveLength(1);
  });

  it('should create admin user with correct role and no affiliate code', async () => {
    const result = await createAdminUser();

    // Verify admin role
    expect(result.role).toBe('admin');
    
    // Verify no affiliate code (only affiliates have codes)
    expect(result.affiliate_code).toBeNull();
    
    // Verify proper email format
    expect(result.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });
});