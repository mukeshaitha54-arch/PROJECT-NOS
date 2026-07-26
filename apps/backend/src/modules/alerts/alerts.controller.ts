import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param,
  Query, DefaultValuePipe, ParseIntPipe, UseGuards, Request,
  HttpCode, HttpStatus, ForbiddenException,
} from '@nestjs/common';
import { AlertEngineService } from './services/alert-engine.service';
import { RuleEngineService } from './services/rule-engine.service';
import { AlertHistoryService } from './services/alert-history.service';
import { AlertHealthService } from './services/alert-health.service';
import { NotificationService } from './notification/notification.service';
import { RuleValidationService } from './services/rule-validation.service';
import { RuleSimulationService } from './services/rule-simulation.service';
import { RuleMetricsService } from './services/rule-metrics.service';
import { RuleHealthService } from './services/rule-health.service';
import { RuleAuditService } from './services/rule-audit.service';
import { AlertQueueService } from './queues/queue.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  AlertStatus, AlertSeverity, AlertCategory, UserRole,
  RuleTestTimeframe,
} from '@nos/shared-types';

/**
 * AlertsController — Phase 5 Final Production Hardening
 *
 * All endpoints require JWT authentication.
 * All rule simulation / replay / test ops are audited.
 * Zero controller socket emission.
 *
 * New endpoints added:
 *  SPL 16: POST  /rules/:id/test
 *  SPL 17: POST  /rules/validate
 *  SPL 18: POST  /rules/preview
 *  SPL 19: POST  /rules/dry-run
 *  SPL 20: GET   /rules/:id/diff
 *  SPL 21: GET   /rules/:id/rollback-preview/:version
 *  SPL 22: POST  /rules/:id/replay
 *  SPL 23: GET   /rules/health
 *  SPL 24: GET   /rules/:id/metrics
 *
 *  1% E1:  GET   /rules/:id/complexity
 *  1% E2:  GET   /rules/recommendations
 *  1% E3:  GET   /rules/:id/noise
 *  1% E4:  GET   /rules/:id/usage
 *  1% E5:  GET   /rules/:id/audit
 *
 *  New:  GET   /rules/search
 *  New:  GET   /rules/categories
 *  New:  GET   /rules/tags
 *  New:  POST  /rules/:id/archive
 *  New:  POST  /rules/:id/clone
 *  New:  POST  /rules/:id/rollback/:version
 *  New:  GET   /rules/dependencies
 *  New:  GET   /rules/export
 *  New:  POST  /rules/import
 *  New:  GET   /queue/dashboard
 *  New:  POST  /queue/:queueName/retry/:jobId
 *  New:  DELETE /queue/:queueName/purge  (ADMIN only)
 */
