export interface IMailService {
  sendVerificationOtp(email: string, otp: string): Promise<void>;
  sendPasswordResetOtp(email: string, otp: string): Promise<void>;
  sendInvitationEmail(email: string, orgName: string, inviteUrl: string): Promise<void>;
  sendRegistrationKeyNotification(email: string, keyName: string, orgName: string): Promise<void>;
  sendWelcomeEmail(email: string, name: string): Promise<void>;
}

export const IMailServiceToken = Symbol('IMailService');
