import { Injectable, Logger } from "@nestjs/common";
import { TelemetrySnapshot as TelemetrySnapshotDto } from "@nos/shared-types";
import { ITelemetryPublisher } from "./telemetry-publisher.interface";

@Injectable()
export class NoOpTelemetryPublisherService implements ITelemetryPublisher {
  private readonly logger = new Logger(NoOpTelemetryPublisherService.name);

  async publish(snapshot: TelemetrySnapshotDto): Promise<void> {
    // NoOp placeholder: Prepares clean architecture boundary for future Redis stream broadcasting
    this.logger.debug(
      `[NoOpPublisher] Received telemetry snapshot [${snapshot.id}] for device [${snapshot.deviceId}]. Stream forwarding deferred.`,
    );
    await Promise.resolve();
  }
}
