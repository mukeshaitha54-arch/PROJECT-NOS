import { apiClient } from '../../../lib/api-client';
import { ApiResponse, TokenResponsePayload, User } from '@nos/shared-types';
import { RegisterFormValues, LoginFormValues, VerifyEmailFormValues, ForgotPasswordFormValues, ResetPasswordFormValues, ChangePasswordFormValues } from '../schemas/auth.schemas';

export const authApi = {
  register: async (data: RegisterFormValues): Promise<{ message: string; user: User }> => {
    const res = await apiClient.post<any, ApiResponse<{ message: string; user: User }>>('/auth/register', data);
    return res.data!;
  },

  login: async (data: LoginFormValues): Promise<TokenResponsePayload> => {
    const res = await apiClient.post<any, ApiResponse<TokenResponsePayload>>('/auth/login', data);
    return res.data!;
  },

  verifyEmail: async (data: VerifyEmailFormValues): Promise<{ message: string }> => {
    const res = await apiClient.post<any, ApiResponse<{ message: string }>>('/auth/verify-email', data);
    return res.data!;
  },

  forgotPassword: async (data: ForgotPasswordFormValues): Promise<{ message: string }> => {
    const res = await apiClient.post<any, ApiResponse<{ message: string }>>('/auth/forgot-password', data);
    return res.data!;
  },

  resetPassword: async (data: ResetPasswordFormValues): Promise<{ message: string }> => {
    const res = await apiClient.post<any, ApiResponse<{ message: string }>>('/auth/reset-password', data);
    return res.data!;
  },

  changePassword: async (data: Omit<ChangePasswordFormValues, 'confirmPassword'>): Promise<{ message: string }> => {
    const res = await apiClient.post<any, ApiResponse<{ message: string }>>('/auth/change-password', data);
    return res.data!;
  },

  logout: async (): Promise<{ message: string }> => {
    const res = await apiClient.post<any, ApiResponse<{ message: string }>>('/auth/logout', {});
    return res.data!;
  },

  getProfile: async (): Promise<User> => {
    const res = await apiClient.get<any, ApiResponse<User>>('/users/me');
    return res.data!;
  },
};
