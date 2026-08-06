import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { IDeviceRepositoryToken, IDeviceRepository } from '../../../common/repositories/device.repository.interface';
import { Device } from '@prisma/client';

export interface SmartGroupRule {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'notEquals';
  value: string;
}

export interface CreateSmartGroupDto {
  organizationId: string;
  name: string;
  description?: string;
  rules: SmartGroupRule[];
}

@Injectable()
export class SmartGroupService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(IDeviceRepositoryToken) private readonly deviceRepo: IDeviceRepository,
  ) {}

  async createGroup(dto: CreateSmartGroupDto) {
    return this.prisma.smartGroup.create({
      data: {
        organizationId: dto.organizationId,
        name: dto.name,
        description: dto.description,
        rules: dto.rules as any,
      }
    });
  }

  async getGroups(organizationId: string) {
    return this.prisma.smartGroup.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' }
    });
  }

  async evaluateGroup(groupId: string): Promise<Device[]> {
    const group = await this.prisma.smartGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('SmartGroup not found');

    const rules = group.rules as any as SmartGroupRule[];
    const devices = await this.deviceRepo.findAll(group.organizationId);

    return devices.filter(device => this.evaluateRules(device, rules));
  }

  private evaluateRules(device: Device, rules: SmartGroupRule[]): boolean {
    for (const rule of rules) {
      const fieldValue = String((device as any)[rule.field] || '');
      
      switch (rule.operator) {
        case 'equals':
          if (fieldValue !== rule.value) return false;
          break;
        case 'notEquals':
          if (fieldValue === rule.value) return false;
          break;
        case 'contains':
          if (!fieldValue.includes(rule.value)) return false;
          break;
        case 'startsWith':
          if (!fieldValue.startsWith(rule.value)) return false;
          break;
        case 'endsWith':
          if (!fieldValue.endsWith(rule.value)) return false;
          break;
      }
    }
    return true; // AND logic for all rules
  }
}
