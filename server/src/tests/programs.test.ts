import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { programsTable } from '../db/schema';
import { type CreateProgramInput, type UpdateProgramInput } from '../schema';
import { 
  createProgram, 
  updateProgram, 
  deleteProgram, 
  getPrograms, 
  getProgramById 
} from '../handlers/programs';
import { eq } from 'drizzle-orm';

// Test inputs
const testCreateInput: CreateProgramInput = {
  name: 'Test Online Program',
  type: 'online',
  fee: 1500000,
  commission_rate: 15.5,
  commission_type: 'percentage',
  description: 'A test program for online learning',
  is_active: true
};

const testCreateInputMinimal: CreateProgramInput = {
  name: 'Minimal Program',
  type: 'offline_pare',
  fee: 2000000,
  commission_rate: 100000,
  commission_type: 'flat',
  is_active: true
  // description will use default (undefined)
};

describe('createProgram', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a program with all fields', async () => {
    const result = await createProgram(testCreateInput);

    // Basic field validation
    expect(result.name).toEqual('Test Online Program');
    expect(result.type).toEqual('online');
    expect(result.fee).toEqual(1500000);
    expect(typeof result.fee).toEqual('number');
    expect(result.commission_rate).toEqual(15.5);
    expect(typeof result.commission_rate).toEqual('number');
    expect(result.commission_type).toEqual('percentage');
    expect(result.description).toEqual('A test program for online learning');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a program with minimal fields', async () => {
    const result = await createProgram(testCreateInputMinimal);

    expect(result.name).toEqual('Minimal Program');
    expect(result.type).toEqual('offline_pare');
    expect(result.fee).toEqual(2000000);
    expect(result.commission_rate).toEqual(100000);
    expect(result.commission_type).toEqual('flat');
    expect(result.description).toBeNull();
    expect(result.is_active).toEqual(true); // Default value
  });

  it('should save program to database', async () => {
    const result = await createProgram(testCreateInput);

    // Query using proper drizzle syntax
    const programs = await db.select()
      .from(programsTable)
      .where(eq(programsTable.id, result.id))
      .execute();

    expect(programs).toHaveLength(1);
    expect(programs[0].name).toEqual('Test Online Program');
    expect(programs[0].type).toEqual('online');
    expect(parseFloat(programs[0].fee)).toEqual(1500000);
    expect(parseFloat(programs[0].commission_rate)).toEqual(15.5);
    expect(programs[0].commission_type).toEqual('percentage');
    expect(programs[0].description).toEqual('A test program for online learning');
    expect(programs[0].is_active).toEqual(true);
  });
});