@Controller('api/v1/alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlertsController {
  constructor(
    private readonly alertEngine: AlertEngineService,
    private readonly ruleEngine: RuleEngineService,
    private readonly historyService: AlertHistoryService,
    private readonly healthService: AlertHealthService,
    private readonly notificationService: NotificationService,
    private readonly validationService: RuleValidationService,
    private readonly simulationService: RuleSimulationService,
    private readonly metricsService: RuleMetricsService,
    private readonly ruleHealthService: RuleHealthService,
    private readonly auditService: RuleAuditService,
    private readonly queueService: AlertQueueService,
  ) {}

  // ─── Alert Incidents ────────────────────────────────────

  @Get('overview')
  async getOverview() {
    const alerts = await this.alertEngine.getAlerts({ take: 1000 });
    const list = alerts[0];
    const openAlerts = list.filter((a) => a.status === 'NEW' || a.status === 'OPEN').length;
    const criticalAlerts = list.filter((a) => a.severity === 'CRITICAL' && (a.status === 'NEW' || a.status === 'OPEN')).length;
    const warningAlerts = list.filter((a) => a.severity === 'HIGH' || a.severity === 'MEDIUM').length;
    const acknowledgedAlerts = list.filter((a) => a.status === 'ACKNOWLEDGED').length;
    const resolvedToday = list.filter((a) => a.status === 'RESOLVED').length;
    const totalOccurrences = list.reduce((sum, a) => sum + (a.occurrenceCount || 1), 0);
    return {
      totalAlerts: alerts[1],
      openAlerts,
      criticalAlerts,
      warningAlerts,
      acknowledgedAlerts,
      resolvedToday,
      repeatedIncidentCount: Math.max(0, totalOccurrences - alerts[1]),
    };
  }

  @Get('statistics')
  async getStatistics() {
    return this.alertEngine.getStatistics();
  }

  @Get('health')
  async getHealth() {
    return this.healthService.checkHealth();
  }

  // ─── Legacy Simulation (backward compatible) ─────────────

  @Get('simulate')
  async simulateRuleLegacy(
    @Query('metric') metric = 'cpuUsage',
    @Query('operator') operator = '>',
    @Query('threshold', new DefaultValuePipe(90), ParseIntPipe) threshold: number,
    @Query('timeframeHours', new DefaultValuePipe(24), ParseIntPipe) timeframeHours: number,
  ) {
    // Backward compatible: delegates to dry-run logic
    return this.simulationService.dryRun({ metric, operator, threshold });
  }

  // ─── SPL Feature 23: Rule Health ─────────────────────────

  @Get('rules/health')
  async getRulesHealth() {
    return this.ruleHealthService.checkRuleHealth();
  }

  // ─── Rule Search ──────────────────────────────────────────

  @Get('rules/search')
  async searchRules(
    @Query('name') name?: string,
    @Query('metric') metric?: string,
    @Query('severity') severity?: AlertSeverity,
    @Query('category') category?: string,
    @Query('tags') tags?: string,
    @Query('enabled') enabled?: string,
    @Query('owner') owner?: string,
    @Query('version', new DefaultValuePipe(undefined)) version?: string,
    @Query('ruleStatus') ruleStatus?: string,
    @Query('priority') priority?: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(50), ParseIntPipe) take?: number,
  ) {
    const [rules, total] = await this.ruleEngine.searchRules({
      name,
      metric,
      severity,
      category: category as any,
      tags: tags ? tags.split(',') : undefined,
      enabled: enabled !== undefined ? enabled === 'true' : undefined,
      owner,
      version: version ? parseInt(version) : undefined,
      ruleStatus: ruleStatus as any,
      priority: priority as any,
      skip,
      take,
    });
    return { data: rules, pagination: { total, skip, take } };
  }

  // ─── Categories & Tags ────────────────────────────────────

  @Get('rules/categories')
  async getCategories() {
    return this.ruleEngine.getCategories();
  }

  @Get('rules/tags')
  async getTags() {
    return this.ruleEngine.getTags();
  }

  // ─── Rule Recommendations (1% E2) ─────────────────────────

  @Get('rules/recommendations')
  async getRecommendations() {
    return this.metricsService.getRecommendations();
  }

  // ─── Dependency Graph ──────────────────────────────────────

  @Get('rules/dependencies')
  async getDependencyGraph() {
    return this.ruleEngine.getDependencyGraph();
  }

  // ─── Export / Import ──────────────────────────────────────

  @Get('rules/export')
  async exportRules(@Request() req: any) {
    const performedBy = req.user?.email || 'Unknown';
    return this.ruleEngine.exportRules(performedBy);
  }

  @Post('rules/import')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async importRules(@Body() body: any, @Request() req: any) {
    const performedBy = req.user?.email || 'Unknown';
    return this.ruleEngine.importRules(body, performedBy);
  }

  // ─── SPL Feature 17: Rule Validation ─────────────────────

  @Post('rules/validate')
  @HttpCode(HttpStatus.OK)
  async validateRule(@Body() body: any, @Query('excludeId') excludeId?: string) {
    return this.validationService.validate(body, excludeId);
  }

  // ─── SPL Feature 18: Rule Preview ─────────────────────────

  @Post('rules/preview')
  @HttpCode(HttpStatus.OK)
  async previewRule(@Body() body: any) {
    return this.simulationService.previewRule(body);
  }

  // ─── SPL Feature 19: Dry Run ──────────────────────────────

  @Post('rules/dry-run')
  @HttpCode(HttpStatus.OK)
  async dryRun(@Body() body: any, @Request() req: any) {
    const performedBy = req.user?.email || 'System';
    const ipAddress = req.ip || req.headers?.['x-forwarded-for'];
    const browser = req.headers?.['user-agent'];
    return this.simulationService.dryRun(body, performedBy, undefined, ipAddress, browser);
  }

  // ─── Rule List ────────────────────────────────────────────

  @Get('rules')
  async getRules() {
    return this.ruleEngine.getRules();
  }

  // ─── Rule Create ──────────────────────────────────────────

  @Post('rules')
  @HttpCode(HttpStatus.CREATED)
  async createRule(@Body() body: any, @Request() req: any) {
    const performedBy = req.user?.email || 'System Admin';
    const ipAddress = req.ip || req.headers?.['x-forwarded-for'];
    const browser = req.headers?.['user-agent'];
    return this.ruleEngine.createRule(body, performedBy, undefined, ipAddress, browser);
  }

  // ─── SPL Feature 16: Enterprise Rule Test ────────────────

  @Post('rules/:id/test')
  @HttpCode(HttpStatus.OK)
  async testRule(
    @Param('id') id: string,
    @Body() body: { timeframe?: RuleTestTimeframe; from?: string; to?: string },
    @Request() req: any,
  ) {
    const performedBy = req.user?.email || 'System';
    const ipAddress = req.ip || req.headers?.['x-forwarded-for'];
    const browser = req.headers?.['user-agent'];
    return this.simulationService.testRule(
      { ruleId: id, timeframe: body.timeframe || 'LAST_24H', from: body.from, to: body.to },
      performedBy,
      undefined,
      ipAddress,
      browser,
    );
  }

  // ─── SPL Feature 20: Rule Diff Viewer ─────────────────────

  @Get('rules/:id/diff')
  async getRuleDiff(
    @Param('id') id: string,
    @Query('fromVersion', new DefaultValuePipe(undefined)) fromVersion?: string,
    @Query('toVersion', new DefaultValuePipe(undefined)) toVersion?: string,
  ) {
    return this.ruleEngine.getRuleDiff(
      id,
      fromVersion ? parseInt(fromVersion) : undefined,
      toVersion ? parseInt(toVersion) : undefined,
    );
  }

  // ─── SPL Feature 21: Rollback Preview ─────────────────────

  @Get('rules/:id/rollback-preview/:version')
  async getRollbackPreview(@Param('id') id: string, @Param('version', ParseIntPipe) version: number, @Request() req: any) {
    const performedBy = req.user?.email || 'System';
    return this.ruleEngine.getRollbackPreview(id, version, performedBy);
  }

  // ─── SPL Feature 22: Replay Historical Telemetry ──────────

  @Post('rules/:id/replay')
  @HttpCode(HttpStatus.OK)
  async replayHistoricalTelemetry(
    @Param('id') id: string,
    @Body() body: { from: string; to: string; deviceIds?: string[] },
    @Request() req: any,
  ) {
    const performedBy = req.user?.email || 'System';
    const ipAddress = req.ip || req.headers?.['x-forwarded-for'];
    const browser = req.headers?.['user-agent'];
    return this.simulationService.replayHistoricalTelemetry(
      { ruleId: id, from: body.from, to: body.to, deviceIds: body.deviceIds },
      performedBy,
      undefined,
      ipAddress,
      browser,
    );
  }

  // ─── SPL Feature 24: Rule Performance Metrics ─────────────

  @Get('rules/:id/metrics')
  async getRuleMetrics(@Param('id') id: string) {
    return this.metricsService.getPerformanceMetrics(id);
  }

  // ─── 1% E1: Rule Complexity Breakdown ────────────────────

  @Get('rules/:id/complexity')
  async getRuleComplexity(@Param('id') id: string) {
    const rule = await this.ruleEngine.getRuleById(id);
    if (!rule) return { error: 'Rule not found' };
    return this.metricsService.computeComplexityScore(rule);
  }

  // ─── 1% E3: Rule Noise Score ──────────────────────────────

  @Get('rules/:id/noise')
  async getRuleNoiseScore(@Param('id') id: string) {
    const rule = await this.ruleEngine.getRuleById(id);
    if (!rule) return { error: 'Rule not found' };
    return this.metricsService.computeNoiseScore(rule);
  }

  // ─── 1% E4: Rule Usage Statistics ────────────────────────

  @Get('rules/:id/usage')
  async getRuleUsageStatistics(@Param('id') id: string) {
    return this.metricsService.getUsageStatistics(id);
  }

  // ─── 1% E5: Rule Audit Trail ──────────────────────────────

  @Get('rules/:id/audit')
  async getRuleAuditTrail(
    @Param('id') id: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(50), ParseIntPipe) take: number,
  ) {
    return this.auditService.getAuditTrail(id, skip, take);
  }

  // ─── Rollback Execution ───────────────────────────────────

  @Post('rules/:id/rollback/:version')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async rollbackRule(
    @Param('id') id: string,
    @Param('version', ParseIntPipe) version: number,
    @Body() body: { reason?: string },
    @Request() req: any,
  ) {
    const performedBy = req.user?.email || 'System';
    const ipAddress = req.ip || req.headers?.['x-forwarded-for'];
    const browser = req.headers?.['user-agent'];
    return this.ruleEngine.rollbackToVersion(id, version, performedBy, undefined, ipAddress, browser);
  }

  // ─── Archive Rule ─────────────────────────────────────────

  @Post('rules/:id/archive')
  @HttpCode(HttpStatus.OK)
  async archiveRule(@Param('id') id: string, @Request() req: any) {
    const performedBy = req.user?.email || 'System';
    return this.ruleEngine.archiveRule(id, performedBy);
  }

  // ─── Clone Rule ───────────────────────────────────────────

  @Post('rules/:id/clone')
  @HttpCode(HttpStatus.CREATED)
  async cloneRule(@Param('id') id: string, @Body() body: { newName: string }, @Request() req: any) {
    const performedBy = req.user?.email || 'System';
    return this.ruleEngine.cloneRule(id, body.newName, performedBy);
  }

  // ─── Rule Update ──────────────────────────────────────────

  @Put('rules/:id')
  async updateRule(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    const performedBy = req.user?.email || 'System Admin';
    const ipAddress = req.ip || req.headers?.['x-forwarded-for'];
    const browser = req.headers?.['user-agent'];
    return this.ruleEngine.updateRule(id, body, performedBy, body.reason, undefined, ipAddress, browser);
  }

  // ─── Rule Delete (Hard Delete) ────────────────────────────

  @Delete('rules/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async deleteRule(@Param('id') id: string, @Request() req: any) {
    const performedBy = req.user?.email || 'System';
    return { success: await this.ruleEngine.deleteRule(id, performedBy) };
  }

  // ─── Rule Get By ID ────────────────────────────────────────

  @Get('rules/:id')
  async getRuleById(@Param('id') id: string) {
    return this.ruleEngine.getRuleById(id);
  }

  // ─── Notification DLQ ────────────────────────────────────

  @Get('notifications/dlq')
  async getDlqLogs(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
  ) {
    const [logs, total] = await this.notificationService.getDlqLogs(skip, take);
    return { logs, total, skip, take };
  }

  @Post('notifications/dlq/:id/retry')
  async retryDlq(@Param('id') id: string) {
    return { success: await this.notificationService.retryDlqLog(id) };
  }

  // ─── Queue Dashboard ──────────────────────────────────────

  @Get('queue/dashboard')
  async getQueueDashboard() {
    return this.ruleHealthService.getQueueDashboard();
  }

  @Post('queue/:queueName/retry/:jobId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async retryQueueJob(@Param('queueName') queueName: string, @Param('jobId') jobId: string) {
    const retried = await this.queueService.retryFailedJob(queueName, jobId);
    return { retried, queueName, jobId };
  }

  @Delete('queue/:queueName/purge')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async purgeQueue(@Param('queueName') queueName: string) {
    const purged = await this.queueService.purgeQueue(queueName);
    return { purged, queueName };
  }

  // ─── Alert Incidents ─────────────────────────────────────

  @Get()
  async getAlerts(
    @Query('status') status?: AlertStatus,
    @Query('severity') severity?: AlertSeverity,
    @Query('category') category?: AlertCategory,
    @Query('deviceId') deviceId?: string,
    @Query('search') search?: string,
    @Query('tag') tag?: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take?: number,
    @Query('sortBy') sortBy?: 'createdAt' | 'severity' | 'occurrenceCount',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const [alerts, total] = await this.alertEngine.getAlerts({
      status, severity, category, deviceId, search, tag, skip, take, sortBy, sortOrder,
    });
    return { data: alerts, pagination: { total, skip, take } };
  }

  @Get(':id/details')
  async getAlertById(@Param('id') id: string) {
    return this.alertEngine.getAlertById(id);
  }

  @Get(':id')
  async getAlertByIdShort(@Param('id') id: string) {
    return this.alertEngine.getAlertById(id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: AlertStatus; performedBy?: string; comment?: string },
    @Request() req: any,
  ) {
    const performedBy = body.performedBy || req.user?.email || 'Operator';
    return this.alertEngine.updateAlertStatus(id, body.status, performedBy, body.comment);
  }

  @Patch(':id/snooze')
  async snoozeAlert(
    @Param('id') id: string,
    @Body() body: { minutes: number; performedBy?: string },
    @Request() req: any,
  ) {
    const performedBy = body.performedBy || req.user?.email || 'Operator';
    return this.alertEngine.snoozeAlert(id, body.minutes, performedBy);
  }

  @Post(':id/comment')
  async addComment(
    @Param('id') id: string,
    @Body() body: { userId: string; userName: string; comment: string; isPrivate?: boolean },
    @Request() req: any,
  ) {
    return this.historyService.addOperatorComment({
      alertId: id,
      userId: body.userId || req.user?.sub || 'admin-01',
      userName: body.userName || req.user?.email || 'Operator',
      comment: body.comment,
      isPrivate: body.isPrivate ?? false,
    });
  }

  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  async bulkOperation(
    @Body() body: { alertIds: string[]; action: string; payload?: any; performedBy?: string },
    @Request() req: any,
  ) {
    const performedBy = body.performedBy || req.user?.email || 'Operator';
    return this.alertEngine.bulkOperation(body.alertIds, body.action, body.payload, performedBy);
  }
}
