import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, programsTable, registrationsTable } from '../db/schema';
import { type User, type Program, type Registration } from '../schema';
import { 
  sendNewRegistrationNotification, 
  sendPayoutProcessedNotification, 
  sendWelcomeEmail 
} from '../handlers/email';

// Test data
const testAffiliate: User = {
  id: 1,
  email: 'affiliate@test.com',
  password_hash: 'hashed_password',
  full_name: 'John Affiliate',
  role: 'affiliate',
  affiliate_code: 'AFF001',
  created_at: new Date(),
  updated_at: new Date()
};

const testProgram: Program = {
  id: 1,
  name: 'Program Digital Marketing',
  type: 'online',
  fee: 1500000,
  commission_rate: 15,
  commission_type: 'percentage',
  description: 'Kursus digital marketing lengkap',
  is_active: true,
  created_at: new Date(),
  updated_at: new Date()
};

const testRegistration: Registration = {
  id: 1,
  affiliate_id: 1,
  program_id: 1,
  student_name: 'Jane Student',
  student_email: 'student@test.com',
  student_phone: '+6281234567890',
  status: 'pending',
  commission_amount: 225000,
  registration_date: new Date('2024-01-15T10:30:00Z'),
  payment_verified_at: null,
  created_at: new Date(),
  updated_at: new Date()
};

