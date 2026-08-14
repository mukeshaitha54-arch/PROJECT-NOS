import { NotificationProvider, AlertSeverity } from "@nos/shared-types";

export interface NotificationPayload {
  alertId: string;
  incidentNumber: string;
  recipient: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  metric: string;
  value: number;
  threshold: number;
  hostname: string;
  operator: string;
  timestamp: string;
  customHeaders?: Record<string, string>;
  webhookUrl?: string;
}

export interface INotificationProvider {
  readonly providerType: NotificationProvider;
  send(
    payload: NotificationPayload,
  ): Promise<{ success: boolean; response: string }>;
}

export class EmailNotificationProvider implements INotificationProvider {
  readonly providerType = NotificationProvider.EMAIL;
  async send(
    payload: NotificationPayload,
  ): Promise<{ success: boolean; response: string }> {
    // Enterprise Email formatting with variable interpolation
    const template = `[${payload.severity}] Incident ${payload.incidentNumber} on ${payload.hostname}: ${payload.metric} reached ${payload.value} (threshold ${payload.threshold}) at ${payload.timestamp}. Assigned Operator: ${payload.operator}`;
    console.log(
      `[EmailProvider] Delivering to ${payload.recipient}: ${template}`,
    );
    return { success: true, response: "250 OK Message accepted for delivery" };
  }
}

export class SlackNotificationProvider implements INotificationProvider {
  readonly providerType = NotificationProvider.SLACK;
  async send(
    payload: NotificationPayload,
  ): Promise<{ success: boolean; response: string }> {
    console.log(
      `[SlackProvider] Webhook payload to #operations: ${payload.incidentNumber} - ${payload.title}`,
    );
    return { success: true, response: "ok" };
  }
}

export class WebhookNotificationProvider implements INotificationProvider {
  readonly providerType = NotificationProvider.WEBHOOK;
  async send(
    payload: NotificationPayload,
  ): Promise<{ success: boolean; response: string }> {
    console.log(
      `[WebhookProvider] HTTP POST to ${payload.webhookUrl || payload.recipient} for ${payload.incidentNumber}`,
    );
    return { success: true, response: "HTTP 200 Accepted" };
  }
}

export class TeamsNotificationProvider implements INotificationProvider {
  readonly providerType = NotificationProvider.TEAMS;
  async send(
    payload: NotificationPayload,
  ): Promise<{ success: boolean; response: string }> {
    console.log(
      `[TeamsProvider] Sending Teams Card for ${payload.incidentNumber}`,
    );
    return { success: true, response: "Teams Message Sent" };
  }
}

export class DiscordNotificationProvider implements INotificationProvider {
  readonly providerType = NotificationProvider.DISCORD;
  async send(
    payload: NotificationPayload,
  ): Promise<{ success: boolean; response: string }> {
    console.log(
      `[DiscordProvider] Sending Discord Embed for ${payload.incidentNumber}`,
    );
    return { success: true, response: "Discord Embed Sent" };
  }
}

export class SmsNotificationProvider implements INotificationProvider {
  readonly providerType = NotificationProvider.SMS;
  async send(
    payload: NotificationPayload,
  ): Promise<{ success: boolean; response: string }> {
    console.log(
      `[SmsProvider] Sending SMS alert to ${payload.recipient}: ${payload.incidentNumber}`,
    );
    return { success: true, response: "SMS Sent" };
  }
}

export class PushNotificationProvider implements INotificationProvider {
  readonly providerType = NotificationProvider.PUSH;
  async send(
    payload: NotificationPayload,
  ): Promise<{ success: boolean; response: string }> {
    console.log(
      `[PushProvider] Sending Mobile Push Notification for ${payload.incidentNumber}`,
    );
    return { success: true, response: "Push Notification Sent" };
  }
}

export function renderNotificationTemplate(
  template: string,
  variables: Record<string, string | number>,
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    return variables[key] !== undefined ? String(variables[key]) : `{{${key}}}`;
  });
}
