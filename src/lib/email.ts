import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

let cachedTransporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (cachedTransporter !== undefined) return cachedTransporter;

  const { EMAIL_SERVER_HOST, EMAIL_SERVER_PORT, EMAIL_SERVER_USER, EMAIL_SERVER_PASSWORD } =
    process.env;

  if (!EMAIL_SERVER_HOST || !EMAIL_SERVER_PORT) {
    cachedTransporter = null;
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host: EMAIL_SERVER_HOST,
    port: Number(EMAIL_SERVER_PORT),
    secure: Number(EMAIL_SERVER_PORT) === 465,
    auth: EMAIL_SERVER_USER
      ? { user: EMAIL_SERVER_USER, pass: EMAIL_SERVER_PASSWORD }
      : undefined,
  });
  return cachedTransporter;
}

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

/** No-ops with a console warning until EMAIL_* env vars are configured. */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}: SendEmailInput): Promise<void> {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM;

  if (!transporter || !from) {
    console.warn(
      `Email not sent (EMAIL_* env vars not configured): "${subject}" to ${to}`,
    );
    return;
  }

  try {
    await transporter.sendMail({ from, to, subject, html, text, replyTo });
  } catch (error) {
    console.error(`Failed to send email "${subject}" to ${to}`, error);
  }
}