describe('Email Handlers', () => {
  // Simple test to verify basic functionality without mocking
  describe('basic functionality test', () => {
    it('should execute sendNewRegistrationNotification without errors', async () => {
      // This test will show actual console output
      await expect(sendNewRegistrationNotification(testRegistration, testAffiliate, testProgram))
        .resolves.toBeUndefined();
    });

    it('should execute sendPayoutProcessedNotification without errors', async () => {
      await expect(sendPayoutProcessedNotification('test@email.com', 100000, 'paid'))
        .resolves.toBeUndefined();
    });

    it('should execute sendWelcomeEmail without errors', async () => {
      await expect(sendWelcomeEmail('test@email.com', 'TEST123'))
        .resolves.toBeUndefined();
    });

    it('should skip welcome email for null affiliate code', async () => {
      await expect(sendWelcomeEmail('admin@test.com', null))
        .resolves.toBeUndefined();
    });
  });

  describe('email content validation with proper mocking', () => {
    let capturedLogs: string[] = [];
    let originalConsoleLog: typeof console.log;

    beforeEach(() => {
      capturedLogs = [];
      originalConsoleLog = console.log;
      console.log = (...args: any[]) => {
        capturedLogs.push(args.join(' '));
        originalConsoleLog(...args); // Also call original for debugging
      };
    });

    afterEach(() => {
      console.log = originalConsoleLog;
    });

    it('should capture new registration notification content', async () => {
      await sendNewRegistrationNotification(testRegistration, testAffiliate, testProgram);

      const allContent = capturedLogs.join(' ');
      
      // Debug: show what was captured
      console.log('Captured logs length:', capturedLogs.length);
      console.log('First few captured logs:', capturedLogs.slice(0, 3));
      
      expect(capturedLogs.length).toBeGreaterThan(0);
      
      // Test basic content
      expect(allContent).toContain('Pendaftaran Baru');
      expect(allContent).toContain(testRegistration.student_name);
      expect(allContent).toContain(testProgram.name);
      expect(allContent).toContain(testAffiliate.full_name);
      
      // Test currency formatting
      expect(allContent).toMatch(/Rp[\s\d.,]+/);
    });

    it('should capture payout notification content', async () => {
      await sendPayoutProcessedNotification('affiliate@test.com', 500000, 'paid');

      const allContent = capturedLogs.join(' ');
      
      expect(capturedLogs.length).toBeGreaterThan(0);
      expect(allContent).toContain('affiliate@test.com');
      expect(allContent).toContain('BERHASIL DIPROSES');
      expect(allContent).toContain('✅');
      expect(allContent).toMatch(/Rp[\s\d.,]+/);
    });

    it('should capture welcome email content', async () => {
      await sendWelcomeEmail('newuser@test.com', 'WELCOME123');

      const allContent = capturedLogs.join(' ');
      
      expect(capturedLogs.length).toBeGreaterThan(0);
      expect(allContent).toContain('Selamat Datang');
      expect(allContent).toContain('WELCOME123');
      expect(allContent).toContain('https://example.com/register?ref=WELCOME123');
      expect(allContent).toContain('LINK AFFILIATE ANDA');
    });

    it('should skip welcome email when no affiliate code', async () => {
      await sendWelcomeEmail('admin@test.com', null);

      const allContent = capturedLogs.join(' ');
      
      expect(allContent).toContain('Skipping welcome email');
      expect(allContent).toContain('admin@test.com');
      expect(allContent).toContain('No affiliate code provided');
    });

    it('should handle different registration statuses', async () => {
      const verifiedRegistration = {
        ...testRegistration,
        status: 'payment_verified' as const,
        payment_verified_at: new Date()
      };

      await sendNewRegistrationNotification(verifiedRegistration, testAffiliate, testProgram);

      const allContent = capturedLogs.join(' ');
      expect(allContent).toContain('Pembayaran Terverifikasi');
    });

    it('should handle program without description', async () => {
      const programWithoutDesc = {
        ...testProgram,
        description: null
      };

      await sendNewRegistrationNotification(testRegistration, testAffiliate, programWithoutDesc);

      const allContent = capturedLogs.join(' ');
      expect(allContent).toContain('Tidak ada deskripsi');
    });

    it('should handle flat commission type', async () => {
      const flatCommissionProgram = {
        ...testProgram,
        commission_type: 'flat' as const,
        commission_rate: 50000
      };

      await sendNewRegistrationNotification(testRegistration, testAffiliate, flatCommissionProgram);

      const allContent = capturedLogs.join(' ');
      expect(allContent).toContain('Nominal Tetap');
      expect(allContent).toContain('50000');
    });

    it('should handle percentage commission type', async () => {
      await sendNewRegistrationNotification(testRegistration, testAffiliate, testProgram);

      const allContent = capturedLogs.join(' ');
      expect(allContent).toContain('Persentase');
      expect(allContent).toContain('15%');
    });

    it('should handle pending payout status', async () => {
      await sendPayoutProcessedNotification('test@email.com', 300000, 'pending');

      const allContent = capturedLogs.join(' ');
      expect(allContent).toContain('SEDANG DIPROSES');
      expect(allContent).toContain('⏳');
      expect(allContent).toContain('sedang dalam proses');
    });

    it('should include date in payout notifications', async () => {
      await sendPayoutProcessedNotification('test@email.com', 100000, 'paid');

      const allContent = capturedLogs.join(' ');
      expect(allContent).toContain('Tanggal Update:');
      expect(allContent).toMatch(/\d{4}/); // Should contain year
    });

    it('should log success messages', async () => {
      await sendPayoutProcessedNotification('user@test.com', 750000, 'paid');

      const allContent = capturedLogs.join(' ');
      expect(allContent).toContain('Payout notification sent successfully');
      expect(allContent).toContain('user@test.com');
      expect(allContent).toContain('Status: paid');
    });

    it('should log welcome email success', async () => {
      await sendWelcomeEmail('success@test.com', 'SUCCESS1');

      const allContent = capturedLogs.join(' ');
      expect(allContent).toContain('Welcome email sent successfully');
      expect(allContent).toContain('success@test.com');
      expect(allContent).toContain('SUCCESS1');
    });
  });

  describe('Error handling', () => {
    it('should handle and log errors in sendNewRegistrationNotification', async () => {
      const errorSpy = spyOn(console, 'error').mockImplementation(() => {});
      
      // Create invalid data to trigger error (simulate email service failure)
      const originalConsoleLog = console.log;
      console.log = () => { throw new Error('Email service unavailable'); };

      await expect(sendNewRegistrationNotification(testRegistration, testAffiliate, testProgram))
        .rejects.toThrow('Email service unavailable');

      expect(errorSpy).toHaveBeenCalledWith('Failed to send new registration notification:', expect.any(Error));

      // Restore console.log
      console.log = originalConsoleLog;
      errorSpy.mockRestore();
    });

    it('should handle and log errors in sendPayoutProcessedNotification', async () => {
      const errorSpy = spyOn(console, 'error').mockImplementation(() => {});
      
      const originalConsoleLog = console.log;
      console.log = () => { throw new Error('Email service down'); };

      await expect(sendPayoutProcessedNotification('test@email.com', 100000, 'paid'))
        .rejects.toThrow('Email service down');

      expect(errorSpy).toHaveBeenCalledWith('Failed to send payout processed notification:', expect.any(Error));

      console.log = originalConsoleLog;
      errorSpy.mockRestore();
    });

    it('should handle and log errors in sendWelcomeEmail', async () => {
      const errorSpy = spyOn(console, 'error').mockImplementation(() => {});
      
      const originalConsoleLog = console.log;
      console.log = () => { throw new Error('Email template error'); };

      await expect(sendWelcomeEmail('test@email.com', 'TEST123'))
        .rejects.toThrow('Email template error');

      expect(errorSpy).toHaveBeenCalledWith('Failed to send welcome email:', expect.any(Error));

      console.log = originalConsoleLog;
      errorSpy.mockRestore();
    });
  });
});