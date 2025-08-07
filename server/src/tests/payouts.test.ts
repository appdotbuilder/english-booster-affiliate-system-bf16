import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, programsTable, registrationsTable, payoutRequestsTable } from '../db/schema';
import { type CreatePayoutRequestInput, type UpdatePayoutStatusInput } from '../schema';
import { createPayoutRequest, updatePayoutStatus, getPayoutRequestsByAffiliate, getAllPayoutRequests } from '../handlers/payouts';
import { eq } from 'drizzle-orm';

// Test data
const testAffiliate = {
  email: 'affiliate@test.com',
  password_hash: 'hashed_password_123',
  full_name: 'Test Affiliate',
  role: 'affiliate' as const,
  affiliate_code: 'TEST123'
};

const testAdmin = {
  email: 'admin@test.com',
  password_hash: 'hashed_password_123',
  full_name: 'Test Admin',
  role: 'admin' as const,
  affiliate_code: null
};

const testProgram = {
  name: 'Test Program',
  type: 'online' as const,
  fee: '1000000', // 1 million rupiah
  commission_rate: '10.00', // 10%
  commission_type: 'percentage' as const,
  description: 'Test program description',
  is_active: true
};

const testPayoutInput: CreatePayoutRequestInput = {
  amount: 50000,
  bank_name: 'Bank Central Asia',
  account_number: '1234567890',
  account_holder_name: 'Test Affiliate'
};

