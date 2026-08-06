import { apiClient } from '../../../lib/api-client';
import {
  ApiResponse,
  AlertStatisticsDto,
  AlertRuleDto,
  RuleTestResultDto,
  RuleValidationResultDto,
  RulePreviewDto,
  DryRunResultDto,
  RuleDiffDto,
  RollbackPreviewDto,
  ReplayResultDto,
  RuleHealthDto,
  RulePerformanceMetricsDto,
  RuleComplexityBreakdownDto,
  RuleNoiseScoreDto,
  RuleUsageStatisticsDto,
  RuleAuditEntryDto,
  RuleRecommendationDto,
  RuleDependencyGraphDto,
  RuleExportDto,
  RuleImportResultDto,
  QueueDashboardDto,
  AlertRuleEnhancedDto,
  AlertSeverity,
  AlertRuleCategory,
  AlertRuleStatus,
  AlertRulePriority,
} from '@nos/shared-types';

export interface AlertQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  severity?: string;
  category?: string;
  deviceId?: string;
  search?: string;
  snoozed?: boolean;
}

export interface RuleSearchParams {
  name?: string;
  metric?: string;
  severity?: AlertSeverity;
  category?: AlertRuleCategory;
  tags?: string;
  enabled?: boolean;
  owner?: string;
  version?: number;
  ruleStatus?: AlertRuleStatus;
  priority?: AlertRulePriority;
  skip?: number;
  take?: number;
}

