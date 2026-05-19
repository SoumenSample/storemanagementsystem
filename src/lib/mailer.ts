import nodemailer, { type SendMailOptions, type Transporter } from "nodemailer";
import { env } from "@/lib/env";

let cachedTransporter: Transporter | null = null;

export function getMailer() {
  if (cachedTransporter) return cachedTransporter;
  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASS) {
    if (env.NODE_ENV === "production") {
      throw new Error("SMTP configuration is missing.");
    }
    return null;
  }
  cachedTransporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
  return cachedTransporter;
}

export async function sendMail(options: SendMailOptions): Promise<unknown> {
  const transporter = getMailer();
  if (!transporter) {
    console.warn("SMTP not configured; skipping email send.");
    return { skipped: true };
  }
  const from = env.SMTP_FROM ?? env.SMTP_USER;
  return transporter.sendMail({ from, ...options });
}
