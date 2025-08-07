import { db } from '../db';
import { programsTable } from '../db/schema';
import { type CreateProgramInput, type UpdateProgramInput, type Program } from '../schema';
import { eq } from 'drizzle-orm';

export async function createProgram(input: CreateProgramInput): Promise<Program> {
  try {
    // Insert program record
    const result = await db.insert(programsTable)
      .values({
        name: input.name,
        type: input.type,
        fee: input.fee.toString(), // Convert number to string for numeric column
        commission_rate: input.commission_rate.toString(), // Convert number to string for numeric column
        commission_type: input.commission_type,
        description: input.description || null,
        is_active: input.is_active
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const program = result[0];
    return {
      ...program,
      fee: parseFloat(program.fee), // Convert string back to number
      commission_rate: parseFloat(program.commission_rate) // Convert string back to number
    };
  } catch (error) {
    console.error('Program creation failed:', error);
    throw error;
  }
}

export async function updateProgram(input: UpdateProgramInput): Promise<Program> {
  try {
    // Build update object with only provided fields
    const updateData: any = {};
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.fee !== undefined) updateData.fee = input.fee.toString(); // Convert to string
    if (input.commission_rate !== undefined) updateData.commission_rate = input.commission_rate.toString(); // Convert to string
    if (input.commission_type !== undefined) updateData.commission_type = input.commission_type;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;
    
    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    // Update program record
    const result = await db.update(programsTable)
      .set(updateData)
      .where(eq(programsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Program not found');
    }

    // Convert numeric fields back to numbers before returning
    const program = result[0];
    return {
      ...program,
      fee: parseFloat(program.fee), // Convert string back to number
      commission_rate: parseFloat(program.commission_rate) // Convert string back to number
    };
  } catch (error) {
    console.error('Program update failed:', error);
    throw error;
  }
}

export async function deleteProgram(id: number): Promise<void> {
  try {
    // Soft delete by setting is_active to false
    const result = await db.update(programsTable)
      .set({ 
        is_active: false,
        updated_at: new Date()
      })
      .where(eq(programsTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Program not found');
    }
  } catch (error) {
    console.error('Program deletion failed:', error);
    throw error;
  }
}

export async function getPrograms(): Promise<Program[]> {
  try {
    // Fetch all active programs
    const results = await db.select()
      .from(programsTable)
      .where(eq(programsTable.is_active, true))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(program => ({
      ...program,
      fee: parseFloat(program.fee), // Convert string back to number
      commission_rate: parseFloat(program.commission_rate) // Convert string back to number
    }));
  } catch (error) {
    console.error('Programs fetch failed:', error);
    throw error;
  }
}

export async function getProgramById(id: number): Promise<Program | null> {
  try {
    // Find program by ID
    const results = await db.select()
      .from(programsTable)
      .where(eq(programsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    // Convert numeric fields back to numbers before returning
    const program = results[0];
    return {
      ...program,
      fee: parseFloat(program.fee), // Convert string back to number
      commission_rate: parseFloat(program.commission_rate) // Convert string back to number
    };
  } catch (error) {
    console.error('Program fetch by ID failed:', error);
    throw error;
  }
}