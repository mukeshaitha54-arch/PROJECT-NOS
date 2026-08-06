import { apiClient } from '../../../lib/api-client';
import { ApiResponse } from '@nos/shared-types';

export const onboardingApi = {
  async completeOnboarding(data: {
    companyName: string;
    slug: string;
    ownerEmail: string;
    ownerFirstName: string;
    ownerLastName: string;
    timezone: string;
  }): Promise<any> {
    const res = await apiClient.post<any, ApiResponse<any>>('/fleet/onboarding/wizard', data);
    return res.data;
  }
};
