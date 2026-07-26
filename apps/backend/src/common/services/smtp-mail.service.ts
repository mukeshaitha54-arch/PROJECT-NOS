import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IMailService } from './mail-service.interface';

@Injectable()
export class SmtpMailService implements IMailService {
  private readonly logger = new Logger(SmtpMailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly isDev: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isDev = this.configService.get<string>('NODE_ENV') !== 'production';
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`📧 SMTP Transporter initialized: ${host}:${port}`);
    } else {
      this.logger.warn('📧 SMTP credentials not provided; defaulting to Dev Console Logging fallback.');
    }
  }

  async sendVerificationOtp(email: string, otp: string): Promise<void> {
    const subject = 'Verify your NOS Platform Account';
    const text = `Your email verification OTP code is: ${otp}. This code expires in 15 minutes.`;
    
    if (this.transporter) {
      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM', '"NOS Platform" <noreply@nos.internal>'),
        to: email,
        subject,
        text,
      });
      this.logger.log(`📧 Sent Verification OTP email to [${email}] via SMTP.`);
    } else if (this.isDev) {
      this.logger.log(`=======================================================`);
      this.logger.log(`📨 [DEV SMTP FALLBACK] To: ${email} | Subject: ${subject}`);
      this.logger.log(`🔑 OTP CODE: [ ${otp} ]`);
      this.logger.log(`=======================================================`);
    }
  }

  async sendPasswordResetOtp(email: string, otp: string): Promise<void> {
    const subject = 'Reset your NOS Platform Password';
    const text = `Your password reset OTP code is: ${otp}. If you did not request this, please ignore this email.`;

    if (this.transporter) {
      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM', '"NOS Platform" <noreply@nos.internal>'),
        to: email,
        subject,
        text,
      });
      this.logger.log(`📧 Sent Password Reset OTP email to [${email}] via SMTP.`);
    } else if (this.isDev) {
      this.logger.log(`=======================================================`);
      this.logger.log(`📨 [DEV SMTP FALLBACK] To: ${email} | Subject: ${subject}`);
      this.logger.log(`🔑 PASSWORD RESET OTP: [ ${otp} ]`);
      this.logger.log(`=======================================================`);
    }
  }
}
