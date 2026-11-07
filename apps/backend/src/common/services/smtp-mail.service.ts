import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import { randomBytes } from "crypto";
import { IMailService } from "./mail-service.interface";

@Injectable()
export class SmtpMailService implements IMailService {
  private readonly logger = new Logger(SmtpMailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly fromAddress: string;
  private readonly replyToAddress: string;
  private readonly domain: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>("SMTP_HOST");
    const rawPort = this.configService.get<string | number>("SMTP_PORT", 587);
    const port = Number(rawPort) || 587;
    const user = this.configService.get<string>("SMTP_USER");
    const pass = this.configService.get<string>("SMTP_PASS");

    // Derive reliable from and reply-to addresses to prevent SPF/DKIM/DMARC spoofing rejections
    const configuredFrom = this.configService.get<string>("SMTP_FROM");
    if (configuredFrom && !configuredFrom.includes("nos.local")) {
      this.fromAddress = configuredFrom.includes("<")
        ? configuredFrom
        : `"NOS Platform" <${configuredFrom}>`;
    } else if (user && user.includes("@")) {
      this.fromAddress = `"NOS Platform" <${user}>`;
    } else {
      this.fromAddress = '"NOS Platform" <no-reply@x.nos.is-local.org>';
    }

    // Domain for RFC-5322 Message-ID creation (matches SMTP sender domain)
    const domainMatch = this.fromAddress.match(/@([^>]+)/);
    this.domain = domainMatch ? domainMatch[1] : "gmail.com";
    this.replyToAddress = user && user.includes("@") ? user : this.fromAddress;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: {
          rejectUnauthorized:
            this.configService.get<string>("NODE_ENV") === "production",
        },
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
    const messageId = `<${Date.now()}.${randomBytes(8).toString("hex")}@${this.domain}>`;

    const fullMailOptions: nodemailer.SendMailOptions = {
      ...mailOptions,
      from: mailOptions.from || this.fromAddress,
      replyTo: mailOptions.replyTo || this.replyToAddress,
      messageId,
      date: new Date(),
      headers: {
        "X-Mailer": "NOS Platform Mailer",
        "X-Priority": "3",
        Importance: "Normal",
        "Auto-Submitted": "auto-generated",
        "X-Auto-Response-Suppress": "OOF, AutoReply",
        "X-Report-Abuse-To": this.replyToAddress,
        "List-Unsubscribe": `<mailto:${this.replyToAddress}?subject=unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        ...(mailOptions.headers || {}),
      },
    };

    if (!this.transporter) {
      this.logDevMail(fullMailOptions);
      throw new Error("SMTP credentials not configured.");
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.transporter.sendMail(fullMailOptions);
        this.logger.log(
          `📧 Sent email to [${fullMailOptions.to}] via SMTP successfully (Subject: ${fullMailOptions.subject}).`,
        );
        return;
      } catch (error: any) {
        this.logger.warn(
          `Failed to send email to [${fullMailOptions.to}] (Attempt ${attempt}/${retries}): ${error.message}`,
        );
        if (attempt === retries) {
          this.logger.warn(
            `📧 Exhausted retries sending email to [${fullMailOptions.to}]. Falling back to Console Dev Mail.`,
          );
          this.logDevMail(fullMailOptions);
          throw error;
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

  /**
   * Generates clean, professional, high-deliverability transactional HTML.
   * Adheres to strict anti-spam guidelines: balanced text/HTML ratio, semantic table structure,
   * inline CSS, clear organizational attribution, and compliant CAN-SPAM/GDPR transactional footer.
   */
  private getHtmlTemplate(
    title: string,
    bodyHtml: string,
    recipientEmail: string,
    actionDisclaimer = "If you did not request this communication, please disregard it.",
    preheaderText?: string,
  ): string {
    const preview = preheaderText || title;
    return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no"/>
  <title>${title}</title>
  <style type="text/css">
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased; }
    table { border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; }
    a { color: #f47b36; text-decoration: none; }
    .otp-code { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #f47b36; background: #fff8f2; padding: 16px 28px; border-radius: 8px; border: 1px solid #fed7aa; display: inline-block; margin: 16px 0; }
    .btn-action { display: inline-block; background: #f47b36; color: #ffffff !important; padding: 13px 28px; font-size: 14px; font-weight: 700; border-radius: 8px; text-decoration: none; margin: 16px 0; }
    .footer-text { font-size: 12px; color: #64748b; line-height: 18px; text-align: center; }
  </style>
</head>
<body style="margin: 0; padding: 32px 12px; background-color: #f8fafc;">
  <!-- Preheader text (inbox preview) -->
  <span style="display:none !important;visibility:hidden;mso-hide:all;font-size:1px;color:#f8fafc;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${preview}
  </span>

  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.04);">
          <!-- Header Bar -->
          <tr>
            <td style="padding: 24px 32px; background-color: #ffffff; border-bottom: 2px solid #fff1e6;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display: inline-block; width: 28px; height: 28px; background-color: #f47b36; color: #ffffff; font-weight: 900; font-size: 15px; line-height: 28px; text-align: center; border-radius: 6px; margin-right: 8px; vertical-align: middle;">N</span>
                    <span style="font-size: 18px; font-weight: 800; letter-spacing: 0.5px; color: #0f172a; vertical-align: middle;">NOS</span>
                    <span style="font-size: 11px; font-weight: 700; color: #f47b36; background-color: #fff7ed; border: 1px solid #ffedd5; padding: 2px 6px; border-radius: 4px; margin-left: 8px; vertical-align: middle; text-transform: uppercase;">Zero-Trust Fleet</span>
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Security Notification</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px; color: #334155; font-size: 15px; line-height: 24px;">
              <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a; line-height: 28px;">${title}</h1>
              ${bodyHtml}
              <div style="margin: 24px 0 0 0; padding: 14px 16px; background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; font-size: 12px; color: #64748b; line-height: 18px;">
                <strong>Security Notice:</strong> ${actionDisclaimer} NOS will never ask for your account password or encryption keys in an email.
              </div>
            </td>
          </tr>

          <!-- Security Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
              <p class="footer-text" style="margin: 0 0 6px 0;">
                This message was sent to <strong>${recipientEmail}</strong> as an authorized transactional event.
              </p>
              <p class="footer-text" style="margin: 0; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} NOS Platform Operations &bull; Zero-Trust Fleet Monitoring &bull; All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  async sendVerificationOtp(email: string, otp: string): Promise<void> {
    const text = `Your NOS account security verification code is: ${otp}

This single-use code is valid for 15 minutes.
Enter this code in your browser to complete account verification.

Recipient: ${email}
Timestamp: ${new Date().toUTCString()}

If you did not create a NOS account, you can safely ignore this email.
NOS Security Operations - Real-time Fleet Telemetry`;

    const html = this.getHtmlTemplate(
      "Account Verification Code",
      `<p style="margin: 0 0 16px 0;">Thank you for registering with NOS. Please use the following single-use verification code to complete your security confirmation.</p>
       <div style="text-align: center; margin: 20px 0;">
         <span class="otp-code">${otp}</span>
       </div>
       <p style="margin: 0; font-size: 13px; color: #94a3b8;">This code expires in <strong>15 minutes</strong> and can only be used once.</p>`,
      email,
      "If you did not request this registration, no further action is required and your address will not be retained.",
    );

    await this.sendMailWithRetry({
      from: this.fromAddress,
      to: email,
      subject: `Your NOS verification code: ${otp}`,
      text,
      html,
    });
  }

  async sendPasswordResetOtp(email: string, otp: string): Promise<void> {
    const text = `A password reset request was initiated for your NOS account.

Your single-use password reset code is: ${otp}

This code expires in 15 minutes.
Enter this code in the password recovery window to choose a new password.

Recipient: ${email}
Timestamp: ${new Date().toUTCString()}

If you did not request a password reset, your account credentials remain unchanged. Please ensure your account is protected.
NOS Security Operations - Real-time Fleet Telemetry`;

    const html = this.getHtmlTemplate(
      "Password Reset Code",
      `<p style="margin: 0 0 16px 0;">We received a request to reset the password for your NOS account. Enter the verification code below to proceed with setting a new password.</p>
       <div style="text-align: center; margin: 20px 0;">
         <span class="otp-code">${otp}</span>
       </div>
       <p style="margin: 0; font-size: 13px; color: #94a3b8;">This code expires in <strong>15 minutes</strong>.</p>`,
      email,
      "If you did not submit this request, your password has not been altered. You can disregard this email.",
    );

    await this.sendMailWithRetry({
      from: this.fromAddress,
      to: email,
      subject: `NOS Password Reset Code: ${otp}`,
      text,
      html,
    });
  }

  async sendInvitationEmail(
    email: string,
    orgName: string,
    inviteUrl: string,
  ): Promise<void> {
    const text = `Hello,

You have been invited to join ${orgName} on the NOS Zero-Trust Fleet Platform.

To accept this invitation and access the device monitoring fleet, open the following link in your browser:
${inviteUrl}

Invitation Details:
• Organization: ${orgName}
• Recipient: ${email}
• Expiration: 7 days
• Security: Single-use cryptographic token

If you were not expecting this invitation or do not recognize ${orgName}, you can safely disregard this message. No account will be created.

Regards,
NOS Platform Operations
https://x.nos.is-local.org`;

    const html = this.getHtmlTemplate(
      `Invitation to join ${orgName}`,
      `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 24px; color: #334155;">Hello,</p>
       <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 24px; color: #334155;">
         An administrator at <strong>${orgName}</strong> has invited you to collaborate on their organization&apos;s devices using the <strong>NOS Zero-Trust Fleet Monitoring Platform</strong>.
       </p>
       <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: #334155;">
         Click the button below to accept your invitation and join the workspace:
       </p>
       <div style="text-align: center; margin: 28px 0;">
         <a href="${inviteUrl}" class="btn-action" target="_blank" style="background-color: #f47b36; color: #ffffff !important; padding: 14px 32px; font-size: 14px; font-weight: 700; border-radius: 8px; text-decoration: none; display: inline-block;">
           Accept Invitation &amp; Join Fleet &rarr;
         </a>
       </div>
       <p style="margin: 24px 0 6px 0; font-size: 12px; color: #64748b; line-height: 18px;">
         Direct link: <a href="${inviteUrl}" style="color: #f47b36; word-break: break-all;">${inviteUrl}</a>
       </p>`,
      email,
      `This invitation was dispatched on behalf of ${orgName}. If you do not recognize this organization, no action is needed.`,
      `You were invited to join ${orgName} on NOS Fleet Platform`,
    );

    await this.sendMailWithRetry({
      from: this.fromAddress,
      to: email,
      subject: `${orgName} invited you to join their fleet on NOS`,
      text,
      html,
    });
  }

  async sendRegistrationKeyNotification(
    email: string,
    keyName: string,
    orgName: string,
  ): Promise<void> {
    const text = `Notice: A new agent registration key was created in ${orgName}.

Key Name: ${keyName}
Organization: ${orgName}
Date: ${new Date().toUTCString()}

If this was not authorized by your security team, inspect your audit log immediately in the NOS Command Center.
NOS Security Operations`;

    const html = this.getHtmlTemplate(
      "Agent Registration Key Generated",
      `<p style="margin: 0 0 16px 0;">A new agent registration key (<strong>${keyName}</strong>) has been generated in organization <strong>${orgName}</strong>.</p>
       <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin: 16px 0;">
         <p style="margin: 0; font-size: 13px; color: #94a3b8;"><strong>Key Name:</strong> <span style="color: #f8fafc;">${keyName}</span></p>
         <p style="margin: 8px 0 0 0; font-size: 13px; color: #94a3b8;"><strong>Timestamp:</strong> <span style="color: #f8fafc;">${new Date().toUTCString()}</span></p>
       </div>
       <p style="margin: 16px 0 0 0; font-size: 13px; color: #f59e0b;">If this deployment key was not requested by an administrator, please review your active audit logs immediately.</p>`,
      email,
      "This is an automated operational notification regarding your enterprise organization.",
    );

    await this.sendMailWithRetry({
      from: this.fromAddress,
      to: email,
      subject: `Security Notice: Agent key created for ${orgName}`,
      text,
      html,
    });
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const text = `Welcome to NOS Platform, ${name}!

Your account is confirmed and fully active. You can now enroll agents, monitor node telemetry, and manage your fleet.

Access the command center: http://x.nos.is-local.org/dashboard

Recipient: ${email}
NOS Security Operations`;

    const html = this.getHtmlTemplate(
      `Welcome to NOS, ${name}`,
      `<p style="margin: 0 0 16px 0;">Hello <strong>${name}</strong>,</p>
       <p style="margin: 0 0 16px 0;">Your email address has been verified and your account is active. You are ready to deploy your first agent and monitor fleet telemetry in real time.</p>
       <div style="text-align: center; margin: 24px 0;">
         <a href="/dashboard" class="btn-action">Open Command Center</a>
       </div>`,
      email,
      "Thank you for securing your infrastructure with NOS Platform.",
    );

    await this.sendMailWithRetry({
      from: this.fromAddress,
      to: email,
      subject: `Welcome to NOS Platform, ${name}`,
      text,
      html,
    });
  }
}
