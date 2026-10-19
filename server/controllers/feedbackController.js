import Feedback from "../models/Feedback.js";
import { Resend } from "resend";
import nodemailer from "nodemailer";

/**
 * Handles incoming user feedback and forwards it directly to habitforgev@gmail.com
 * @route POST /api/feedback
 */
export const submitFeedback = async (req, res) => {
  try {
    const { message, rating, category, email, name } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "Please provide a feedback message." });
    }

    const senderEmail = email?.trim() || req.user?.email || "anonymous@habitforge.app";
    const senderName = name?.trim() || req.user?.name || "HabitForge User";
    const safeRating = Number(rating) >= 1 && Number(rating) <= 5 ? Number(rating) : 5;
    const safeCategory = category || "general";

    // 1. Store feedback in MongoDB database
    const feedbackDoc = await Feedback.create({
      userId: req.user?._id || null,
      userEmail: senderEmail,
      userName: senderName,
      rating: safeRating,
      category: safeCategory,
      message: message.trim(),
    });

    // 2. Prepare HTML Email for habitforgev@gmail.com
    const stars = "⭐".repeat(safeRating);
    const emailSubject = `[HabitForge Feedback] ${safeCategory.toUpperCase()} from ${senderName}`;
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #020617; color: #f8fafc; padding: 32px 24px; border-radius: 16px; max-width: 560px; margin: 0 auto; border: 1px solid #1e293b;">
        <div style="border-bottom: 1px solid #1e293b; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="color: #10b981; margin: 0; font-size: 22px;">New User Feedback Received!</h2>
          <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">HabitForge Web Application</p>
        </div>

        <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; border: 1px solid #334155; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="color: #94a3b8; padding: 6px 0; width: 100px;">From:</td>
              <td style="color: #f8fafc; font-weight: 600;">${senderName} (${senderEmail})</td>
            </tr>
            <tr>
              <td style="color: #94a3b8; padding: 6px 0;">Category:</td>
              <td style="color: #38bdf8; font-weight: 600; text-transform: capitalize;">${safeCategory.replace("_", " ")}</td>
            </tr>
            <tr>
              <td style="color: #94a3b8; padding: 6px 0;">Rating:</td>
              <td style="color: #fbbf24; font-size: 16px;">${stars} (${safeRating}/5)</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #1e293b; border-radius: 12px; padding: 20px; border-left: 4px solid #10b981; margin-bottom: 20px;">
          <h4 style="color: #cbd5e1; margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Message:</h4>
          <p style="color: #f8fafc; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${message.trim()}</p>
        </div>

        <p style="font-size: 11px; color: #64748b; margin: 0; text-align: center;">
          Sent to habitforgev@gmail.com from HabitForge Platform
        </p>
      </div>
    `;

    // 3. Dispatch Email to habitforgev@gmail.com
    const targetRecipient = "habitforgev@gmail.com";
    let emailSent = false;

    // Try Resend HTTP API (Port 443)
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const fromAddress = process.env.EMAIL_FROM || "HabitForge <onboarding@resend.dev>";
        await resend.emails.send({
          from: fromAddress,
          to: targetRecipient,
          subject: emailSubject,
          html: emailHtml,
        });
        emailSent = true;
      } catch (err) {
        console.warn("Feedback Resend Notice:", err.message);
      }
    }

    // Try Brevo HTTP API (Port 443) fallback
    if (!emailSent && process.env.BREVO_API_KEY) {
      try {
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": process.env.BREVO_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sender: { name: "HabitForge Feedback", email: "habitforgev@gmail.com" },
            to: [{ email: targetRecipient }],
            subject: emailSubject,
            htmlContent: emailHtml,
          }),
        });
        if (response.ok) emailSent = true;
      } catch (err) {
        console.warn("Feedback Brevo Notice:", err.message);
      }
    }

    // Try SMTP fallback
    if (!emailSent && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });
        await transporter.sendMail({
          from: `"HabitForge" <${process.env.EMAIL_USER}>`,
          to: targetRecipient,
          subject: emailSubject,
          html: emailHtml,
        });
        emailSent = true;
      } catch (err) {
        console.warn("Feedback SMTP Notice:", err.message);
      }
    }

    if (emailSent) {
      feedbackDoc.emailDispatched = true;
      await feedbackDoc.save();
    }

    return res.status(201).json({
      message: "Thank you! Your feedback has been received and forwarded to the HabitForge team.",
      saved: true,
      emailSent,
    });
  } catch (error) {
    console.error("Feedback submission error:", error);
    return res.status(500).json({ message: "Failed to submit feedback. Please try again." });
  }
};