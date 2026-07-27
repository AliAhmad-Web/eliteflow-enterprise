import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { Resend } from "resend";

import {
  emailConfig,
  getEmailTransportLabel,
  isResendConfigured,
  isSmtpConfigured,
} from "../../config/email.config.js";
import { sendViaGithubEmailRelay } from "./github-email-relay.js";
import { sendViaGmailApi } from "./gmail-api.sender.js";
import { getResendRuntimeApiKey } from "./email-runtime-config.js";

export interface PasswordResetEmailInput {
  to: string;
  firstName: string;
  resetUrl: string;
}

export interface VerificationEmailInput {
  to: string;
  firstName: string;
  verifyUrl: string;
}

export interface OtpEmailInput {
  to: string;
  firstName: string;
  code: string;
  purposeLabel: string;
  expiresInMinutes: number;
}

/** Thrown when the email provider rejects or fails a send. */
export class EmailDeliveryError extends Error {
  readonly providerMessage: string;
  readonly providerCode?: string | number;

  constructor(userMessage: string, providerMessage: string, providerCode?: string | number) {
    super(userMessage);
    this.name = "EmailDeliveryError";
    this.providerMessage = providerMessage;
    this.providerCode = providerCode;
  }
}

function mapProviderError(error: {
  message?: string;
  name?: string;
  statusCode?: number | null;
}): EmailDeliveryError {
  const providerMessage = error.message ?? "Unknown email provider error";
  const lower = providerMessage.toLowerCase();
  const statusCode = error.statusCode ?? undefined;

  if (
    lower.includes("only send testing emails to your own email") ||
    lower.includes("verify a domain") ||
    lower.includes("email address not authorized")
  ) {
    return new EmailDeliveryError(
      "Email could not be delivered. Configure SMTP (for example Gmail App Password via SMTP_HOST/SMTP_USER/SMTP_PASS) so verification works without a custom domain. Resend/Supabase default mailers cannot send to arbitrary inboxes without domain or org membership.",
      providerMessage,
      statusCode,
    );
  }

  if (
    lower.includes("too many requests") ||
    lower.includes("rate limit") ||
    lower.includes("quota") ||
    lower.includes("daily user sending limit")
  ) {
    return new EmailDeliveryError(
      "Email could not be sent because the email provider rate limit or quota was reached. Please try again in a few minutes.",
      providerMessage,
      statusCode,
    );
  }

  if (
    lower.includes("invalid login") ||
    lower.includes("authentication failed") ||
    lower.includes("username and password not accepted")
  ) {
    return new EmailDeliveryError(
      "Email could not be sent because SMTP authentication failed. Check SMTP_USER and SMTP_PASS (use a Gmail App Password, not your normal password).",
      providerMessage,
      statusCode,
    );
  }

  return new EmailDeliveryError(
    `Email could not be sent: ${providerMessage}`,
    providerMessage,
    statusCode,
  );
}

class EmailService {
  private resendClient: Resend | null = null;
  private resendClientKey: string | null = null;
  private smtpTransporter: Transporter | null = null;
  private smtpFingerprint: string | null = null;

