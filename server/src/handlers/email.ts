import { type Registration, type User, type Program } from '../schema';

export async function sendNewRegistrationNotification(registration: Registration, affiliate: User, program: Program): Promise<void> {
  try {
    // Format registration date for email
    const registrationDate = registration.registration_date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Format commission amount to Indonesian currency
    const commissionFormatted = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(registration.commission_amount);

    // Format program fee to Indonesian currency
    const programFeeFormatted = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(program.fee);

    // Create email content with detailed registration information
    const emailSubject = `🎯 Pendaftaran Baru - ${program.name} melalui Affiliate ${affiliate.full_name}`;
    
    const emailContent = `
Halo Admin,

Ada pendaftaran baru yang masuk melalui sistem affiliate:

📋 DETAIL PENDAFTARAN:
- ID Registrasi: #${registration.id}
- Nama Siswa: ${registration.student_name}
- Email Siswa: ${registration.student_email}
- Telepon Siswa: ${registration.student_phone}
- Tanggal Daftar: ${registrationDate}
- Status: ${registration.status === 'pending' ? 'Menunggu Verifikasi Pembayaran' : 'Pembayaran Terverifikasi'}

🎯 DETAIL PROGRAM:
- Program: ${program.name}
- Tipe: ${program.type}
- Biaya Program: ${programFeeFormatted}
- Deskripsi: ${program.description || 'Tidak ada deskripsi'}

👤 DETAIL AFFILIATE:
- Nama Affiliate: ${affiliate.full_name}
- Email Affiliate: ${affiliate.email}
- Kode Affiliate: ${affiliate.affiliate_code}
- Komisi yang Diperoleh: ${commissionFormatted}
- Tipe Komisi: ${program.commission_type === 'percentage' ? 'Persentase' : 'Nominal Tetap'} (${program.commission_rate}${program.commission_type === 'percentage' ? '%' : ''})

Silakan segera lakukan verifikasi pembayaran jika diperlukan.

Terima kasih,
Sistem Affiliate Management
    `.trim();

    // In a real implementation, this would use an email service like SendGrid, AWS SES, or Nodemailer
    // For now, we'll log the email content and simulate successful sending
    console.log('=== EMAIL NOTIFICATION ===');
    console.log('To: admin@example.com');
    console.log('Subject:', emailSubject);
    console.log('Content:', emailContent);
    console.log('========================');

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log(`✅ New registration notification sent successfully for registration #${registration.id}`);
  } catch (error) {
    console.error('Failed to send new registration notification:', error);
    throw error;
  }
}

export async function sendPayoutProcessedNotification(affiliateEmail: string, payoutAmount: number, status: string): Promise<void> {
  try {
    // Format payout amount to Indonesian currency
    const amountFormatted = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(payoutAmount);

    // Determine status message in Indonesian
    const statusMessage = status === 'paid' ? 'BERHASIL DIPROSES' : 'SEDANG DIPROSES';
    const statusEmoji = status === 'paid' ? '✅' : '⏳';

    // Create email subject based on status
    const emailSubject = `${statusEmoji} Update Status Payout - ${amountFormatted}`;

    // Create email content with payout information
    const emailContent = `
Halo Partner Affiliate,

Status permintaan payout Anda telah diperbarui:

💰 DETAIL PAYOUT:
- Jumlah: ${amountFormatted}
- Status: ${statusMessage}
- Tanggal Update: ${new Date().toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}

${status === 'paid' ? `
🎉 Selamat! Payout Anda telah berhasil diproses.
Dana akan segera masuk ke rekening yang Anda daftarkan.

Terima kasih atas kerja sama Anda sebagai partner affiliate!
` : `
⏳ Payout Anda sedang dalam proses.
Tim kami akan segera memproses permintaan payout Anda.

Mohon bersabar dan terima kasih atas pengertiannya.
`}

Jika ada pertanyaan, silakan hubungi tim support kami.

Salam sukses,
Tim Affiliate Management
    `.trim();

    // In a real implementation, this would use an email service
    console.log('=== PAYOUT NOTIFICATION ===');
    console.log('To:', affiliateEmail);
    console.log('Subject:', emailSubject);
    console.log('Content:', emailContent);
    console.log('===========================');

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log(`✅ Payout notification sent successfully to ${affiliateEmail} - Status: ${status}`);
  } catch (error) {
    console.error('Failed to send payout processed notification:', error);
    throw error;
  }
}

export async function sendWelcomeEmail(userEmail: string, affiliateCode: string | null): Promise<void> {
  try {
    if (!affiliateCode) {
      // If no affiliate code, this is likely an admin user, skip welcome email
      console.log(`Skipping welcome email for ${userEmail} - No affiliate code provided`);
      return;
    }

    // Generate affiliate link (in real implementation, this would be the actual domain)
    const affiliateLink = `https://example.com/register?ref=${affiliateCode}`;

    const emailSubject = `🎉 Selamat Datang di Program Affiliate Kami!`;

    const emailContent = `
Selamat datang di Program Affiliate!

Terima kasih telah bergabung dengan program affiliate kami. Berikut adalah informasi penting untuk memulai:

🔗 LINK AFFILIATE ANDA:
${affiliateLink}

📝 KODE AFFILIATE ANDA:
${affiliateCode}

🚀 CARA MEMULAI:
1. Bagikan link affiliate Anda kepada teman, keluarga, dan jaringan Anda
2. Setiap pendaftaran melalui link Anda akan menghasilkan komisi
3. Pantau statistik dan komisi Anda melalui dashboard
4. Ajukan payout ketika saldo komisi sudah mencukupi

💰 KEUNTUNGAN MENJADI AFFILIATE:
- Dapatkan komisi dari setiap pendaftaran yang berhasil
- Sistem tracking otomatis dan real-time
- Dashboard lengkap untuk monitoring performa
- Payout fleksibel sesuai kebutuhan Anda

📱 TIPS SUKSES:
- Bagikan di media sosial dengan konten yang menarik
- Jelaskan manfaat program kepada calon siswa
- Gunakan cerita personal untuk membangun trust
- Konsisten dalam promosi

🆘 BANTUAN:
Jika ada pertanyaan atau butuh bantuan, jangan ragu untuk menghubungi tim support kami.

Mari bersama-sama meraih kesuksesan!

Salam hangat,
Tim Affiliate Management

---
Link Affiliate Anda: ${affiliateLink}
Kode Affiliate: ${affiliateCode}
    `.trim();

    // In a real implementation, this would use an email service
    console.log('=== WELCOME EMAIL ===');
    console.log('To:', userEmail);
    console.log('Subject:', emailSubject);
    console.log('Content:', emailContent);
    console.log('=====================');

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log(`✅ Welcome email sent successfully to ${userEmail} with affiliate code: ${affiliateCode}`);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    throw error;
  }
}