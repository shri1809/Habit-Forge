import { Resend } from "resend";
import nodemailer from "nodemailer";

/**
 * Returns the HTML email template for 6-digit OTP verification.
 *
 * @param {string} otp - 6-digit numeric OTP code
 * @returns {string} HTML markup
 */
export const getOtpHtml = (otp) => `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 32px 24px; border-radius: 16px; max-width: 520px; margin: 0 auto; border: 1px solid #1e293b;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #10b981; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Habit<span style="color: #ffffff;">Forge</span></h1>
      <p style="color: #94a3b8; font-size: 14px; margin-top: 6px;">Level up your habits and daily routines</p>
    </div>

    <div style="background-color: #1e293b; border-radius: 12px; padding: 24px; border: 1px solid #334155; text-align: center;">
      <p style="margin: 0 0 12px 0; font-size: 14px; color: #cbd5e1;">Your 6-digit account verification code is:</p>
      <div style="background-color: #0f172a; border: 1px solid #10b981; border-radius: 8px; padding: 14px 20px; display: inline-block; margin: 8px 0 16px 0;">
        <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #10b981; display: inline-block;">${otp}</span>
      </div>
      <p style="margin: 0; font-size: 13px; color: #94a3b8;">This code expires in <strong style="color: #f8fafc;">10 minutes</strong>.</p>
    </div>

    <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #1e293b; font-size: 12px; color: #64748b; line-height: 1.5;">
      <p style="margin: 0 0 8px 0;"><strong>Security Notice:</strong> Never share this code with anyone. HabitForge will never ask for your verification code.</p>
      <p style="margin: 0;">If you didn't create a HabitForge account, please disregard this email.</p>
    </div>
  </div>
`;

/**
 * Dispatches verification OTP emails using HTTP-based Email APIs (Resend or SendGrid via port 443).
 * Falls back to SMTP (Nodemailer) or development console if HTTP keys are not provided.
 *
 * @param {string} email - Recipient email address
 * @param {string} otp - 6-digit numeric OTP code
 */
export const sendVerificationOtpEmail = async (email, otp) => {
  const subject = "Your HabitForge Verification Code";
  const html = getOtpHtml(otp);

  // 1. Resend HTTP REST API (Standard Port 443 HTTPS - Unblocked on all cloud platforms)
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromAddress = process.env.EMAIL_FROM || "HabitForge <onboarding@resend.dev>";

      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: email,
        subject,
        html,
      });

      if (error) {
        throw new Error(error.message || JSON.stringify(error));
      }

      return { provider: "resend", id: data?.id, delivered: true };
    } catch (resendErr) {
      console.warn(`Resend HTTP API notice: ${resendErr.message}`);
    }
  }

  // 2. Brevo (Sendinblue) v3 HTTP REST API (Port 443 HTTPS - Works without a custom domain using verified Gmail)
  if (process.env.BREVO_API_KEY) {
    try {
      const senderEmail = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER || "habitforgev@gmail.com";
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: { name: "HabitForge", email: senderEmail },
          to: [{ email }],
          subject,
          htmlContent: html,
        }),
      });

      if (response.ok) {
        return { provider: "brevo", delivered: true };
      }
      const errBody = await response.text();
      console.warn(`Brevo HTTP API notice (${response.status}): ${errBody}`);
    } catch (brevoErr) {
      console.warn(`Brevo error: ${brevoErr.message}`);
    }
  }

  // 3. SendGrid v3 Mail Send HTTP REST API (Port 443 HTTPS)
  if (process.env.SENDGRID_API_KEY) {
    try {
      const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || "no-reply@habitforge.app";

      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }] }],
          from: { email: fromEmail, name: "HabitForge" },
          subject,
          content: [{ type: "text/html", value: html }],
        }),
      });

      if (response.ok) {
        return { provider: "sendgrid", delivered: true };
      }
      const errorText = await response.text();
      console.warn(`SendGrid HTTP API notice (${response.status}): ${errorText}`);
    } catch (sendgridErr) {
      console.warn(`SendGrid error: ${sendgridErr.message}`);
    }
  }

  // 4. Fallback to SMTP if configured
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      const isGmailService = process.env.EMAIL_USER.endsWith("@gmail.com") && !process.env.SMTP_HOST;
      const transportOptions = isGmailService
        ? {
            service: "gmail",
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
          }
        : {
            host: process.env.SMTP_HOST || "smtp.gmail.com",
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_PORT === "465",
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
          };

      const transporter = nodemailer.createTransport(transportOptions);

      await transporter.sendMail({
        from: `"HabitForge" <${process.env.EMAIL_USER}>`,
        to: email,
        subject,
        html,
      });

      return { provider: "smtp", delivered: true };
    } catch (smtpErr) {
      console.warn(`SMTP email notice: ${smtpErr.message}`);
    }
  }

  // 5. Universal Sandbox Fallback: allows ANY email in the world to register for free even without a custom domain
  console.log(`[FREE SANDBOX OTP] Verification Code for ${email}: ${otp}`);
  return { provider: "sandbox-fallback", delivered: false };
};

// Backward-compatible alias
export const sendVerificationEmail = sendVerificationOtpEmail;
