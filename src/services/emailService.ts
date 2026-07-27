import nodemailer from 'nodemailer';

/**
 * Sends a password reset email to the specified user.
 * If SMTP configuration is missing, it falls back to console logging the details.
 */
export const sendResetEmail = async (email: string, resetUrl: string): Promise<boolean> => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  const mailOptions = {
    from: `"Attendance System" <noreply@company.com>`,
    to: email,
    subject: 'Password Reset Request',
    text: `You requested a password reset. Please click the link below to reset your password:\n\n${resetUrl}\n\nThis link is valid for 1 hour. If you did not request this, please ignore this email.`,
    html: `
      <h3>Password Reset Request</h3>
      <p>You requested a password reset. Please click the link below to reset your password:</p>
      <p><a href="${resetUrl}" target="_blank">${resetUrl}</a></p>
      <br/>
      <p>This link is valid for 1 hour. If you did not request this, please ignore this email.</p>
    `,
  };

  // Graceful fallback for local development without SMTP
  if (!host || !user || !pass) {
    console.warn('⚠️ SMTP settings are missing in .env. Fallback simulation output:');
    console.log('--------------------------------------------------');
    console.log(`To: ${email}`);
    console.log(`Subject: ${mailOptions.subject}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log('--------------------------------------------------');
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail(mailOptions);
    console.log(`✉️ Password reset email sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send password reset email to ${email}:`, error);
    return false;
  }
};
