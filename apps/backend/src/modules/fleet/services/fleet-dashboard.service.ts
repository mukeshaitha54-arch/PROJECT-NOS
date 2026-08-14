import { Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma.service";
import { DeviceStatus } from "@prisma/client";

export interface FleetTreeNode {
  id: string;
  name: string;
  onlineCount: number;
  offlineCount: number;
  totalCount: number;
  children: FleetTreeNode[];
}

@Injectable()
export class FleetDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrganizationTree(organizationId: string): Promise<FleetTreeNode> {
    const devices = await this.prisma.device.findMany({
      where: { organizationId },
      // include: { ownership: true }, // Device Ownership is a separate model DeviceOwnership that doesn't have a direct relation in this phase?
    });

    // Fetch ownership separately if relation is not in Prisma schema
    const ownerships = await this.prisma.deviceOwnership.findMany({
      where: { organizationId },
    });

    const ownershipMap = new Map(ownerships.map((o) => [o.deviceId, o]));

    const root: FleetTreeNode = {
      id: "root",
      name: "Organization Root",
      onlineCount: 0,
      offlineCount: 0,
      totalCount: 0,
      children: [],
    };

    const branchMap = new Map<string, FleetTreeNode>();

    for (const device of devices) {
      const isOnline = device.status === DeviceStatus.ONLINE;

      root.totalCount++;
      if (isOnline) root.onlineCount++;
      else root.offlineCount++;

      const ownership: any = ownershipMap.get(device.id);
      const branchName = ownership?.branch || "Unassigned Branch";
      const deptName =
        ownership?.assignedDepartmentId || "Unassigned Department";
      const teamName = ownership?.assignedTeamId || "Unassigned Team";

      // Ensure Branch
      if (!branchMap.has(branchName)) {
        branchMap.set(branchName, {
          id: `branch_${branchName}`,
          name: branchName,
          onlineCount: 0,
          offlineCount: 0,
          totalCount: 0,
          children: [],
        });
        root.children.push(branchMap.get(branchName)!);
      }
      const branch = branchMap.get(branchName)!;
      branch.totalCount++;
      if (isOnline) branch.onlineCount++;
      else branch.offlineCount++;

      // Ensure Dept
      let dept = branch.children.find((c) => c.name === deptName);
      if (!dept) {
        dept = {
          id: `dept_${branchName}_${deptName}`,
          name: deptName,
          onlineCount: 0,
          offlineCount: 0,
          totalCount: 0,
          children: [],
        };
        branch.children.push(dept);
      }
      dept.totalCount++;
      if (isOnline) dept.onlineCount++;
      else dept.offlineCount++;

      // Ensure Team
      let team = dept.children.find((c) => c.name === teamName);
      if (!team) {
        team = {
          id: `team_${branchName}_${deptName}_${teamName}`,
          name: teamName,
          onlineCount: 0,
          offlineCount: 0,
          totalCount: 0,
          children: [],
        };
        dept.children.push(team);
      }
      team.totalCount++;
      if (isOnline) team.onlineCount++;
      else team.offlineCount++;
    }

    return root;
  }
}
