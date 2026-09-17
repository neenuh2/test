import nodemailer, { type Transporter } from "nodemailer";

/**
 * SMTP transport built from environment variables (spec §4, §8). Works with a
 * transactional provider, BPI Exchange/Outlook relay, or local MailHog. Secrets
 * stay in env only.
 */
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST ?? "localhost";
  const port = Number(process.env.SMTP_PORT ?? "1025");
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    // Only pass auth when credentials are configured (MailHog needs none).
    auth: user ? { user, pass } : undefined,
  });
  return transporter;
}

export const FROM_ADDRESS =
  process.env.SMTP_FROM ?? "Training Team <no-reply@bpi.example>";

/** Send an HTML email. Returns the provider message id on success; throws on failure. */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<string> {
  const info = await getTransporter().sendMail({
    from: FROM_ADDRESS,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
  return info.messageId;
}
