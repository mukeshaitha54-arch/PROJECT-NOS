import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException, BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import * as crypto from "crypto";
import { DeviceService } from "./device.service";
import { IDeviceRepositoryToken } from "../../common/repositories/device.repository.interface";
import { IHeartbeatRepositoryToken } from "../../common/repositories/heartbeat.repository.interface";
import { IDeviceAuthenticatorToken } from "../../common/services/device-authenticator.interface";
import { HeartbeatPresenceService } from "../realtime/services/heartbeat-presence.service";
import { DeviceTimelineService } from "./services/device-timeline.service";
import { RegistrationKeyService } from "../fleet/services/registration-key.service";
import { RegisterDeviceDto } from "./dto/device.dto";
import { DeviceStatus } from "@prisma/client";

describe("DeviceService - Anti-Takeover & Registration Security", () => {
  let service: DeviceService;
  let mockDeviceRepo: any;
  let mockRegistrationKeyService: any;

  const existingDeviceToken = "valid-secret-device-token-12345678";
  const existingTokenHash = crypto
    .createHash("sha256")
    .update(existingDeviceToken)
    .digest("hex");

  const existingDeviceRecord = {
    id: "dev-uuid-001",
    uuid: "hw-uuid-1111",
    hostname: "DESKTOP-EXISTING",
    deviceName: "Existing Monitored PC",
    os: "Windows 11",
    osVersion: "10.0.22631",
    architecture: "X64",
    agentVersion: "2.0.0",
    status: DeviceStatus.ONLINE,
    tokenHash: existingTokenHash,
    organizationId: "org-alpha-123",
    lastSeen: new Date(),
    registeredAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    claimStatus: "CLAIMED",
  };

  beforeEach(async () => {
    mockDeviceRepo = {
      findByUuid: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findAll: jest.fn(),
    };

    mockRegistrationKeyService = {
      validateKey: jest.fn(),
      incrementKeyUsage: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceService,
        { provide: IDeviceRepositoryToken, useValue: mockDeviceRepo },
        {
          provide: IHeartbeatRepositoryToken,
          useValue: {
            create: jest.fn(),
            findLatestByDeviceId: jest.fn(),
          },
        },
        {
          provide: IDeviceAuthenticatorToken,
          useValue: {
            authenticate: jest.fn(),
          },
        },
        {
          provide: HeartbeatPresenceService,
          useValue: {
            markSeen: jest.fn(),
          },
        },
        {
          provide: DeviceTimelineService,
          useValue: {
            recordEvent: jest.fn(),
          },
        },
        {
          provide: RegistrationKeyService,
          useValue: mockRegistrationKeyService,
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DeviceService>(DeviceService);
  });

  it("should block existing device takeover when neither registrationKey nor currentDeviceToken is provided", async () => {
    mockDeviceRepo.findByUuid.mockResolvedValue(existingDeviceRecord);

    const dto: RegisterDeviceDto = {
      uuid: "hw-uuid-1111",
      hostname: "ATTACKER-PC",
      deviceName: "Attacker Spoofed Node",
      os: "Windows 11",
      osVersion: "10.0",
      architecture: "X64",
      agentVersion: "2.0.0",
    };

    await expect(service.register(dto, "192.168.1.100")).rejects.toThrow(
      UnauthorizedException,
    );
    expect(mockDeviceRepo.update).not.toHaveBeenCalled();
  });

  it("should block existing device takeover when invalid currentDeviceToken is supplied", async () => {
    mockDeviceRepo.findByUuid.mockResolvedValue(existingDeviceRecord);

    const dto: RegisterDeviceDto = {
      uuid: "hw-uuid-1111",
      hostname: "ATTACKER-PC",
      deviceName: "Attacker Spoofed Node",
      os: "Windows 11",
      osVersion: "10.0",
      architecture: "X64",
      agentVersion: "2.0.0",
      currentDeviceToken: "wrong-guessed-token",
    };

    await expect(service.register(dto, "192.168.1.100")).rejects.toThrow(
      UnauthorizedException,
    );
    expect(mockDeviceRepo.update).not.toHaveBeenCalled();
  });

  it("should successfully re-register existing device when valid currentDeviceToken is supplied", async () => {
    mockDeviceRepo.findByUuid.mockResolvedValue(existingDeviceRecord);
    mockDeviceRepo.update.mockImplementation((id: string, data: any) =>
      Promise.resolve({ ...existingDeviceRecord, ...data }),
    );

    const dto: RegisterDeviceDto = {
      uuid: "hw-uuid-1111",
      hostname: "DESKTOP-EXISTING",
      deviceName: "Existing Monitored PC",
      os: "Windows 11",
      osVersion: "10.0.22631",
      architecture: "X64",
      agentVersion: "2.0.0",
      currentDeviceToken: existingDeviceToken,
    };

    const response = await service.register(dto, "192.168.1.50");
    expect(response.deviceId).toBe(existingDeviceRecord.id);
    expect(response.registrationToken).toBeDefined();
    expect(mockDeviceRepo.update).toHaveBeenCalledWith(
      existingDeviceRecord.id,
      expect.objectContaining({
        hostname: "DESKTOP-EXISTING",
        status: DeviceStatus.ONLINE,
      }),
    );
  });

  it("should successfully re-register existing device when valid registrationKey is provided by administrator", async () => {
    mockDeviceRepo.findByUuid.mockResolvedValue(existingDeviceRecord);
    mockDeviceRepo.update.mockImplementation((id: string, data: any) =>
      Promise.resolve({ ...existingDeviceRecord, ...data }),
    );
    mockRegistrationKeyService.validateKey.mockResolvedValue({
      id: "reg-key-999",
      organizationId: "org-alpha-123",
      status: "ACTIVE",
    });

    const dto: RegisterDeviceDto = {
      uuid: "hw-uuid-1111",
      hostname: "DESKTOP-EXISTING",
      deviceName: "Existing Monitored PC",
      os: "Windows 11",
      osVersion: "10.0.22631",
      architecture: "X64",
      agentVersion: "2.0.0",
      registrationKey: "ADMIN-REAUTH-KEY-1234",
    };

    const response = await service.register(dto, "192.168.1.50");
    expect(response.deviceId).toBe(existingDeviceRecord.id);
    expect(mockRegistrationKeyService.validateKey).toHaveBeenCalledWith(
      "ADMIN-REAUTH-KEY-1234",
    );
    expect(mockRegistrationKeyService.incrementKeyUsage).toHaveBeenCalledWith(
      "reg-key-999",
      existingDeviceRecord.id,
      "192.168.1.50",
    );
  });

  it("should reject registering a brand new device without registrationKey", async () => {
    mockDeviceRepo.findByUuid.mockResolvedValue(null);

    const dto: RegisterDeviceDto = {
      uuid: "new-hw-uuid-2222",
      hostname: "NEW-UNKNOWN-PC",
      deviceName: "New Device",
      os: "Windows 11",
      osVersion: "10.0",
      architecture: "X64",
      agentVersion: "2.0.0",
    };

    await expect(service.register(dto, "192.168.1.80")).rejects.toThrow(
      BadRequestException,
    );
    expect(mockDeviceRepo.create).not.toHaveBeenCalled();
  });
});