describe('Payout Handlers', () => {
  let affiliateId: number;
  let adminId: number;
  let programId: number;

  beforeEach(async () => {
    await createDB();

    // Create test users
    const affiliateResult = await db.insert(usersTable)
      .values(testAffiliate)
      .returning()
      .execute();
    affiliateId = affiliateResult[0].id;

    const adminResult = await db.insert(usersTable)
      .values(testAdmin)
      .returning()
      .execute();
    adminId = adminResult[0].id;

    // Create test program
    const programResult = await db.insert(programsTable)
      .values(testProgram)
      .returning()
      .execute();
    programId = programResult[0].id;
  });

  afterEach(resetDB);

  describe('createPayoutRequest', () => {
    it('should create a payout request when affiliate has sufficient commission', async () => {
      // Create verified registration with commission
      await db.insert(registrationsTable)
        .values({
          affiliate_id: affiliateId,
          program_id: programId,
          student_name: 'Test Student',
          student_email: 'student@test.com',
          student_phone: '08123456789',
          status: 'payment_verified',
          commission_amount: '100000', // 100k commission
          registration_date: new Date(),
          payment_verified_at: new Date()
        })
        .execute();

      const result = await createPayoutRequest(affiliateId, testPayoutInput);

      expect(result.affiliate_id).toEqual(affiliateId);
      expect(result.amount).toEqual(50000);
      expect(result.bank_name).toEqual('Bank Central Asia');
      expect(result.account_number).toEqual('1234567890');
      expect(result.account_holder_name).toEqual('Test Affiliate');
      expect(result.status).toEqual('pending');
      expect(result.id).toBeDefined();
      expect(result.requested_at).toBeInstanceOf(Date);
      expect(result.processed_at).toBeNull();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save payout request to database', async () => {
      // Create verified registration with commission
      await db.insert(registrationsTable)
        .values({
          affiliate_id: affiliateId,
          program_id: programId,
          student_name: 'Test Student',
          student_email: 'student@test.com',
          student_phone: '08123456789',
          status: 'payment_verified',
          commission_amount: '100000',
          registration_date: new Date(),
          payment_verified_at: new Date()
        })
        .execute();

      const result = await createPayoutRequest(affiliateId, testPayoutInput);

      const payouts = await db.select()
        .from(payoutRequestsTable)
        .where(eq(payoutRequestsTable.id, result.id))
        .execute();

      expect(payouts).toHaveLength(1);
      expect(payouts[0].affiliate_id).toEqual(affiliateId);
      expect(parseFloat(payouts[0].amount)).toEqual(50000);
      expect(payouts[0].bank_name).toEqual('Bank Central Asia');
      expect(payouts[0].status).toEqual('pending');
    });

    it('should throw error when affiliate not found', async () => {
      const nonExistentAffiliateId = 99999;

      await expect(createPayoutRequest(nonExistentAffiliateId, testPayoutInput))
        .rejects.toThrow(/affiliate not found/i);
    });

    it('should throw error when admin tries to create payout request', async () => {
      await expect(createPayoutRequest(adminId, testPayoutInput))
        .rejects.toThrow(/affiliate not found/i);
    });

    it('should throw error when affiliate has insufficient commission', async () => {
      // No verified registrations, so no commission available
      await expect(createPayoutRequest(affiliateId, testPayoutInput))
        .rejects.toThrow(/insufficient verified commission balance/i);
    });

    it('should calculate available commission correctly after previous payouts', async () => {
      // Create verified registration with 100k commission
      await db.insert(registrationsTable)
        .values({
          affiliate_id: affiliateId,
          program_id: programId,
          student_name: 'Test Student',
          student_email: 'student@test.com',
          student_phone: '08123456789',
          status: 'payment_verified',
          commission_amount: '100000',
          registration_date: new Date(),
          payment_verified_at: new Date()
        })
        .execute();

      // Create first payout request for 60k
      await createPayoutRequest(affiliateId, {
        amount: 60000,
        bank_name: 'Test Bank',
        account_number: '1234567890',
        account_holder_name: 'Test User'
      });

      // Try to create second payout request for 50k (should fail - only 40k left)
      await expect(createPayoutRequest(affiliateId, testPayoutInput))
        .rejects.toThrow(/insufficient verified commission balance/i);
    });

    it('should allow payout request with exact available commission', async () => {
      // Create verified registration with exact commission amount
      await db.insert(registrationsTable)
        .values({
          affiliate_id: affiliateId,
          program_id: programId,
          student_name: 'Test Student',
          student_email: 'student@test.com',
          student_phone: '08123456789',
          status: 'payment_verified',
          commission_amount: testPayoutInput.amount.toString(),
          registration_date: new Date(),
          payment_verified_at: new Date()
        })
        .execute();

      const result = await createPayoutRequest(affiliateId, testPayoutInput);
      expect(result.amount).toEqual(testPayoutInput.amount);
    });
  });

  describe('updatePayoutStatus', () => {
    let payoutId: number;

    beforeEach(async () => {
      // Create verified registration and payout request
      await db.insert(registrationsTable)
        .values({
          affiliate_id: affiliateId,
          program_id: programId,
          student_name: 'Test Student',
          student_email: 'student@test.com',
          student_phone: '08123456789',
          status: 'payment_verified',
          commission_amount: '100000',
          registration_date: new Date(),
          payment_verified_at: new Date()
        })
        .execute();

      const payout = await createPayoutRequest(affiliateId, testPayoutInput);
      payoutId = payout.id;
    });

    it('should update payout status to paid', async () => {
      const updateInput: UpdatePayoutStatusInput = {
        id: payoutId,
        status: 'paid'
      };

      const result = await updatePayoutStatus(updateInput);

      expect(result.id).toEqual(payoutId);
      expect(result.status).toEqual('paid');
      expect(result.processed_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should update payout status to pending without processed_at', async () => {
      // First set to paid
      await updatePayoutStatus({
        id: payoutId,
        status: 'paid'
      });

      // Then update back to pending
      const updateInput: UpdatePayoutStatusInput = {
        id: payoutId,
        status: 'pending'
      };

      const result = await updatePayoutStatus(updateInput);

      expect(result.status).toEqual('pending');
      expect(result.processed_at).toBeInstanceOf(Date); // Should keep the previous processed_at
    });

    it('should save updated status to database', async () => {
      const updateInput: UpdatePayoutStatusInput = {
        id: payoutId,
        status: 'paid'
      };

      await updatePayoutStatus(updateInput);

      const payouts = await db.select()
        .from(payoutRequestsTable)
        .where(eq(payoutRequestsTable.id, payoutId))
        .execute();

      expect(payouts).toHaveLength(1);
      expect(payouts[0].status).toEqual('paid');
      expect(payouts[0].processed_at).toBeInstanceOf(Date);
    });

    it('should throw error when payout request not found', async () => {
      const nonExistentId = 99999;
      const updateInput: UpdatePayoutStatusInput = {
        id: nonExistentId,
        status: 'paid'
      };

      await expect(updatePayoutStatus(updateInput))
        .rejects.toThrow(/payout request not found/i);
    });
  });

  describe('getPayoutRequestsByAffiliate', () => {
    beforeEach(async () => {
      // Create verified registration with commission
      await db.insert(registrationsTable)
        .values({
          affiliate_id: affiliateId,
          program_id: programId,
          student_name: 'Test Student',
          student_email: 'student@test.com',
          student_phone: '08123456789',
          status: 'payment_verified',
          commission_amount: '200000',
          registration_date: new Date(),
          payment_verified_at: new Date()
        })
        .execute();
    });

    it('should return all payout requests for affiliate', async () => {
      // Create multiple payout requests
      await createPayoutRequest(affiliateId, testPayoutInput);
      await createPayoutRequest(affiliateId, {
        ...testPayoutInput,
        amount: 75000
      });

      const results = await getPayoutRequestsByAffiliate(affiliateId);

      expect(results).toHaveLength(2);
      expect(results[0].affiliate_id).toEqual(affiliateId);
      expect(results[1].affiliate_id).toEqual(affiliateId);
      expect(results.some(p => p.amount === 50000)).toBe(true);
      expect(results.some(p => p.amount === 75000)).toBe(true);
    });

    it('should return empty array when no payout requests exist', async () => {
      const results = await getPayoutRequestsByAffiliate(affiliateId);
      expect(results).toHaveLength(0);
    });

    it('should throw error when affiliate not found', async () => {
      const nonExistentAffiliateId = 99999;

      await expect(getPayoutRequestsByAffiliate(nonExistentAffiliateId))
        .rejects.toThrow(/affiliate not found/i);
    });

    it('should throw error when admin ID is used', async () => {
      await expect(getPayoutRequestsByAffiliate(adminId))
        .rejects.toThrow(/affiliate not found/i);
    });

    it('should return correct numeric types', async () => {
      await createPayoutRequest(affiliateId, testPayoutInput);
      
      const results = await getPayoutRequestsByAffiliate(affiliateId);

      expect(results).toHaveLength(1);
      expect(typeof results[0].amount).toBe('number');
      expect(results[0].amount).toEqual(50000);
    });
  });

  describe('getAllPayoutRequests', () => {
    let secondAffiliateId: number;

    beforeEach(async () => {
      // Create second affiliate
      const secondAffiliate = await db.insert(usersTable)
        .values({
          email: 'affiliate2@test.com',
          password_hash: 'hashed_password_123',
          full_name: 'Test Affiliate 2',
          role: 'affiliate',
          affiliate_code: 'TEST456'
        })
        .returning()
        .execute();
      secondAffiliateId = secondAffiliate[0].id;

      // Create verified registrations for both affiliates
      await db.insert(registrationsTable)
        .values([
          {
            affiliate_id: affiliateId,
            program_id: programId,
            student_name: 'Test Student 1',
            student_email: 'student1@test.com',
            student_phone: '08123456789',
            status: 'payment_verified',
            commission_amount: '100000',
            registration_date: new Date(),
            payment_verified_at: new Date()
          },
          {
            affiliate_id: secondAffiliateId,
            program_id: programId,
            student_name: 'Test Student 2',
            student_email: 'student2@test.com',
            student_phone: '08123456790',
            status: 'payment_verified',
            commission_amount: '150000',
            registration_date: new Date(),
            payment_verified_at: new Date()
          }
        ])
        .execute();
    });

    it('should return all payout requests from all affiliates', async () => {
      // Create payout requests for both affiliates
      await createPayoutRequest(affiliateId, testPayoutInput);
      await createPayoutRequest(secondAffiliateId, {
        ...testPayoutInput,
        amount: 75000
      });

      const results = await getAllPayoutRequests();

      expect(results).toHaveLength(2);
      expect(results.some(p => p.affiliate_id === affiliateId)).toBe(true);
      expect(results.some(p => p.affiliate_id === secondAffiliateId)).toBe(true);
      expect(results.some(p => p.amount === 50000)).toBe(true);
      expect(results.some(p => p.amount === 75000)).toBe(true);
    });

    it('should return empty array when no payout requests exist', async () => {
      const results = await getAllPayoutRequests();
      expect(results).toHaveLength(0);
    });

    it('should return correct numeric types', async () => {
      await createPayoutRequest(affiliateId, testPayoutInput);
      
      const results = await getAllPayoutRequests();

      expect(results).toHaveLength(1);
      expect(typeof results[0].amount).toBe('number');
      expect(results[0].amount).toEqual(50000);
    });

    it('should include all payout request fields', async () => {
      await createPayoutRequest(affiliateId, testPayoutInput);

      const results = await getAllPayoutRequests();

      expect(results).toHaveLength(1);
      const payout = results[0];
      expect(payout.id).toBeDefined();
      expect(payout.affiliate_id).toBeDefined();
      expect(payout.amount).toBeDefined();
      expect(payout.bank_name).toBeDefined();
      expect(payout.account_number).toBeDefined();
      expect(payout.account_holder_name).toBeDefined();
      expect(payout.status).toBeDefined();
      expect(payout.requested_at).toBeInstanceOf(Date);
      expect(payout.created_at).toBeInstanceOf(Date);
      expect(payout.updated_at).toBeInstanceOf(Date);
    });
  });
});