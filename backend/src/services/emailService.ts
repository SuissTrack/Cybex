import nodemailer from 'nodemailer';
import { logger } from '../lib/logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'localhost',
  port: parseInt(process.env.SMTP_PORT ?? '587', 10),
  auth: process.env.SMTP_USER
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    : undefined,
});

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? 'noreply@kairos.app',
      to: email,
      subject: 'Réinitialisation de votre mot de passe – Kairos',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Kairos – Réinitialisation du mot de passe</h2>
          <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
          <p>Cliquez sur le bouton ci-dessous (valide 1 heure) :</p>
          <a href="${resetUrl}"
             style="display:inline-block;padding:12px 24px;background:#4F46E5;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">
            Réinitialiser mon mot de passe
          </a>
          <p style="margin-top:24px;color:#6B7280;font-size:14px;">
            Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
          </p>
        </div>
      `,
    });
  } catch (err) {
    logger.error('Failed to send password reset email', { err, email });
    // Don't throw — don't reveal email sending failures to caller
  }
}
