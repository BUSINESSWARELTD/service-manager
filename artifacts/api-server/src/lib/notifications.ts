import { db, settingsTable } from "@workspace/db";

/**
 * Send SMS notification via Twilio
 */
export async function sendSmsNotification(
  customerPhone: string,
  message: string
): Promise<void> {
  const [settings] = await db.select().from(settingsTable).limit(1);
  if (
    !settings?.twilioAccountSid ||
    !settings?.twilioAuthToken ||
    !settings?.twilioFromNumber
  ) {
    console.log("Twilio not configured, skipping SMS notification");
    return;
  }

  try {
    const accountSid = settings.twilioAccountSid;
    const authToken = settings.twilioAuthToken;
    const from = settings.twilioFromNumber;

    const encoded = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const body = new URLSearchParams({
      From: from,
      To: customerPhone,
      Body: message,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${encoded}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Twilio SMS error:", err);
    } else {
      console.log("SMS sent to", customerPhone);
    }
  } catch (err) {
    console.error("Failed to send SMS:", err);
  }
}

/**
 * Send email notification via Nodemailer-style SMTP
 */
export async function sendEmailNotification(
  customerEmail: string,
  subject: string,
  message: string
): Promise<void> {
  const [settings] = await db.select().from(settingsTable).limit(1);
  if (
    !settings?.emailHost ||
    !settings?.emailUser ||
    !settings?.emailPass
  ) {
    console.log("Email not configured, skipping email notification");
    return;
  }

  try {
    // Dynamic import to avoid startup errors if nodemailer is missing
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: settings.emailHost,
      port: settings.emailPort || 587,
      auth: {
        user: settings.emailUser,
        pass: settings.emailPass,
      },
    });

    await transporter.sendMail({
      from: settings.emailFrom || settings.emailUser,
      to: customerEmail,
      subject,
      text: message,
    });
    console.log("Email sent to", customerEmail);
  } catch (err) {
    console.error("Failed to send email:", err);
  }
}

export function interpolateTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}