export const alertApi = {
  // ─── Alert Incidents ─────────────────────────────────────

  async getAlerts(query: AlertQueryParams = {}) {
    const params = new URLSearchParams();
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));
    if (query.status && query.status !== 'ALL') params.append('status', query.status);
    if (query.severity && query.severity !== 'ALL') params.append('severity', query.severity);
    if (query.category && query.category !== 'ALL') params.append('category', query.category);
    if (query.deviceId) params.append('deviceId', query.deviceId);
    if (query.search) params.append('search', query.search.trim());
    if (query.snoozed !== undefined) params.append('snoozed', String(query.snoozed));
    const res = await apiClient.get<any, ApiResponse<{ alerts: any[]; total: number; page: number; totalPages: number }>>(
      `/alerts?${params.toString()}`
    );
    return res.data!;
  },

  async getStatistics(): Promise<AlertStatisticsDto> {
    const res = await apiClient.get<any, ApiResponse<AlertStatisticsDto>>('/alerts/statistics');
    return res.data!;
  },

  async getAlertById(id: string) {
    const res = await apiClient.get<any, ApiResponse<any>>(`/alerts/${id}/details`);
    return res.data!;
  },

  async updateStatus(id: string, status: string, comment = '') {
    const res = await apiClient.patch<any, ApiResponse<any>>(`/alerts/${id}/status`, { status, comment });
    return res.data!;
  },

  async snoozeAlert(id: string, minutes: number) {
    const res = await apiClient.patch<any, ApiResponse<any>>(`/alerts/${id}/snooze`, { minutes });
    return res.data!;
  },

  async addComment(id: string, comment: string) {
    const res = await apiClient.post<any, ApiResponse<any>>(`/alerts/${id}/comment`, { comment });
    return res.data!;
  },

  async bulkOperation(ids: string[], action: 'ACKNOWLEDGE' | 'RESOLVE' | 'SUPPRESS' | 'DELETE') {
    const res = await apiClient.post<any, ApiResponse<any>>('/alerts/bulk', { ids, action });
    return res.data!;
  },

  // ─── Alert Rules ──────────────────────────────────────────

  async getRules(): Promise<AlertRuleEnhancedDto[]> {
    const res = await apiClient.get<any, ApiResponse<AlertRuleEnhancedDto[]>>('/alerts/rules');
    return res.data || [];
  },

  async searchRules(params: RuleSearchParams): Promise<{ data: AlertRuleEnhancedDto[]; pagination: { total: number; skip?: number; take?: number } }> {
    const qs = new URLSearchParams();
    if (params.name) qs.append('name', params.name);
    if (params.metric) qs.append('metric', params.metric);
    if (params.severity) qs.append('severity', params.severity);
    if (params.category) qs.append('category', params.category);
    if (params.tags) qs.append('tags', params.tags);
    if (params.enabled !== undefined) qs.append('enabled', String(params.enabled));
    if (params.owner) qs.append('owner', params.owner);
    if (params.ruleStatus) qs.append('ruleStatus', params.ruleStatus);
    if (params.priority) qs.append('priority', params.priority);
    if (params.skip !== undefined) qs.append('skip', String(params.skip));
    if (params.take !== undefined) qs.append('take', String(params.take));
    const res = await apiClient.get<any>(`/alerts/rules/search?${qs.toString()}`);
    return res.data;
  },

  async getRuleById(id: string): Promise<AlertRuleEnhancedDto> {
    const res = await apiClient.get<any, ApiResponse<AlertRuleEnhancedDto>>(`/alerts/rules/${id}`);
    return res.data!;
  },

  async createRule(data: Partial<AlertRuleEnhancedDto>) {
    const res = await apiClient.post<any, ApiResponse<AlertRuleEnhancedDto>>('/alerts/rules', data);
    return res.data!;
  },

  async updateRule(id: string, data: Partial<AlertRuleEnhancedDto>) {
    const res = await apiClient.put<any, ApiResponse<AlertRuleEnhancedDto>>(`/alerts/rules/${id}`, data);
    return res.data!;
  },

  async deleteRule(id: string) {
    const res = await apiClient.delete<any, ApiResponse<{ success: boolean }>>(`/alerts/rules/${id}`);
    return res.data!;
  },

  async archiveRule(id: string): Promise<AlertRuleEnhancedDto> {
    const res = await apiClient.post<any, ApiResponse<AlertRuleEnhancedDto>>(`/alerts/rules/${id}/archive`, {});
    return res.data!;
  },

  async cloneRule(id: string, newName: string): Promise<AlertRuleEnhancedDto> {
    const res = await apiClient.post<any, ApiResponse<AlertRuleEnhancedDto>>(`/alerts/rules/${id}/clone`, { newName });
    return res.data!;
  },

  async rollbackRule(id: string, version: number, reason?: string): Promise<AlertRuleEnhancedDto> {
    const res = await apiClient.post<any, ApiResponse<AlertRuleEnhancedDto>>(`/alerts/rules/${id}/rollback/${version}`, { reason });
    return res.data!;
  },

  async getCategories(): Promise<string[]> {
    const res = await apiClient.get<any, ApiResponse<string[]>>('/alerts/rules/categories');
    return res.data || [];
  },

  async getTags(): Promise<string[]> {
    const res = await apiClient.get<any, ApiResponse<string[]>>('/alerts/rules/tags');
    return res.data || [];
  },

  async exportRules(): Promise<RuleExportDto> {
    const res = await apiClient.get<any, ApiResponse<RuleExportDto>>('/alerts/rules/export');
    return res.data!;
  },

  async importRules(exportData: RuleExportDto): Promise<RuleImportResultDto> {
    const res = await apiClient.post<any, ApiResponse<RuleImportResultDto>>('/alerts/rules/import', exportData);
    return res.data!;
  },

  async getDependencyGraph(): Promise<RuleDependencyGraphDto> {
    const res = await apiClient.get<any, ApiResponse<RuleDependencyGraphDto>>('/alerts/rules/dependencies');
    return res.data!;
  },

  // ─── SPL 16: Rule Test ────────────────────────────────────

  async testRule(ruleId: string, timeframe: string, from?: string, to?: string): Promise<RuleTestResultDto> {
    const res = await apiClient.post<any, ApiResponse<RuleTestResultDto>>(`/alerts/rules/${ruleId}/test`, { timeframe, from, to });
    return res.data!;
  },

  // ─── SPL 17: Validation ────────────────────────────────────

  async validateRule(data: Partial<AlertRuleEnhancedDto>, excludeId?: string): Promise<RuleValidationResultDto> {
    const url = excludeId ? `/alerts/rules/validate?excludeId=${excludeId}` : '/alerts/rules/validate';
    const res = await apiClient.post<any, ApiResponse<RuleValidationResultDto>>(url, data);
    return res.data!;
  },

  // ─── SPL 18: Preview ──────────────────────────────────────

  async previewRule(data: Partial<AlertRuleEnhancedDto>): Promise<RulePreviewDto> {
    const res = await apiClient.post<any, ApiResponse<RulePreviewDto>>('/alerts/rules/preview', data);
    return res.data!;
  },

  // ─── SPL 19: Dry Run ──────────────────────────────────────

  async dryRun(data: Partial<AlertRuleEnhancedDto>): Promise<DryRunResultDto> {
    const res = await apiClient.post<any, ApiResponse<DryRunResultDto>>('/alerts/rules/dry-run', data);
    return res.data!;
  },

  // ─── SPL 20: Diff ─────────────────────────────────────────

  async getRuleDiff(id: string, fromVersion?: number, toVersion?: number): Promise<RuleDiffDto> {
    let url = `/alerts/rules/${id}/diff`;
    if (fromVersion !== undefined) url += `?fromVersion=${fromVersion}`;
    if (toVersion !== undefined) url += `${fromVersion !== undefined ? '&' : '?'}toVersion=${toVersion}`;
    const res = await apiClient.get<any, ApiResponse<RuleDiffDto>>(url);
    return res.data!;
  },

  // ─── SPL 21: Rollback Preview ─────────────────────────────

  async getRollbackPreview(id: string, version: number): Promise<RollbackPreviewDto> {
    const res = await apiClient.get<any, ApiResponse<RollbackPreviewDto>>(`/alerts/rules/${id}/rollback-preview/${version}`);
    return res.data!;
  },

  // ─── SPL 22: Replay ───────────────────────────────────────

  async replayHistoricalTelemetry(ruleId: string, from: string, to: string, deviceIds?: string[]): Promise<ReplayResultDto> {
    const res = await apiClient.post<any, ApiResponse<ReplayResultDto>>(`/alerts/rules/${ruleId}/replay`, { from, to, deviceIds });
    return res.data!;
  },

  // ─── SPL 23: Health ───────────────────────────────────────

  async getRulesHealth(): Promise<RuleHealthDto> {
    const res = await apiClient.get<any, ApiResponse<RuleHealthDto>>('/alerts/rules/health');
    return res.data!;
  },

  // ─── SPL 24: Performance Metrics ──────────────────────────

  async getRuleMetrics(id: string): Promise<RulePerformanceMetricsDto> {
    const res = await apiClient.get<any, ApiResponse<RulePerformanceMetricsDto>>(`/alerts/rules/${id}/metrics`);
    return res.data!;
  },

  // ─── 1% Enterprise Features ───────────────────────────────

  async getRuleComplexity(id: string): Promise<RuleComplexityBreakdownDto> {
    const res = await apiClient.get<any, ApiResponse<RuleComplexityBreakdownDto>>(`/alerts/rules/${id}/complexity`);
    return res.data!;
  },

  async getRuleNoiseScore(id: string): Promise<RuleNoiseScoreDto> {
    const res = await apiClient.get<any, ApiResponse<RuleNoiseScoreDto>>(`/alerts/rules/${id}/noise`);
    return res.data!;
  },

  async getRuleUsageStatistics(id: string): Promise<RuleUsageStatisticsDto> {
    const res = await apiClient.get<any, ApiResponse<RuleUsageStatisticsDto>>(`/alerts/rules/${id}/usage`);
    return res.data!;
  },

  async getRuleAuditTrail(id: string, skip = 0, take = 50): Promise<{ entries: RuleAuditEntryDto[]; total: number }> {
    const res = await apiClient.get<any, ApiResponse<{ entries: RuleAuditEntryDto[]; total: number }>>(`/alerts/rules/${id}/audit?skip=${skip}&take=${take}`);
    return res.data!;
  },

  async getRecommendations(): Promise<RuleRecommendationDto[]> {
    const res = await apiClient.get<any, ApiResponse<RuleRecommendationDto[]>>('/alerts/rules/recommendations');
    return res.data || [];
  },

  // ─── Notifications & DLQ ─────────────────────────────────

  async getDlqLogs() {
    const res = await apiClient.get<any, ApiResponse<{ logs: any[]; total: number }>>('/alerts/notifications/dlq');
    return res.data!;
  },

  async retryDlq(logId: string) {
    const res = await apiClient.post<any, ApiResponse<{ retried: boolean }>>(`/alerts/notifications/dlq/${logId}/retry`, {});
    return res.data!;
  },

  // ─── Queue Dashboard ──────────────────────────────────────

  async getQueueDashboard(): Promise<QueueDashboardDto> {
    const res = await apiClient.get<any, ApiResponse<QueueDashboardDto>>('/alerts/queue/dashboard');
    return res.data!;
  },

  async retryQueueJob(queueName: string, jobId: string): Promise<{ retried: boolean }> {
    const res = await apiClient.post<any, ApiResponse<{ retried: boolean }>>(`/alerts/queue/${queueName}/retry/${jobId}`, {});
    return res.data!;
  },

  async purgeQueue(queueName: string): Promise<{ purged: number }> {
    const res = await apiClient.delete<any, ApiResponse<{ purged: number }>>(`/alerts/queue/${queueName}/purge`);
    return res.data!;
  },

  // ─── Maintenance Windows ──────────────────────────────────

  async getMaintenanceWindows(deviceId?: string) {
    const url = deviceId ? `/maintenance-windows?deviceId=${deviceId}` : '/maintenance-windows';
    const res = await apiClient.get<any, ApiResponse<any[]>>(url);
    return res.data || [];
  },

  async createMaintenanceWindow(data: { title: string; deviceId?: string; startTime: string; endTime: string; reason?: string }) {
    const res = await apiClient.post<any, ApiResponse<any>>('/maintenance-windows', data);
    return res.data!;
  },

  // ─── Legacy Simulation (backward compatible) ──────────────

  async simulateRule(metric: string, operator: string, threshold: number, timeRangeHours = 24) {
    const res = await apiClient.post<any, ApiResponse<any>>('/alerts/simulate', { metric, operator, threshold, timeRangeHours });
    return res.data!;
  },
};
