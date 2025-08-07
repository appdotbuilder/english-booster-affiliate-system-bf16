import { db } from '../db';
import { usersTable, linkClicksTable, registrationsTable } from '../db/schema';
import { type TrackLinkClickInput, type LinkClick, type AffiliateStats } from '../schema';
import { eq, count, sum, and } from 'drizzle-orm';

export async function trackLinkClick(input: TrackLinkClickInput): Promise<LinkClick> {
  try {
    // Find affiliate by affiliate_code
    const affiliates = await db.select()
      .from(usersTable)
      .where(
        and(
          eq(usersTable.affiliate_code, input.affiliate_code),
          eq(usersTable.role, 'affiliate')
        )
      )
      .execute();

    if (affiliates.length === 0) {
      throw new Error(`Affiliate not found with code: ${input.affiliate_code}`);
    }

    const affiliate = affiliates[0];

    // Record the click
    const result = await db.insert(linkClicksTable)
      .values({
        affiliate_id: affiliate.id,
        ip_address: input.ip_address,
        user_agent: input.user_agent ?? null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Link click tracking failed:', error);
    throw error;
  }
}

export async function getAffiliateStats(affiliateId: number): Promise<AffiliateStats> {
  try {
    // Get total clicks count
    const clicksResult = await db.select({ count: count() })
      .from(linkClicksTable)
      .where(eq(linkClicksTable.affiliate_id, affiliateId))
      .execute();

    // Get total registrations count
    const registrationsResult = await db.select({ count: count() })
      .from(registrationsTable)
      .where(eq(registrationsTable.affiliate_id, affiliateId))
      .execute();

    // Get total commission (all registrations)
    const totalCommissionResult = await db.select({ 
      total: sum(registrationsTable.commission_amount) 
    })
      .from(registrationsTable)
      .where(eq(registrationsTable.affiliate_id, affiliateId))
      .execute();

    // Get pending commission (status = 'pending')
    const pendingCommissionResult = await db.select({ 
      total: sum(registrationsTable.commission_amount) 
    })
      .from(registrationsTable)
      .where(
        and(
          eq(registrationsTable.affiliate_id, affiliateId),
          eq(registrationsTable.status, 'pending')
        )
      )
      .execute();

    // Get verified commission (status = 'payment_verified')
    const verifiedCommissionResult = await db.select({ 
      total: sum(registrationsTable.commission_amount) 
    })
      .from(registrationsTable)
      .where(
        and(
          eq(registrationsTable.affiliate_id, affiliateId),
          eq(registrationsTable.status, 'payment_verified')
        )
      )
      .execute();

    const totalClicks = clicksResult[0]?.count || 0;
    const totalRegistrations = registrationsResult[0]?.count || 0;
    
    // Handle numeric conversion for commission amounts
    const totalCommission = totalCommissionResult[0]?.total 
      ? parseFloat(totalCommissionResult[0].total) 
      : 0;
    const pendingCommission = pendingCommissionResult[0]?.total 
      ? parseFloat(pendingCommissionResult[0].total) 
      : 0;
    const verifiedCommission = verifiedCommissionResult[0]?.total 
      ? parseFloat(verifiedCommissionResult[0].total) 
      : 0;

    return {
      total_clicks: totalClicks,
      total_registrations: totalRegistrations,
      total_commission: totalCommission,
      pending_commission: pendingCommission,
      verified_commission: verifiedCommission
    };
  } catch (error) {
    console.error('Affiliate stats retrieval failed:', error);
    throw error;
  }
}

export async function getLinkClicksByAffiliate(affiliateId: number): Promise<LinkClick[]> {
  try {
    // Get all clicks for the affiliate
    const results = await db.select()
      .from(linkClicksTable)
      .where(eq(linkClicksTable.affiliate_id, affiliateId))
      .execute();

    return results;
  } catch (error) {
    console.error('Link clicks retrieval failed:', error);
    throw error;
  }
}