describe('updateProgram', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update program with all fields', async () => {
    // Create a program first
    const created = await createProgram(testCreateInput);

    const updateInput: UpdateProgramInput = {
      id: created.id,
      name: 'Updated Program Name',
      type: 'rombongan',
      fee: 2500000,
      commission_rate: 20.0,
      commission_type: 'flat',
      description: 'Updated description',
      is_active: false
    };

    const result = await updateProgram(updateInput);

    expect(result.id).toEqual(created.id);
    expect(result.name).toEqual('Updated Program Name');
    expect(result.type).toEqual('rombongan');
    expect(result.fee).toEqual(2500000);
    expect(typeof result.fee).toEqual('number');
    expect(result.commission_rate).toEqual(20.0);
    expect(typeof result.commission_rate).toEqual('number');
    expect(result.commission_type).toEqual('flat');
    expect(result.description).toEqual('Updated description');
    expect(result.is_active).toEqual(false);
    expect(result.updated_at.getTime()).toBeGreaterThan(result.created_at.getTime());
  });

  it('should update program with partial fields', async () => {
    // Create a program first
    const created = await createProgram(testCreateInput);

    const updateInput: UpdateProgramInput = {
      id: created.id,
      name: 'Partially Updated Program',
      fee: 1800000
      // Other fields should remain unchanged
    };

    const result = await updateProgram(updateInput);

    expect(result.name).toEqual('Partially Updated Program');
    expect(result.fee).toEqual(1800000);
    expect(result.type).toEqual('online'); // Should remain unchanged
    expect(result.commission_rate).toEqual(15.5); // Should remain unchanged
    expect(result.commission_type).toEqual('percentage'); // Should remain unchanged
    expect(result.description).toEqual('A test program for online learning'); // Should remain unchanged
    expect(result.is_active).toEqual(true); // Should remain unchanged
  });

  it('should throw error when program not found', async () => {
    const updateInput: UpdateProgramInput = {
      id: 999999, // Non-existent ID
      name: 'Non-existent Program'
    };

    expect(updateProgram(updateInput)).rejects.toThrow(/program not found/i);
  });

  it('should update program in database', async () => {
    // Create a program first
    const created = await createProgram(testCreateInput);

    const updateInput: UpdateProgramInput = {
      id: created.id,
      name: 'Database Updated Program',
      is_active: false
    };

    await updateProgram(updateInput);

    // Verify in database
    const programs = await db.select()
      .from(programsTable)
      .where(eq(programsTable.id, created.id))
      .execute();

    expect(programs).toHaveLength(1);
    expect(programs[0].name).toEqual('Database Updated Program');
    expect(programs[0].is_active).toEqual(false);
  });
});

describe('deleteProgram', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should soft delete program by setting is_active to false', async () => {
    // Create a program first
    const created = await createProgram(testCreateInput);

    await deleteProgram(created.id);

    // Verify program is soft deleted in database
    const programs = await db.select()
      .from(programsTable)
      .where(eq(programsTable.id, created.id))
      .execute();

    expect(programs).toHaveLength(1);
    expect(programs[0].is_active).toEqual(false);
  });

  it('should throw error when program not found', async () => {
    expect(deleteProgram(999999)).rejects.toThrow(/program not found/i);
  });
});

describe('getPrograms', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no programs exist', async () => {
    const result = await getPrograms();
    expect(result).toEqual([]);
  });

  it('should return all active programs', async () => {
    // Create multiple programs
    const program1 = await createProgram(testCreateInput);
    const program2 = await createProgram(testCreateInputMinimal);

    const result = await getPrograms();

    expect(result).toHaveLength(2);
    expect(result[0].id).toEqual(program1.id);
    expect(result[0].fee).toEqual(1500000);
    expect(typeof result[0].fee).toEqual('number');
    expect(result[0].commission_rate).toEqual(15.5);
    expect(typeof result[0].commission_rate).toEqual('number');
    expect(result[1].id).toEqual(program2.id);
  });

  it('should not return inactive programs', async () => {
    // Create an active program
    const activeProgram = await createProgram(testCreateInput);
    
    // Create an inactive program by creating then deleting
    const inactiveProgram = await createProgram(testCreateInputMinimal);
    await deleteProgram(inactiveProgram.id);

    const result = await getPrograms();

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(activeProgram.id);
    expect(result[0].is_active).toEqual(true);
  });
});

describe('getProgramById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return program by ID', async () => {
    const created = await createProgram(testCreateInput);

    const result = await getProgramById(created.id);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(created.id);
    expect(result!.name).toEqual('Test Online Program');
    expect(result!.fee).toEqual(1500000);
    expect(typeof result!.fee).toEqual('number');
    expect(result!.commission_rate).toEqual(15.5);
    expect(typeof result!.commission_rate).toEqual('number');
    expect(result!.type).toEqual('online');
  });

  it('should return inactive programs by ID', async () => {
    // Create and then soft delete a program
    const created = await createProgram(testCreateInput);
    await deleteProgram(created.id);

    const result = await getProgramById(created.id);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(created.id);
    expect(result!.is_active).toEqual(false);
  });

  it('should return null when program not found', async () => {
    const result = await getProgramById(999999);
    expect(result).toBeNull();
  });
});