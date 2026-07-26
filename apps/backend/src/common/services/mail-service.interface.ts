export interface IMailService {
  sendVerificationOtp(email: string, otp: string): Promise<void>;
  sendPasswordResetOtp(email: string, otp: string): Promise<void>;
}

export const IMailServiceToken = Symbol('IMailService');
