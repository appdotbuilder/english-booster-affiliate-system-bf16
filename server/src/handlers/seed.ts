import { db } from '../db';
import { programsTable, usersTable } from '../db/schema';
import { type Program, type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function seedPrograms(): Promise<Program[]> {
  try {
    const programs = [
      // Online Programs (10% commission)
      { name: 'Online Kids', type: 'online', fee: 1500000, commission_rate: 10, commission_type: 'percentage' },
      { name: 'Online Teen', type: 'online', fee: 1800000, commission_rate: 10, commission_type: 'percentage' },
      { name: 'Online TOEFL', type: 'online', fee: 2500000, commission_rate: 10, commission_type: 'percentage' },
      { name: 'Easy Peasy', type: 'online', fee: 1200000, commission_rate: 10, commission_type: 'percentage' },
      { name: 'Private Online', type: 'online', fee: 3000000, commission_rate: 10, commission_type: 'percentage' },
      { name: 'General English', type: 'online', fee: 1600000, commission_rate: 10, commission_type: 'percentage' },
      { name: 'Speaking Booster', type: 'online', fee: 1400000, commission_rate: 10, commission_type: 'percentage' },
      { name: 'Grammar Booster', type: 'online', fee: 1300000, commission_rate: 10, commission_type: 'percentage' },
      
      // Offline Pare Programs (7% commission)
      { name: 'Pare 2 Minggu', type: 'offline_pare', fee: 2000000, commission_rate: 7, commission_type: 'percentage' },
      { name: 'Pare 1 Bulan', type: 'offline_pare', fee: 3500000, commission_rate: 7, commission_type: 'percentage' },
      { name: 'Pare 2 Bulan', type: 'offline_pare', fee: 6500000, commission_rate: 7, commission_type: 'percentage' },
      { name: 'Pare 3 Bulan', type: 'offline_pare', fee: 9000000, commission_rate: 7, commission_type: 'percentage' },
      { name: 'Pare TOEFL', type: 'offline_pare', fee: 4000000, commission_rate: 7, commission_type: 'percentage' },
      { name: 'RPL (Rekognisi Pembelajaran Lampau)', type: 'offline_pare', fee: 5000000, commission_rate: 7, commission_type: 'percentage' },
      { name: 'Kapal Pesiar', type: 'offline_pare', fee: 12000000, commission_rate: 7, commission_type: 'percentage' },
      
      // Rombongan Programs (Flat Rp100,000 commission)
      { name: 'English Trip', type: 'rombongan', fee: 2500000, commission_rate: 100000, commission_type: 'flat' },
      { name: 'Special English Day', type: 'rombongan', fee: 500000, commission_rate: 100000, commission_type: 'flat' },
      { name: 'Tutor Visit', type: 'rombongan', fee: 1500000, commission_rate: 100000, commission_type: 'flat' },
      
      // Cabang Programs (5% commission)
      { name: 'Cilukba (TK / Pre-school) - Malang', type: 'cabang', fee: 800000, commission_rate: 5, commission_type: 'percentage' },
      { name: 'Hompimpa (SD) - Malang', type: 'cabang', fee: 900000, commission_rate: 5, commission_type: 'percentage' },
      { name: 'Hip Hip Hurray (SMP) - Malang', type: 'cabang', fee: 1000000, commission_rate: 5, commission_type: 'percentage' },
      { name: 'Insight Out (SMA) - Malang', type: 'cabang', fee: 1200000, commission_rate: 5, commission_type: 'percentage' },
      { name: 'Cilukba (TK / Pre-school) - Sidoarjo', type: 'cabang', fee: 800000, commission_rate: 5, commission_type: 'percentage' },
      { name: 'Hompimpa (SD) - Sidoarjo', type: 'cabang', fee: 900000, commission_rate: 5, commission_type: 'percentage' },
      { name: 'Hip Hip Hurray (SMP) - Sidoarjo', type: 'cabang', fee: 1000000, commission_rate: 5, commission_type: 'percentage' },
      { name: 'Insight Out (SMA) - Sidoarjo', type: 'cabang', fee: 1200000, commission_rate: 5, commission_type: 'percentage' },
      { name: 'Cilukba (TK / Pre-school) - Nganjuk', type: 'cabang', fee: 800000, commission_rate: 5, commission_type: 'percentage' },
      { name: 'Hompimpa (SD) - Nganjuk', type: 'cabang', fee: 900000, commission_rate: 5, commission_type: 'percentage' },
      { name: 'Hip Hip Hurray (SMP) - Nganjuk', type: 'cabang', fee: 1000000, commission_rate: 5, commission_type: 'percentage' },
      { name: 'Insight Out (SMA) - Nganjuk', type: 'cabang', fee: 1200000, commission_rate: 5, commission_type: 'percentage' },
    ];

    console.log(`Seeding ${programs.length} English Booster programs...`);

    // Insert programs into database with proper numeric conversions
    const insertedPrograms = await db.insert(programsTable)
      .values(programs.map(prog => ({
        name: prog.name,
        type: prog.type as any, // TypeScript enum compatibility
        fee: prog.fee.toString(), // Convert number to string for numeric column
        commission_rate: prog.commission_rate.toString(), // Convert number to string for numeric column
        commission_type: prog.commission_type as any, // TypeScript enum compatibility
        description: `${prog.name} program offered by English Booster`,
        is_active: true
      })))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    return insertedPrograms.map(program => ({
      ...program,
      fee: parseFloat(program.fee), // Convert string back to number
      commission_rate: parseFloat(program.commission_rate) // Convert string back to number
    }));

  } catch (error) {
    console.error('Program seeding failed:', error);
    throw error;
  }
}

export async function createAdminUser(): Promise<User> {
  try {
    console.log('Creating initial admin user...');
    
    // Check if admin user already exists
    const existingAdmin = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, 'admin@englishbooster.com'))
      .execute();

    if (existingAdmin.length > 0) {
      console.log('Admin user already exists');
      return existingAdmin[0];
    }

    // Create admin user - in a real app, password should be properly hashed
    const result = await db.insert(usersTable)
      .values({
        email: 'admin@englishbooster.com',
        password_hash: 'admin123', // In production, this should be a proper bcrypt hash
        full_name: 'English Booster Admin',
        role: 'admin',
        affiliate_code: null // Admins don't have affiliate codes
      })
      .returning()
      .execute();

    console.log('Admin user created successfully');
    return result[0];

  } catch (error) {
    console.error('Admin user creation failed:', error);
    throw error;
  }
}