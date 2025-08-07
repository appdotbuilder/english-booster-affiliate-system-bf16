import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, programsTable, registrationsTable } from '../db/schema';
import { type CreateRegistrationInput, type VerifyPaymentInput } from '../schema';
import { createRegistration, verifyPayment, getAllRegistrations, getRegistrationsByAffiliate } from '../handlers/registrations';
import { eq } from 'drizzle-orm';


describe('registrations handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup
  const setupTestData = async () => {
    // Create test affiliate user
    const affiliateResult = await db.insert(usersTable)
      .values({
        email: 'affiliate@test.com',
        password_hash: 'hashed_password_123', // Simple test hash
        full_name: 'Test Affiliate',
        role: 'affiliate',
        affiliate_code: 'TEST123'
      })
      .returning()
      .execute();

    // Create test program with percentage commission
    const programResult = await db.insert(programsTable)
      .values({
        name: 'Online Course',
        type: 'online',
        fee: '1000000',
        commission_rate: '15',
        commission_type: 'percentage',
        description: 'Test online course',
        is_active: true
      })
      .returning()
      .execute();

    // Create test program with flat commission
    const flatProgramResult = await db.insert(programsTable)
      .values({
        name: 'Offline Course',
        type: 'offline_pare',
        fee: '2000000',
        commission_rate: '250000',
        commission_type: 'flat',
        description: 'Test offline course',
        is_active: true
      })
      .returning()
      .execute();

    // Create inactive program
    const inactiveProgramResult = await db.insert(programsTable)
      .values({
        name: 'Inactive Course',
        type: 'cabang',
        fee: '500000',
        commission_rate: '10',
        commission_type: 'percentage',
        description: 'Inactive course',
        is_active: false
      })
      .returning()
      .execute();

    return {
      affiliate: affiliateResult[0],
      program: programResult[0],
      flatProgram: flatProgramResult[0],
      inactiveProgram: inactiveProgramResult[0]
    };
  };

  describe('createRegistration', () => {
    it('should create registration with percentage commission', async () => {
      const testData = await setupTestData();
      
      const input: CreateRegistrationInput = {
        affiliate_code: 'TEST123',
        program_id: testData.program.id,
        student_name: 'John Doe',
        student_email: 'john@example.com',
        student_phone: '08123456789'
      };

      const result = await createRegistration(input);

      expect(result.affiliate_id).toEqual(testData.affiliate.id);
      expect(result.program_id).toEqual(testData.program.id);
      expect(result.student_name).toEqual('John Doe');
      expect(result.student_email).toEqual('john@example.com');
      expect(result.student_phone).toEqual('08123456789');
      expect(result.status).toEqual('pending');
      expect(typeof result.commission_amount).toBe('number');
      expect(result.commission_amount).toEqual(150000); // 15% of 1,000,000
      expect(result.payment_verified_at).toBeNull();
      expect(result.id).toBeDefined();
      expect(result.registration_date).toBeInstanceOf(Date);
    });

    it('should create registration with flat commission', async () => {
      const testData = await setupTestData();
      
      const input: CreateRegistrationInput = {
        affiliate_code: 'TEST123',
        program_id: testData.flatProgram.id,
        student_name: 'Jane Smith',
        student_email: 'jane@example.com',
        student_phone: '08987654321'
      };

      const result = await createRegistration(input);

      expect(result.affiliate_id).toEqual(testData.affiliate.id);
      expect(result.program_id).toEqual(testData.flatProgram.id);
      expect(result.commission_amount).toEqual(250000); // Flat rate
      expect(typeof result.commission_amount).toBe('number');
    });

    it('should save registration to database', async () => {
      const testData = await setupTestData();
      
      const input: CreateRegistrationInput = {
        affiliate_code: 'TEST123',
        program_id: testData.program.id,
        student_name: 'Database Test',
        student_email: 'db@test.com',
        student_phone: '08111222333'
      };

      const result = await createRegistration(input);

      // Verify in database
      const registrations = await db.select()
        .from(registrationsTable)
        .where(eq(registrationsTable.id, result.id))
        .execute();

      expect(registrations).toHaveLength(1);
      expect(registrations[0].student_name).toEqual('Database Test');
      expect(registrations[0].status).toEqual('pending');
      expect(parseFloat(registrations[0].commission_amount)).toEqual(150000);
    });

    it('should throw error for invalid affiliate code', async () => {
      const testData = await setupTestData();
      
      const input: CreateRegistrationInput = {
        affiliate_code: 'INVALID123',
        program_id: testData.program.id,
        student_name: 'Test User',
        student_email: 'test@example.com',
        student_phone: '08123456789'
      };

      await expect(createRegistration(input)).rejects.toThrow(/affiliate not found/i);
    });

    it('should throw error for invalid program id', async () => {
      await setupTestData();
      
      const input: CreateRegistrationInput = {
        affiliate_code: 'TEST123',
        program_id: 99999,
        student_name: 'Test User',
        student_email: 'test@example.com',
        student_phone: '08123456789'
      };

      await expect(createRegistration(input)).rejects.toThrow(/program not found/i);
    });

    it('should throw error for inactive program', async () => {
      const testData = await setupTestData();
      
      const input: CreateRegistrationInput = {
        affiliate_code: 'TEST123',
        program_id: testData.inactiveProgram.id,
        student_name: 'Test User',
        student_email: 'test@example.com',
        student_phone: '08123456789'
      };

      await expect(createRegistration(input)).rejects.toThrow(/program not found or inactive/i);
    });
  });

  describe('verifyPayment', () => {
    it('should verify payment and update registration', async () => {
      const testData = await setupTestData();
      
      // Create a registration first
      const registrationInput: CreateRegistrationInput = {
        affiliate_code: 'TEST123',
        program_id: testData.program.id,
        student_name: 'Payment Test',
        student_email: 'payment@test.com',
        student_phone: '08555666777'
      };

      const registration = await createRegistration(registrationInput);

      // Verify payment
      const verifyInput: VerifyPaymentInput = {
        registration_id: registration.id
      };

      const result = await verifyPayment(verifyInput);

      expect(result.id).toEqual(registration.id);
      expect(result.status).toEqual('payment_verified');
      expect(result.payment_verified_at).toBeInstanceOf(Date);
      expect(result.payment_verified_at).not.toBeNull();
      expect(typeof result.commission_amount).toBe('number');
    });

    it('should save payment verification to database', async () => {
      const testData = await setupTestData();
      
      // Create a registration first
      const registrationInput: CreateRegistrationInput = {
        affiliate_code: 'TEST123',
        program_id: testData.program.id,
        student_name: 'DB Payment Test',
        student_email: 'dbpayment@test.com',
        student_phone: '08444555666'
      };

      const registration = await createRegistration(registrationInput);

      // Verify payment
      const verifyInput: VerifyPaymentInput = {
        registration_id: registration.id
      };

      await verifyPayment(verifyInput);

      // Check database
      const updatedRegistrations = await db.select()
        .from(registrationsTable)
        .where(eq(registrationsTable.id, registration.id))
        .execute();

      expect(updatedRegistrations).toHaveLength(1);
      expect(updatedRegistrations[0].status).toEqual('payment_verified');
      expect(updatedRegistrations[0].payment_verified_at).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent registration', async () => {
      const verifyInput: VerifyPaymentInput = {
        registration_id: 99999
      };

      await expect(verifyPayment(verifyInput)).rejects.toThrow(/registration not found/i);
    });
  });

  describe('getAllRegistrations', () => {
    it('should return all registrations', async () => {
      const testData = await setupTestData();
      
      // Create multiple registrations
      await createRegistration({
        affiliate_code: 'TEST123',
        program_id: testData.program.id,
        student_name: 'Student 1',
        student_email: 'student1@test.com',
        student_phone: '08111111111'
      });

      await createRegistration({
        affiliate_code: 'TEST123',
        program_id: testData.flatProgram.id,
        student_name: 'Student 2',
        student_email: 'student2@test.com',
        student_phone: '08222222222'
      });

      const results = await getAllRegistrations();

      expect(results).toHaveLength(2);
      expect(results[0].student_name).toEqual('Student 1');
      expect(results[1].student_name).toEqual('Student 2');
      expect(typeof results[0].commission_amount).toBe('number');
      expect(typeof results[1].commission_amount).toBe('number');
    });

    it('should return empty array when no registrations exist', async () => {
      const results = await getAllRegistrations();
      expect(results).toHaveLength(0);
    });
  });

  describe('getRegistrationsByAffiliate', () => {
    it('should return registrations for specific affiliate', async () => {
      const testData = await setupTestData();
      
      // Create registrations for this affiliate
      await createRegistration({
        affiliate_code: 'TEST123',
        program_id: testData.program.id,
        student_name: 'Affiliate Student 1',
        student_email: 'afflstudent1@test.com',
        student_phone: '08333333333'
      });

      await createRegistration({
        affiliate_code: 'TEST123',
        program_id: testData.flatProgram.id,
        student_name: 'Affiliate Student 2',
        student_email: 'afflstudent2@test.com',
        student_phone: '08444444444'
      });

      const results = await getRegistrationsByAffiliate(testData.affiliate.id);

      expect(results).toHaveLength(2);
      expect(results[0].affiliate_id).toEqual(testData.affiliate.id);
      expect(results[1].affiliate_id).toEqual(testData.affiliate.id);
      expect(typeof results[0].commission_amount).toBe('number');
      expect(typeof results[1].commission_amount).toBe('number');
    });

    it('should return empty array for affiliate with no registrations', async () => {
      const testData = await setupTestData();
      
      const results = await getRegistrationsByAffiliate(testData.affiliate.id);
      expect(results).toHaveLength(0);
    });

    it('should return empty array for non-existent affiliate', async () => {
      const results = await getRegistrationsByAffiliate(99999);
      expect(results).toHaveLength(0);
    });
  });
});