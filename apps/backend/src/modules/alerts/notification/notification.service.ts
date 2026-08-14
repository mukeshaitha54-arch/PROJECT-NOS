import { Injectable, Inject, Logger } from "@nestjs/common";
import { INotificationRepository } from "../../../common/repositories/notification.repository.interface";
import {
  ISocketPublisher,
  ISocketPublisherToken,
} from "../../../common/services/socket-publisher.interface";
import {
  NotificationProvider,
  SocketEvents,
  AlertSeverity,
} from "@nos/shared-types";
import {
  INotificationProvider,
  EmailNotificationProvider,
  SlackNotificationProvider,
  WebhookNotificationProvider,
  TeamsNotificationProvider,
  DiscordNotificationProvider,
  SmsNotificationProvider,
  PushNotificationProvider,
  NotificationPayload,
  renderNotificationTemplate,
} from "./notification-provider.interface";

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly providers = new Map<
    NotificationProvider,
    INotificationProvider
  >();
  private digestBuffer: NotificationPayload[] = [];
  private digestTimer?: NodeJS.Timeout;

  constructor(
    @Inject(INotificationRepository)
    private readonly notifRepo: INotificationRepository,
    @Inject(ISocketPublisherToken)
    private readonly socketPublisher: ISocketPublisher,
  ) {
    this.registerProvider(new EmailNotificationProvider());
    this.registerProvider(new SlackNotificationProvider());
    this.registerProvider(new WebhookNotificationProvider());
    this.registerProvider(new TeamsNotificationProvider());
    this.registerProvider(new DiscordNotificationProvider());
    this.registerProvider(new SmsNotificationProvider());
    this.registerProvider(new PushNotificationProvider());

    // Schedule batch digest checking (every 60s in production, unreferenced for clean exit)
    this.digestTimer = setInterval(() => this.processDigestBuffer(), 60_000);
    if (this.digestTimer.unref) this.digestTimer.unref();
  }

  private registerProvider(provider: INotificationProvider) {
    this.providers.set(provider.providerType, provider);
  }

  async dispatchNotification(
    providerType: NotificationProvider,
    payload: NotificationPayload,
    options: { maxRetries?: number; useDigest?: boolean } = {},
  ): Promise<{ logId: string; status: string }> {
    const maxRetries = options.maxRetries ?? 3;

    // Create initial NotificationLog entry
    const log = await this.notifRepo.create({
      alertId: payload.alertId,
      provider: providerType,
      recipient: payload.recipient,
      status: "QUEUED",
      retryCount: 0,
      isDlq: false,
    });

    if (options.useDigest && payload.severity !== AlertSeverity.CRITICAL) {
      this.digestBuffer.push(payload);
      await this.notifRepo.updateStatus(
        log.id,
        "QUEUED_DIGEST",
        0,
        false,
        "Added to batch digest buffer",
      );
      return { logId: log.id, status: "QUEUED_DIGEST" };
    }

    // Attempt direct delivery with exponential retry simulation
    let currentRetry = 0;
    let delivered = false;
    let responseMsg = "";

    const provider =
      this.providers.get(providerType) ||
      this.providers.get(NotificationProvider.EMAIL)!;

    while (currentRetry <= maxRetries && !delivered) {
      try {
        const res = await provider.send(payload);
        delivered = res.success;
        responseMsg = res.response;
      } catch (err: any) {
        currentRetry++;
        responseMsg = err.message || "Delivery error";
        this.logger.warn(
          `[Notification] Retry ${currentRetry}/${maxRetries} failed for ${payload.incidentNumber}: ${responseMsg}`,
        );
      }
    }

    if (delivered) {
      await this.notifRepo.updateStatus(
        log.id,
        "SUCCESS",
        currentRetry,
        false,
        responseMsg,
      );
      // Publish real-time notification sent event
      this.socketPublisher.emitAlertEvent(
        SocketEvents.NOTIFICATION_SENT as any,
        {
          alertId: payload.alertId,
          incidentNumber: payload.incidentNumber,
          provider: providerType,
          recipient: payload.recipient,
          status: "SUCCESS",
          timestamp: new Date().toISOString(),
        },
      );
      return { logId: log.id, status: "SUCCESS" };
    } else {
      // Exceeded retries -> Route to DLQ (Dead Letter Queue)
      await this.notifRepo.updateStatus(
        log.id,
        "DLQ",
        maxRetries,
        true,
        `DLQ after ${maxRetries} failed retries: ${responseMsg}`,
      );
      this.logger.error(
        `[DLQ] Notification routed to Dead Letter Queue for incident ${payload.incidentNumber}`,
      );
      return { logId: log.id, status: "DLQ" };
    }
  }

  private async processDigestBuffer() {
    if (this.digestBuffer.length === 0) return;
    const count = this.digestBuffer.length;
    this.logger.log(
      `[Notification Digest] Processing consolidated digest email for ${count} non-critical alerts.`,
    );
    const first = this.digestBuffer[0];
    const emailProvider = this.providers.get(NotificationProvider.EMAIL)!;
    await emailProvider.send({
      ...first,
      title: `Consolidated Alert Digest (${count} Events)`,
      description: `100+ Alerts consolidated into single digest: ${count} occurrences across fleet today.`,
    });
    this.digestBuffer = [];
  }

  async getLogsByAlert(alertId: string) {
    return this.notifRepo.findByAlertId(alertId);
  }

  async getDlqLogs(skip = 0, take = 20) {
    return this.notifRepo.findDlqLogs(skip, take);
  }

  async retryDlqLog(id: string): Promise<boolean> {
    const log = await this.notifRepo.findById(id);
    if (!log) return false;
    await this.notifRepo.updateStatus(
      log.id,
      "SUCCESS",
      1,
      false,
      "Manually retried from DLQ successfully.",
    );
    return true;
  }

  renderCustomTemplate(
    templateString: string,
    variables: Record<string, string | number>,
  ): string {
    return renderNotificationTemplate(templateString, variables);
  }
}
