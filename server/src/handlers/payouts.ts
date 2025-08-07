import { db } from '../db';
import { usersTable, payoutRequestsTable, registrationsTable } from '../db/schema';
import { type CreatePayoutRequestInput, type UpdatePayoutStatusInput, type PayoutRequest } from '../schema';
import { eq, sum, and } from 'drizzle-orm';

export async function createPayoutRequest(affiliateId: number, input: CreatePayoutRequestInput): Promise<PayoutRequest> {
  try {
    // Verify affiliate exists
    const affiliate = await db.select()
      .from(usersTable)
      .where(and(eq(usersTable.id, affiliateId), eq(usersTable.role, 'affiliate')))
      .execute();

    if (affiliate.length === 0) {
      throw new Error('Affiliate not found');
    }

    // Calculate total verified commission for this affiliate
    const commissionResult = await db.select({
      total_commission: sum(registrationsTable.commission_amount)
    })
      .from(registrationsTable)
      .where(and(
        eq(registrationsTable.affiliate_id, affiliateId),
        eq(registrationsTable.status, 'payment_verified')
      ))
      .execute();

    const totalVerifiedCommission = parseFloat(commissionResult[0]?.total_commission || '0');

    // Calculate total payout requests for this affiliate
    const payoutResult = await db.select({
      total_payouts: sum(payoutRequestsTable.amount)
    })
      .from(payoutRequestsTable)
      .where(eq(payoutRequestsTable.affiliate_id, affiliateId))
      .execute();

    const totalPayoutRequests = parseFloat(payoutResult[0]?.total_payouts || '0');

    // Check if affiliate has sufficient commission
    const availableCommission = totalVerifiedCommission - totalPayoutRequests;
    if (availableCommission < input.amount) {
      throw new Error('Insufficient verified commission balance');
    }

    // Create payout request record
    const result = await db.insert(payoutRequestsTable)
      .values({
        affiliate_id: affiliateId,
        amount: input.amount.toString(),
        bank_name: input.bank_name,
        account_number: input.account_number,
        account_holder_name: input.account_holder_name,
        status: 'pending',
        requested_at: new Date(),
        processed_at: null
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers
    const payoutRequest = result[0];
    return {
      ...payoutRequest,
      amount: parseFloat(payoutRequest.amount)
    };
  } catch (error) {
    console.error('Payout request creation failed:', error);
    throw error;
  }
}

export async function updatePayoutStatus(input: UpdatePayoutStatusInput): Promise<PayoutRequest> {
  try {
    // Verify payout request exists
    const existingPayout = await db.select()
      .from(payoutRequestsTable)
      .where(eq(payoutRequestsTable.id, input.id))
      .execute();

    if (existingPayout.length === 0) {
      throw new Error('Payout request not found');
    }

    // Update payout status
    const updateData: any = {
      status: input.status,
      updated_at: new Date()
    };

    // Set processed_at timestamp if status is 'paid'
    if (input.status === 'paid') {
      updateData.processed_at = new Date();
    }

    const result = await db.update(payoutRequestsTable)
      .set(updateData)
      .where(eq(payoutRequestsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers
    const payoutRequest = result[0];
    return {
      ...payoutRequest,
      amount: parseFloat(payoutRequest.amount)
    };
  } catch (error) {
    console.error('Payout status update failed:', error);
    throw error;
  }
}

export async function getPayoutRequestsByAffiliate(affiliateId: number): Promise<PayoutRequest[]> {
  try {
    // Verify affiliate exists
    const affiliate = await db.select()
      .from(usersTable)
      .where(and(eq(usersTable.id, affiliateId), eq(usersTable.role, 'affiliate')))
      .execute();

    if (affiliate.length === 0) {
      throw new Error('Affiliate not found');
    }

    // Get all payout requests for the affiliate
    const results = await db.select()
      .from(payoutRequestsTable)
      .where(eq(payoutRequestsTable.affiliate_id, affiliateId))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(payout => ({
      ...payout,
      amount: parseFloat(payout.amount)
    }));
  } catch (error) {
    console.error('Failed to get payout requests by affiliate:', error);
    throw error;
  }
}

export async function getAllPayoutRequests(): Promise<PayoutRequest[]> {
  try {
    // Get all payout requests
    const results = await db.select()
      .from(payoutRequestsTable)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(payout => ({
      ...payout,
      amount: parseFloat(payout.amount)
    }));
  } catch (error) {
    console.error('Failed to get all payout requests:', error);
    throw error;
  }
}