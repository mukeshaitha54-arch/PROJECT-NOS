import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { DeviceStatus } from '@prisma/client';

export interface HealthPills {
  healthy: number;
  warning: number;
  offline: number;
}

export interface HierarchyNode {
  name: string;
  type: string;
  totalDevices: number;
  health: HealthPills;
  children: HierarchyNode[];
}

@Injectable()
export class HierarchyService {
  constructor(private readonly prisma: PrismaService) {}

  async getHierarchy(organizationId: string): Promise<HierarchyNode> {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new Error('Organization not found');

    const devicesRaw = await this.prisma.device.findMany({
      where: { organizationId },
    });
    const ownerships = await this.prisma.deviceOwnership.findMany({
      where: { deviceId: { in: devicesRaw.map(d => d.id) } }
    });
    const devices = devicesRaw.map(d => ({
      ...d,
      ownership: ownerships.find(o => o.deviceId === d.id)
    }));

    const departments = await this.prisma.department.findMany({ where: { organizationId } });
    const teams = await this.prisma.team.findMany({ where: { organizationId } });

    // Build base node
    const orgNode: HierarchyNode = {
      name: org.name,
      type: 'Organization',
      totalDevices: devices.length,
      health: this.calculateHealth(devices),
      children: [],
    };

    // Find all distinct branches from device ownerships
    const branchNames: string[] = Array.from(new Set(
      devices
        .map(d => d.ownership?.branch)
        .filter((b): b is string => !!b && b.trim().length > 0)
    ));

    // If no branches exist, maybe default to "Main Branch" or just map departments directly to Org?
    // The requirement says Org -> Branch -> Dept -> Team
    if (branchNames.length === 0) {
      branchNames.push('Main Office');
    }

    for (const branch of branchNames) {
      const branchDevices = devices.filter(d => (d.ownership?.branch === branch) || (branch === 'Main Office' && !d.ownership?.branch));
      
      const branchNode: HierarchyNode = {
        name: branch,
        type: 'Branch',
        totalDevices: branchDevices.length,
        health: this.calculateHealth(branchDevices),
        children: [],
      };

      for (const dept of departments) {
        // Find devices assigned to this department within this branch
        const deptDevices = branchDevices.filter(d => d.ownership?.assignedDepartmentId === dept.id);
        
        // Find teams under this department
        const deptTeams = teams.filter(t => t.departmentId === dept.id);
        
        const deptNode: HierarchyNode = {
          name: dept.name,
          type: 'Department',
          totalDevices: deptDevices.length, // this will be updated to include team devices
          health: { healthy: 0, warning: 0, offline: 0 },
          children: [],
        };

        let deptDevicesAggregated = [...deptDevices];

        for (const team of deptTeams) {
          const teamDevices = branchDevices.filter(d => d.ownership?.assignedTeamId === team.id);
          
          if (teamDevices.length > 0) {
            // Add to aggregated dept devices if not already there
            teamDevices.forEach(td => {
              if (!deptDevicesAggregated.find(d => d.id === td.id)) {
                deptDevicesAggregated.push(td);
              }
            });
          }

          deptNode.children.push({
            name: team.name,
            type: 'Team',
            totalDevices: teamDevices.length,
            health: this.calculateHealth(teamDevices),
            children: [],
          });
        }

        // Only add departments that have teams or devices assigned to them in this branch
        if (deptDevicesAggregated.length > 0 || deptNode.children.length > 0) {
          deptNode.totalDevices = deptDevicesAggregated.length;
          deptNode.health = this.calculateHealth(deptDevicesAggregated);
          branchNode.children.push(deptNode);
        }
      }

      // Add Unassigned devices at the Branch level (those not in any dept/team but in the branch)
      const unassignedDevices = branchDevices.filter(d => !d.ownership?.assignedDepartmentId && !d.ownership?.assignedTeamId);
      if (unassignedDevices.length > 0) {
        branchNode.children.push({
          name: 'Unassigned',
          type: 'Department',
          totalDevices: unassignedDevices.length,
          health: this.calculateHealth(unassignedDevices),
          children: [],
        });
      }

      // Add the branch if it has devices or children
      if (branchNode.totalDevices > 0 || branchNode.children.length > 0) {
        orgNode.children.push(branchNode);
      }
    }

    // If org node has no children because there are no departments/teams, put all devices under "Unassigned"
    if (orgNode.children.length === 0 && devices.length > 0) {
      orgNode.children.push({
        name: 'Main Office',
        type: 'Branch',
        totalDevices: devices.length,
        health: this.calculateHealth(devices),
        children: [{
          name: 'Unassigned',
          type: 'Department',
          totalDevices: devices.length,
          health: this.calculateHealth(devices),
          children: []
        }]
      });
    }

    return orgNode;
  }

  private calculateHealth(devices: any[]): HealthPills {
    return devices.reduce(
      (acc, dev) => {
        if (dev.status === DeviceStatus.ONLINE) acc.healthy++;
        else if (dev.status === DeviceStatus.OFFLINE) acc.offline++;
        else acc.warning++;
        return acc;
      },
      { healthy: 0, warning: 0, offline: 0 }
    );
  }
}
