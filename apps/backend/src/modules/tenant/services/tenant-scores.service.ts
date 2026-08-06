import { Injectable } from '@nestjs/common';
import { QuotaEngineService } from './quota-engine.service';
import { UserGovernanceService } from './user-governance.service';
import { AuditEngineService } from './audit-engine.service';
import { AuditSearchRequestDto } from '@nos/shared-types';

export interface TenantHealthReport {
  organizationId: string;
  overallHealthScore: number; // 0 - 100
  securityPostureScore: number; // 0 - 100
  complianceReadinessScore: number; // 0 - 100
  quotaCapacityScore: number; // 0 - 100
  recommendations: Array<{ category: string; priority: 'HIGH' | 'MEDIUM' | 'LOW'; message: string }>;
  timestamp: string;
}

@Injectable()
export class TenantScoresService {
  constructor(
    private readonly quotaService: QuotaEngineService,
    private readonly userService: UserGovernanceService,
    private readonly auditService: AuditEngineService,
  ) {}

  async evaluateHealth(organizationId: string): Promise<TenantHealthReport> {
    const usage = await this.quotaService.getQuotaUsage(organizationId);
    const sessions = await this.userService.listActiveSessions(organizationId);
    
    // Check recent audit activity
    const auditRes = await this.auditService.search({ organizationId, limit: 10 } as AuditSearchRequestDto);

    const recommendations: Array<{ category: string; priority: 'HIGH' | 'MEDIUM' | 'LOW'; message: string }> = [];

    // Calculate quota capacity score (100 is plenty room, 0 is over limit)
    let quotaScore = 100 - usage.percentUsed;
    if (usage.isLimitExceeded) {
      quotaScore = 0;
      recommendations.push({ category: 'Quota', priority: 'HIGH', message: 'Device quota limit exceeded or reached. Upgrade organization tier immediately to prevent ingest blocking.' });
    } else if (usage.isApproachingLimit) {
      recommendations.push({ category: 'Quota', priority: 'MEDIUM', message: 'Device quota usage is above 80%. Plan for expansion.' });
    }

    // Security score calculation based on active session hygiene
    let securityScore = 100;
    const riskySessions = sessions.filter(s => (s.riskScore && s.riskScore > 50) || !s.os || s.os === 'Unknown');
    if (riskySessions.length > 0) {
      securityScore = Math.max(20, 100 - (riskySessions.length * 15));
      recommendations.push({ category: 'Security', priority: 'MEDIUM', message: `Found ${riskySessions.length} active session(s) with elevated risk scores or unidentified OS architecture. Consider forcing session revocation.` });
    }

    // Compliance readiness score based on audit coverage and logging
    let complianceScore = 100;
    if (auditRes.total < 5) {
      complianceScore = 75;
      recommendations.push({ category: 'Compliance', priority: 'LOW', message: 'Low recent audit log volume detected. Ensure tenant context propagation is enabled across all operators and custom scripts.' });
    }

    const overallHealthScore = Math.round((quotaScore + securityScore + complianceScore) / 3);

    return {
      organizationId,
      overallHealthScore,
      securityPostureScore: securityScore,
      complianceReadinessScore: complianceScore,
      quotaCapacityScore: quotaScore,
      recommendations,
      timestamp: new Date().toISOString(),
    };
  }
}
