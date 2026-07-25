import { Resend } from "resend";

import { emailConfig } from "../../config/email.config.js";
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
    lower.includes("verify a domain")
  ) {
    return new EmailDeliveryError(
      "Email could not be delivered. The email provider is in testing mode and can only send to the account owner's address. Verify a domain at resend.com/domains (and update EMAIL_FROM) to email any Gmail or other inbox.",
      providerMessage,
      statusCode,
    );
  }

  if (
    lower.includes("too many requests") ||
    lower.includes("rate limit") ||
    lower.includes("quota")
  ) {
    return new EmailDeliveryError(
      "Email could not be sent because the email provider rate limit or quota was reached. Please try again in a few minutes.",
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
  private client: Resend | null = null;
  private clientKey: string | null = null;

  private escapeHtml(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  private resolveApiKey(): string | null {
    return (
      getResendRuntimeApiKey() ||
      emailConfig.resendApiKey?.trim() ||
      null
    );
  }

  private getClient(): Resend | null {
    const apiKey = this.resolveApiKey();
    if (!apiKey) {
      return null;
    }

    if (!this.client || this.clientKey !== apiKey) {
      this.client = new Resend(apiKey);
      this.clientKey = apiKey;
    }

    return this.client;
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
    if (!this.getClient()) {
      console.error(
        `[email] ${input.logLabel} failed — Resend is not configured\n` +
          `  to: ${input.to}\n` +
          `  link: ${input.logUrl}`,
      );
      throw new EmailDeliveryError(
        "Email service is not configured. Connect Resend in Integration Center or set RESEND_API_KEY.",
        "RESEND_API_KEY not set",
      );
    }

    try {
      const result = await this.sendWithRetry(input);
      console.info(
        `[email] Sent ${input.logLabel} to ${input.to}` +
          (result.id ? ` (id=${result.id})` : ""),
      );
    } catch (error) {
      console.error(`[email] Failed to send ${input.logLabel}:`, error);
      console.error(
        `[email] ${input.logLabel} details\n` +
          `  to: ${input.to}\n` +
          `  link: ${input.logUrl}`,
      );

      if (error instanceof EmailDeliveryError) {
        throw error;
      }

      throw mapProviderError({
        message: error instanceof Error ? error.message : "Unknown email error",
      });
    }
  }

  private async sendWithRetry(input: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ id?: string }> {
    try {
      return await this.sendViaSdk(input);
    } catch (firstError) {
      console.warn("[email] Primary Resend send failed, retrying via fetch:", firstError);
      return this.sendViaFetch(input);
    }
  }

  private async sendViaSdk(input: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ id?: string }> {
    const client = this.getClient();
    if (!client) {
      throw new EmailDeliveryError(
        "Email service is not configured. Set RESEND_API_KEY to send emails.",
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

  private async sendViaFetch(input: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ id?: string }> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${emailConfig.resendApiKey}`,
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
