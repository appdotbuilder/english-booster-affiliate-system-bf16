import { type Program, type ProgramType } from '../schema';

export async function calculateCommission(program: Program): Promise<number> {
  try {
    let commission = 0;
    
    if (program.commission_type === 'percentage') {
      commission = (program.fee * program.commission_rate) / 100;
    } else if (program.commission_type === 'flat') {
      commission = program.commission_rate;
    }
    
    // Ensure commission is not negative
    return Math.max(0, commission);
  } catch (error) {
    console.error('Commission calculation failed:', error);
    throw error;
  }
}

export async function getCommissionRateByProgramType(programType: string): Promise<{ rate: number; type: 'percentage' | 'flat' }> {
  try {
    const commissionRates = {
      'online': { rate: 10, type: 'percentage' as const },
      'offline_pare': { rate: 7, type: 'percentage' as const },
      'rombongan': { rate: 100000, type: 'flat' as const },
      'cabang': { rate: 5, type: 'percentage' as const }
    };
    
    const rateConfig = commissionRates[programType as ProgramType];
    if (!rateConfig) {
      throw new Error(`Unknown program type: ${programType}`);
    }
    
    return rateConfig;
  } catch (error) {
    console.error('Commission rate retrieval failed:', error);
    throw error;
  }
}