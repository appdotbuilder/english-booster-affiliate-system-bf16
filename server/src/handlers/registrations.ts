import { db } from '../db';
import { usersTable, programsTable, registrationsTable } from '../db/schema';
import { type CreateRegistrationInput, type VerifyPaymentInput, type Registration } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createRegistration(input: CreateRegistrationInput): Promise<Registration> {
  try {
    // Find affiliate by affiliate_code
    const affiliates = await db.select()
      .from(usersTable)
      .where(and(
        eq(usersTable.affiliate_code, input.affiliate_code),
        eq(usersTable.role, 'affiliate')
      ))
      .execute();

    if (affiliates.length === 0) {
      throw new Error('Affiliate not found');
    }

    const affiliate = affiliates[0];

    // Find program by program_id
    const programs = await db.select()
      .from(programsTable)
      .where(and(
        eq(programsTable.id, input.program_id),
        eq(programsTable.is_active, true)
      ))
      .execute();

    if (programs.length === 0) {
      throw new Error('Program not found or inactive');
    }

    const program = programs[0];

    // Calculate commission based on program type and rate
    const programFee = parseFloat(program.fee);
    const commissionRate = parseFloat(program.commission_rate);
    
    const commissionAmount = program.commission_type === 'percentage'
      ? (programFee * commissionRate) / 100
      : commissionRate;

    // Create registration record
    const result = await db.insert(registrationsTable)
      .values({
        affiliate_id: affiliate.id,
        program_id: input.program_id,
        student_name: input.student_name,
        student_email: input.student_email,
        student_phone: input.student_phone,
        status: 'pending',
        commission_amount: commissionAmount.toString()
      })
      .returning()
      .execute();

    const registration = result[0];

    // Convert numeric fields back to numbers before returning
    return {
      ...registration,
      commission_amount: parseFloat(registration.commission_amount)
    };
  } catch (error) {
    console.error('Registration creation failed:', error);
    throw error;
  }
}

export async function verifyPayment(input: VerifyPaymentInput): Promise<Registration> {
  try {
    // Update registration status to 'payment_verified' and set payment_verified_at timestamp
    const result = await db.update(registrationsTable)
      .set({
        status: 'payment_verified',
        payment_verified_at: new Date(),
        updated_at: new Date()
      })
      .where(eq(registrationsTable.id, input.registration_id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Registration not found');
    }

    const registration = result[0];

    // Convert numeric fields back to numbers before returning
    return {
      ...registration,
      commission_amount: parseFloat(registration.commission_amount)
    };
  } catch (error) {
    console.error('Payment verification failed:', error);
    throw error;
  }
}

export async function getAllRegistrations(): Promise<Registration[]> {
  try {
    // Return all registrations
    const results = await db.select()
      .from(registrationsTable)
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(registration => ({
      ...registration,
      commission_amount: parseFloat(registration.commission_amount)
    }));
  } catch (error) {
    console.error('Fetching all registrations failed:', error);
    throw error;
  }
}

export async function getRegistrationsByAffiliate(affiliateId: number): Promise<Registration[]> {
  try {
    // Return registrations filtered by affiliate_id
    const results = await db.select()
      .from(registrationsTable)
      .where(eq(registrationsTable.affiliate_id, affiliateId))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(registration => ({
      ...registration,
      commission_amount: parseFloat(registration.commission_amount)
    }));
  } catch (error) {
    console.error('Fetching registrations by affiliate failed:', error);
    throw error;
  }
}