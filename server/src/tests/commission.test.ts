import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { type Program } from '../schema';
import { calculateCommission, getCommissionRateByProgramType } from '../handlers/commission';

describe('calculateCommission', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should calculate percentage-based commission correctly', async () => {
    const program: Program = {
      id: 1,
      name: 'Online English Course',
      type: 'online',
      fee: 1000000, // Rp 1,000,000
      commission_rate: 10, // 10%
      commission_type: 'percentage',
      description: 'Test program',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await calculateCommission(program);

    expect(result).toEqual(100000); // 10% of 1,000,000 = 100,000
    expect(typeof result).toBe('number');
  });

  it('should calculate flat commission correctly', async () => {
    const program: Program = {
      id: 2,
      name: 'Rombongan Course',
      type: 'rombongan',
      fee: 5000000, // Rp 5,000,000 (fee doesn't matter for flat commission)
      commission_rate: 100000, // Flat Rp 100,000
      commission_type: 'flat',
      description: 'Test program',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await calculateCommission(program);

    expect(result).toEqual(100000); // Flat 100,000 regardless of fee
    expect(typeof result).toBe('number');
  });

  it('should handle zero commission rate', async () => {
    const program: Program = {
      id: 3,
      name: 'Free Course',
      type: 'online',
      fee: 1000000,
      commission_rate: 0,
      commission_type: 'percentage',
      description: 'Test program',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await calculateCommission(program);

    expect(result).toEqual(0);
  });

  it('should handle zero program fee for percentage commission', async () => {
    const program: Program = {
      id: 4,
      name: 'Free Course',
      type: 'online',
      fee: 0,
      commission_rate: 10,
      commission_type: 'percentage',
      description: 'Test program',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await calculateCommission(program);

    expect(result).toEqual(0); // 10% of 0 = 0
  });

  it('should calculate commission for different program types correctly', async () => {
    // Online program (10%)
    const onlineProgram: Program = {
      id: 1,
      name: 'Online Course',
      type: 'online',
      fee: 2000000,
      commission_rate: 10,
      commission_type: 'percentage',
      description: 'Test program',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    // Offline Pare program (7%)
    const offlineProgram: Program = {
      id: 2,
      name: 'Offline Pare Course',
      type: 'offline_pare',
      fee: 3000000,
      commission_rate: 7,
      commission_type: 'percentage',
      description: 'Test program',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    // Cabang program (5%)
    const cabangProgram: Program = {
      id: 3,
      name: 'Cabang Course',
      type: 'cabang',
      fee: 1500000,
      commission_rate: 5,
      commission_type: 'percentage',
      description: 'Test program',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    const onlineResult = await calculateCommission(onlineProgram);
    const offlineResult = await calculateCommission(offlineProgram);
    const cabangResult = await calculateCommission(cabangProgram);

    expect(onlineResult).toEqual(200000); // 10% of 2,000,000
    expect(offlineResult).toEqual(210000); // 7% of 3,000,000
    expect(cabangResult).toEqual(75000); // 5% of 1,500,000
  });

  it('should handle decimal commission rates', async () => {
    const program: Program = {
      id: 5,
      name: 'Special Course',
      type: 'online',
      fee: 1000000,
      commission_rate: 12.5, // 12.5%
      commission_type: 'percentage',
      description: 'Test program',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await calculateCommission(program);

    expect(result).toEqual(125000); // 12.5% of 1,000,000 = 125,000
  });

  it('should ensure commission is not negative', async () => {
    const program: Program = {
      id: 6,
      name: 'Edge Case Course',
      type: 'rombongan',
      fee: 1000000,
      commission_rate: -50000, // Negative rate (edge case)
      commission_type: 'flat',
      description: 'Test program',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await calculateCommission(program);

    expect(result).toEqual(0); // Should be 0, not negative
  });
});

describe('getCommissionRateByProgramType', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return correct commission rate for online programs', async () => {
    const result = await getCommissionRateByProgramType('online');

    expect(result).toEqual({
      rate: 10,
      type: 'percentage'
    });
  });

  it('should return correct commission rate for offline_pare programs', async () => {
    const result = await getCommissionRateByProgramType('offline_pare');

    expect(result).toEqual({
      rate: 7,
      type: 'percentage'
    });
  });

  it('should return correct commission rate for rombongan programs', async () => {
    const result = await getCommissionRateByProgramType('rombongan');

    expect(result).toEqual({
      rate: 100000,
      type: 'flat'
    });
  });

  it('should return correct commission rate for cabang programs', async () => {
    const result = await getCommissionRateByProgramType('cabang');

    expect(result).toEqual({
      rate: 5,
      type: 'percentage'
    });
  });

  it('should throw error for unknown program type', async () => {
    await expect(getCommissionRateByProgramType('unknown_type')).rejects.toThrow(/Unknown program type/i);
  });

  it('should return correct types for all program types', async () => {
    const onlineResult = await getCommissionRateByProgramType('online');
    const offlineResult = await getCommissionRateByProgramType('offline_pare');
    const rombonganResult = await getCommissionRateByProgramType('rombongan');
    const cabangResult = await getCommissionRateByProgramType('cabang');

    // Verify structure and types
    expect(typeof onlineResult.rate).toBe('number');
    expect(typeof onlineResult.type).toBe('string');
    expect(onlineResult.type === 'percentage' || onlineResult.type === 'flat').toBe(true);

    expect(typeof offlineResult.rate).toBe('number');
    expect(typeof offlineResult.type).toBe('string');
    expect(offlineResult.type === 'percentage' || offlineResult.type === 'flat').toBe(true);

    expect(typeof rombonganResult.rate).toBe('number');
    expect(typeof rombonganResult.type).toBe('string');
    expect(rombonganResult.type === 'percentage' || rombonganResult.type === 'flat').toBe(true);

    expect(typeof cabangResult.rate).toBe('number');
    expect(typeof cabangResult.type).toBe('string');
    expect(cabangResult.type === 'percentage' || cabangResult.type === 'flat').toBe(true);
  });
});