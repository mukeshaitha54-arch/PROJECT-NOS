import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import { IMailService } from "./mail-service.interface";

@Injectable()
export class SmtpMailService implements IMailService {
  private readonly logger = new Logger(SmtpMailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>("SMTP_HOST");
    const port = this.configService.get<number>("SMTP_PORT", 587);
    const user = this.configService.get<string>("SMTP_USER");
    const pass = this.configService.get<string>("SMTP_PASS");
    this.fromAddress = this.configService.get<string>(
      "SMTP_FROM",
      '"NOS Platform" <no-reply@nos.local>',
    );

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 15000,
      });
      // Mask credentials in logs
      const maskedUser = user.replace(/^(.{2})(.*)(@.*)$/, "$1***$3");
      this.logger.log(
        `📧 SMTP Transporter initialized: ${host}:${port} as ${maskedUser}`,
      );
    } else {
      this.logger.warn(
        "📧 SMTP credentials not provided; defaulting to Dev Console Logging fallback.",
      );
    }
  }

  private async sendMailWithRetry(
    mailOptions: nodemailer.SendMailOptions,
    retries = 3,
  ): Promise<void> {
    if (!this.transporter) {
      this.logDevMail(mailOptions);
      return;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.transporter.sendMail(mailOptions);
        this.logger.log(
          `📧 Sent email to [${mailOptions.to}] via SMTP successfully (Subject: ${mailOptions.subject}).`,
        );
        return;
      } catch (error: any) {
        this.logger.warn(
          `Failed to send email to [${mailOptions.to}] (Attempt ${attempt}/${retries}): ${error.message}`,
        );
        if (attempt === retries) {
          this.logger.warn(
            `📧 Exhausted retries sending email to [${mailOptions.to}]. Falling back to Console Dev Mail.`,
          );
          this.logDevMail(mailOptions);
          return;
        }
        await new Promise((res) => setTimeout(res, 500 * attempt)); // Backoff
      }
    }
  }

  private logDevMail(mailOptions: nodemailer.SendMailOptions) {
    this.logger.log("========================================");
    this.logger.log("DEV EMAIL OUTPUT");
    this.logger.log(`To: ${mailOptions.to}`);
    this.logger.log(`Subject: ${mailOptions.subject}`);
    this.logger.log(`Text Body: ${mailOptions.text}`);
    this.logger.log("========================================");
  }

  private getHtmlTemplate(title: string, bodyHtml: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 0; }
          .container { max-w-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          .header { background-color: #1e293b; padding: 30px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
          .content { padding: 40px; color: #334155; line-height: 1.6; font-size: 16px; }
          .footer { background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 13px; color: #64748b; }
          .btn { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container" style="max-width: 600px;">
          <div class="header">
            <h1>NOS Platform</h1>
          </div>
          <div class="content">
            <h2 style="margin-top: 0; color: #0f172a;">${title}</h2>
            ${bodyHtml}
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} NOS Platform. All rights reserved.<br>
            This is an automated message, please do not reply.
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendVerificationOtp(email: string, otp: string): Promise<void> {
    const text = `Your email verification OTP code is: ${otp}. This code expires in 15 minutes.`;
    const html = this.getHtmlTemplate(
      "Verify Your Email Address",
      `<p>Thank you for registering. Please use the following One-Time Password (OTP) to verify your email address. This code is valid for 15 minutes.</p>
       <div style="background-color: #f8fafc; padding: 20px; border-radius: 6px; text-align: center; margin: 30px 0; border: 1px dashed #cbd5e1;">
         <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #2563eb;">${otp}</span>
       </div>
       <p>If you did not request this, please ignore this email.</p>`,
    );

    await this.sendMailWithRetry({
      from: this.fromAddress,
      to: email,
      subject: "Verify your NOS Platform Account",
      text,
      html,
    });
  }

  async sendPasswordResetOtp(email: string, otp: string): Promise<void> {
    const text = `Your password reset OTP code is: ${otp}. This code expires in 15 minutes.`;
    const html = this.getHtmlTemplate(
      "Password Reset Request",
      `<p>We received a request to reset the password for your account. Use the following One-Time Password (OTP) to proceed. This code is valid for 15 minutes.</p>
       <div style="background-color: #f8fafc; padding: 20px; border-radius: 6px; text-align: center; margin: 30px 0; border: 1px dashed #cbd5e1;">
         <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #e11d48;">${otp}</span>
       </div>
       <p>If you did not request this, please ensure your account is secure and ignore this email.</p>`,
    );

    await this.sendMailWithRetry({
      from: this.fromAddress,
      to: email,
      subject: "Reset your NOS Platform Password",
      text,
      html,
    });
  }

  async sendInvitationEmail(
    email: string,
    orgName: string,
    inviteUrl: string,
  ): Promise<void> {
    const text = `You have been invited to join ${orgName} on the NOS Platform. Join here: ${inviteUrl}`;
    const html = this.getHtmlTemplate(
      "Organization Invitation",
      `<p>You have been invited to join <strong>${orgName}</strong> on the NOS Enterprise Platform.</p>
       <p>To accept this invitation and set up your account, please click the button below:</p>
       <div style="text-align: center; margin: 30px 0;">
         <a href="${inviteUrl}" class="btn">Accept Invitation</a>
       </div>
       <p>If the button doesn't work, copy and paste this link into your browser:</p>
       <p style="word-break: break-all; color: #2563eb; font-size: 14px;">${inviteUrl}</p>`,
    );

    await this.sendMailWithRetry({
      from: this.fromAddress,
      to: email,
      subject: `Invitation to join ${orgName}`,
      text,
      html,
    });
  }

  async sendRegistrationKeyNotification(
    email: string,
    keyName: string,
    orgName: string,
  ): Promise<void> {
    const text = `A new agent registration key (${keyName}) has been generated for ${orgName}.`;
    const html = this.getHtmlTemplate(
      "New Registration Key Generated",
      `<p>A new agent deployment Registration Key has been generated in your organization: <strong>${orgName}</strong>.</p>
       <p><strong>Key Details:</strong><br/>
       Name: ${keyName}<br/>
       Date: ${new Date().toUTCString()}</p>
       <p>If this was unexpected, please review your audit logs immediately.</p>`,
    );

    await this.sendMailWithRetry({
      from: this.fromAddress,
      to: email,
      subject: `New Registration Key: ${keyName}`,
      text,
      html,
    });
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const text = `Welcome to NOS Platform, ${name}! Your account has been successfully verified.`;
    const html = this.getHtmlTemplate(
      "Welcome to NOS Platform",
      `<p>Hello ${name},</p>
       <p>Your email has been verified and your account is fully active. You are now ready to start managing your enterprise fleet.</p>
       <p>We recommend starting by completing the Onboarding Wizard to set up your first Organization and deploy your first agent.</p>
       <div style="text-align: center; margin: 30px 0;">
         <a href="#" class="btn">Go to Dashboard</a>
       </div>`,
    );

    await this.sendMailWithRetry({
      from: this.fromAddress,
      to: email,
      subject: "Welcome to NOS Platform",
      text,
      html,
    });
  }
}
