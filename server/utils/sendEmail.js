import nodemailer from "nodemailer";

/**
 * Sends a high-contrast 6-digit OTP verification email.
 * Does not include auto-login sessions or verification links.
 *
 * @param {string} email - Recipient email address
 * @param {string} otp - 6-digit numeric OTP code
 */
export const sendVerificationOtpEmail = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"HabitForge" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your HabitForge Verification Code",
    html: `
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
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Backward-compatible alias
export const sendVerificationEmail = sendVerificationOtpEmail;