  private escapeHtml(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  private resolveResendApiKey(): string | null {
    return (
      getResendRuntimeApiKey() ||
      emailConfig.resendApiKey?.trim() ||
      null
    );
  }

  private getResendClient(): Resend | null {
    const apiKey = this.resolveResendApiKey();
    if (!apiKey) {
      return null;
    }

    if (!this.resendClient || this.resendClientKey !== apiKey) {
      this.resendClient = new Resend(apiKey);
      this.resendClientKey = apiKey;
    }

    return this.resendClient;
  }

  private getSmtpTransporter(): Transporter | null {
    if (!isSmtpConfigured()) {
      return null;
    }

    const fingerprint = [
      emailConfig.smtp.host,
      emailConfig.smtp.port,
      emailConfig.smtp.secure,
      emailConfig.smtp.user,
      emailConfig.smtp.pass,
    ].join("|");

    if (!this.smtpTransporter || this.smtpFingerprint !== fingerprint) {
      this.smtpTransporter = nodemailer.createTransport({
        host: emailConfig.smtp.host,
        port: emailConfig.smtp.port,
        secure: emailConfig.smtp.secure,
        auth: {
          user: emailConfig.smtp.user,
          pass: emailConfig.smtp.pass,
        },
      });
      this.smtpFingerprint = fingerprint;
    }

    return this.smtpTransporter;
  }

  async sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void> {
    const subject = `Reset your ${emailConfig.appName} password`;
    const html = this.buildPasswordResetHtml(input);
    const text = this.buildPasswordResetText(input);

    await this.deliver({
      to: input.to,
      subject,
      html,
      text,
      logLabel: "password reset",
      logUrl: input.resetUrl,
    });
  }

  async sendVerificationEmail(input: VerificationEmailInput): Promise<void> {
    const subject = `Verify your ${emailConfig.appName} email`;
    const html = this.buildVerificationHtml(input);
    const text = this.buildVerificationText(input);

    await this.deliver({
      to: input.to,
      subject,
      html,
      text,
      logLabel: "email verification",
      logUrl: input.verifyUrl,
    });
  }

  async sendOtpEmail(input: OtpEmailInput): Promise<void> {
    const subject = `Your ${emailConfig.appName} verification code`;
    const html = this.buildOtpHtml(input);
    const text = this.buildOtpText(input);

    await this.deliver({
      to: input.to,
      subject,
      html,
      text,
      logLabel: "OTP verification",
      logUrl: `code:${input.code}`,
    });
  }

  /** Generic notification / transactional email (Phase 15). */
  async sendNotificationEmail(input: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    await this.deliver({
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      logLabel: "notification",
      logUrl: input.subject,
    });
  }

  private async deliver(input: {
    to: string;
    subject: string;
    html: string;
    text: string;
    logLabel: string;
    logUrl: string;
  }): Promise<void> {
    const transport = getEmailTransportLabel();
    if (transport === "none") {
      console.error(
        `[email] ${input.logLabel} failed — no SMTP or Resend configured\n` +
          `  to: ${input.to}\n` +
          `  link: ${input.logUrl}`,
      );
      throw new EmailDeliveryError(
        "Email service is not configured. Set GITHUB_EMAIL_RELAY_TOKEN + GITHUB_EMAIL_RELAY_REPO (Railway), GMAIL_OAUTH_REFRESH_TOKEN, SMTP_*, or RESEND_API_KEY.",
        "email transport not configured",
      );
    }

    try {
      const result =
        transport === "gmail_api"
          ? await sendViaGmailApi(input)
          : transport === "github_relay"
            ? await this.sendViaGithubRelayWithRetry(input)
            : transport === "smtp"
              ? await this.sendViaSmtp(input)
              : await this.sendViaResendWithRetry(input);
      console.info(
        `[email] Sent ${input.logLabel} via ${transport} to ${input.to}` +
          (result.id ? ` (id=${result.id})` : ""),
      );
    } catch (error) {
      console.error(`[email] Failed to send ${input.logLabel}:`, error);
      console.error(
        `[email] ${input.logLabel} details\n` +
          `  to: ${input.to}\n` +
          `  link: ${input.logUrl}\n` +
          `  transport: ${transport}`,
      );

      if (error instanceof EmailDeliveryError) {
        throw error;
      }

      throw mapProviderError({
        message: error instanceof Error ? error.message : "Unknown email error",
      });
    }
  }

  private async sendViaGithubRelayWithRetry(input: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ id?: string }> {
    try {
      return await sendViaGithubEmailRelay(input);
    } catch (firstError) {
      console.warn(
        "[email] GitHub relay send failed, retrying once:",
        firstError,
      );
      return sendViaGithubEmailRelay(input);
    }
  }

  private async sendViaSmtp(input: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ id?: string }> {
    const transporter = this.getSmtpTransporter();
    if (!transporter) {
      throw new EmailDeliveryError(
        "SMTP is not configured.",
        "SMTP_HOST/SMTP_USER/SMTP_PASS not set",
      );
    }

    const info = await transporter.sendMail({
      from: emailConfig.fromEmail,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    return { id: typeof info.messageId === "string" ? info.messageId : undefined };
  }

  private async sendViaResendWithRetry(input: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ id?: string }> {
    try {
      return await this.sendViaResendSdk(input);
    } catch (firstError) {
      console.warn("[email] Primary Resend send failed, retrying via fetch:", firstError);
      return this.sendViaResendFetch(input);
    }
  }

  private async sendViaResendSdk(input: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ id?: string }> {
    const client = this.getResendClient();
    if (!client) {
      throw new EmailDeliveryError(
        "Email service is not configured. Set SMTP_* or RESEND_API_KEY.",
        "RESEND_API_KEY not set",
      );
    }

    const { data, error } = await client.emails.send({
      from: emailConfig.fromEmail,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    if (error) {
      throw mapProviderError(error);
    }

    return { id: data?.id };
  }

  private async sendViaResendFetch(input: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ id?: string }> {
    if (!isResendConfigured() && !this.resolveResendApiKey()) {
      throw new EmailDeliveryError(
        "Email service is not configured. Set SMTP_* or RESEND_API_KEY.",
        "RESEND_API_KEY not set",
      );
    }

    const apiKey = this.resolveResendApiKey()!;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailConfig.fromEmail,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    const payload = (await response.json()) as {
      id?: string;
      message?: string;
      name?: string;
      statusCode?: number;
    };

    if (!response.ok) {
      throw mapProviderError({
        message: payload.message ?? `Resend HTTP ${response.status}`,
        name: payload.name,
        statusCode: payload.statusCode ?? response.status,
      });
    }

    return { id: payload.id };
  }

  private buildPasswordResetHtml(input: PasswordResetEmailInput): string {
    const firstName = this.escapeHtml(input.firstName);
    const resetUrl = this.escapeHtml(input.resetUrl);
    const appName = this.escapeHtml(emailConfig.appName);

    return `
      <p>Hi ${firstName},</p>
      <p>We received a request to reset your ${appName} password.</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
    `;
  }

  private buildPasswordResetText(input: PasswordResetEmailInput): string {
    return [
      `Hi ${input.firstName},`,
      "",
      `We received a request to reset your ${emailConfig.appName} password.`,
      `Reset your password: ${input.resetUrl}`,
      "",
      "This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.",
    ].join("\n");
  }

  private buildVerificationHtml(input: VerificationEmailInput): string {
    const firstName = this.escapeHtml(input.firstName);
    const verifyUrl = this.escapeHtml(input.verifyUrl);
    const appName = this.escapeHtml(emailConfig.appName);

    return `
      <p>Hi ${firstName},</p>
      <p>Thanks for signing up for ${appName}. Please verify your email address to activate your account.</p>
      <p><a href="${verifyUrl}">Verify email address</a></p>
      <p>This link expires in 24 hours.</p>
    `;
  }

  private buildVerificationText(input: VerificationEmailInput): string {
    return [
      `Hi ${input.firstName},`,
      "",
      `Thanks for signing up for ${emailConfig.appName}. Please verify your email address to activate your account.`,
      `Verify email: ${input.verifyUrl}`,
      "",
      "This link expires in 24 hours.",
    ].join("\n");
  }

  private buildOtpHtml(input: OtpEmailInput): string {
    const firstName = this.escapeHtml(input.firstName);
    const code = this.escapeHtml(input.code);
    const purposeLabel = this.escapeHtml(input.purposeLabel);

    return `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <p>Hi ${firstName},</p>
        <p>Use the verification code below to complete your ${purposeLabel}.</p>
        <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 24px 0;">${code}</p>
        <p>This code expires in ${input.expiresInMinutes} minutes and can only be used once.</p>
        <p>If you did not request this code, you can safely ignore this email.</p>
      </div>
    `;
  }

  private buildOtpText(input: OtpEmailInput): string {
    return [
      `Hi ${input.firstName},`,
      "",
      `Use the verification code below to complete your ${input.purposeLabel}.`,
      "",
      input.code,
      "",
      `This code expires in ${input.expiresInMinutes} minutes and can only be used once.`,
      "If you did not request this code, you can safely ignore this email.",
    ].join("\n");
  }
}

export const emailService = new EmailService();

export function buildPasswordResetUrl(token: string): string {
  return `${emailConfig.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

export function buildEmailVerificationUrl(token: string): string {
  return `${emailConfig.frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
}
