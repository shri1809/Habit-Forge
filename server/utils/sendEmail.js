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
 * Returns the HTML email template for 18-hour habit check-in reminders.
 *
 * @param {Object} options
 * @param {string} options.userName
 * @param {Array} options.habits
 * @param {string} options.dashboardUrl
 * @returns {string} HTML markup
 */
export const getHabitReminderHtml = ({ userName, habits, dashboardUrl }) => {
  const habitsList = Array.isArray(habits) ? habits : [habits];
  const greetingName = userName ? userName.split(" ")[0] : "Hero";
  const url = dashboardUrl || process.env.CLIENT_URL || "https://habit-forge-six-chi.vercel.app/dashboard";

  const habitItemsHtml = habitsList
    .map((h) => {
      const title = typeof h === "string" ? h : h.title;
      const category = typeof h === "object" && h.category ? h.category : "General";
      const streak = typeof h === "object" && h.currentStreak ? h.currentStreak : 0;
      return `
        <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 14px 16px; margin-bottom: 10px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="vertical-align: middle;">
                <div style="color: #f8fafc; font-size: 15px; font-weight: 700; margin-bottom: 2px;">🎯 ${title}</div>
                <div style="color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">${category}</div>
              </td>
              <td style="text-align: right; vertical-align: middle;">
                <div style="color: #10b981; font-weight: 800; font-size: 13px;">+10 XP</div>
                ${streak > 0 ? `<div style="color: #f59e0b; font-size: 11px; font-weight: 600;">🔥 ${streak}d streak</div>` : ""}
              </td>
            </tr>
          </table>
        </div>
      `;
    })
    .join("");

  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #020617; color: #f8fafc; padding: 32px 24px; border-radius: 16px; max-width: 520px; margin: 0 auto; border: 1px solid #1e293b;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #10b981; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Habit<span style="color: #ffffff;">Forge</span></h1>
      <p style="color: #94a3b8; font-size: 14px; margin-top: 6px;">Consistency shapes your destiny</p>
    </div>

    <div style="background-color: #1e293b; border-radius: 14px; padding: 24px; border: 1px solid #334155;">
      <div style="font-size: 32px; margin-bottom: 8px; text-align: center;">⏰</div>
      <h2 style="color: #f8fafc; font-size: 20px; font-weight: 800; text-align: center; margin: 0 0 10px 0;">
        Time to check in, ${greetingName}!
      </h2>
      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; text-align: center; margin: 0 0 20px 0;">
        It's been over <strong style="color: #10b981;">18 hours</strong> and your habit needs your attention. Complete your task and record your check-in to keep your streak alive!
      </p>

      <div style="margin-bottom: 24px;">
        ${habitItemsHtml}
      </div>

      <div style="text-align: center;">
        <a href="${url}" style="background-color: #10b981; color: #020617; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 28px; border-radius: 10px; display: inline-block;">
          Complete Task & Check In Now →
        </a>
      </div>
    </div>

    <div style="margin-top: 24px; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5;">
      <p style="margin: 0 0 6px 0;">Every check-in grants you XP, levels up your stats, and protects your streak.</p>
      <p style="margin: 0;">Sent with 💚 from <a href="${url}" style="color: #10b981; text-decoration: none;">HabitForge</a></p>
    </div>
  </div>
  `;
};

/**
 * Core multi-provider email dispatcher with graceful fallback:
 * 1. Resend HTTP REST API (Port 443)
 * 2. Brevo (Sendinblue) HTTP API (Port 443)
 * 3. SendGrid HTTP API (Port 443)
 * 4. Nodemailer SMTP
 * 5. Sandbox Console Fallback
 */
export const dispatchEmail = async ({ to, subject, html }) => {
  // 1. Resend HTTP REST API (Standard Port 443 HTTPS - Unblocked on all cloud platforms)
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromAddress = process.env.EMAIL_FROM || "HabitForge <onboarding@resend.dev>";

      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to,
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
          to: [{ email: to }],
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
          personalizations: [{ to: [{ email: to }] }],
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
        to,
        subject,
        html,
      });

      return { provider: "smtp", delivered: true };
    } catch (smtpErr) {
      console.warn(`SMTP email notice: ${smtpErr.message}`);
    }
  }

  // 5. Universal Sandbox Fallback
  console.log(`[EMAIL DISPATCH SANDBOX] Sent to ${to} | Subject: ${subject}`);
  return { provider: "sandbox-fallback", delivered: false };
};

/**
 * Dispatches verification OTP emails.
 *
 * @param {string} email - Recipient email address
 * @param {string} otp - 6-digit numeric OTP code
 */
export const sendVerificationOtpEmail = async (email, otp) => {
  const subject = "Your HabitForge Verification Code";
  const html = getOtpHtml(otp);
  return await dispatchEmail({ to: email, subject, html });
};

/**
 * Dispatches 18-hour check-in reminder emails to users with overdue habits.
 *
 * @param {Object} options
 * @param {string} options.email - Recipient email address
 * @param {string} options.userName - Recipient name
 * @param {Array|Object} options.habits - Array of habit objects or single habit object
 * @param {string} [options.dashboardUrl] - Optional custom URL to dashboard
 */
export const sendHabitReminderEmail = async ({ email, userName, habits, dashboardUrl }) => {
  const habitsList = Array.isArray(habits) ? habits : [habits];
  const singleTitle = habitsList[0]?.title || "your habit";
  const subject = habitsList.length === 1
    ? `⏰ Complete task: "${singleTitle}" & check in on HabitForge`
    : `⏰ Complete tasks: ${habitsList.length} habits waiting for check-in on HabitForge`;

  const html = getHabitReminderHtml({
    userName,
    habits: habitsList,
    dashboardUrl,
  });

  return await dispatchEmail({ to: email, subject, html });
};

// Backward-compatible alias
export const sendVerificationEmail = sendVerificationOtpEmail;
