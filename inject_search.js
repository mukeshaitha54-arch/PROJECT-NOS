const fs = require("fs");
const path = require("path");

const basePath = path.join(__dirname, "apps", "backend", "src");

function addSearchMethod(interfacePath, methodSig) {
  let content = fs.readFileSync(interfacePath, "utf8");
  if (!content.includes("search(")) {
    content = content.replace(/}\s*$/, `  ${methodSig}\n}\n`);
    fs.writeFileSync(interfacePath, content);
    console.log(`Updated ${interfacePath}`);
  }
}

function addPrismaSearchMethod(implPath, methodImpl) {
  let content = fs.readFileSync(implPath, "utf8");
  if (!content.includes("async search(")) {
    content = content.replace(/}\s*$/, `\n${methodImpl}\n}\n`);
    fs.writeFileSync(implPath, content);
    console.log(`Updated ${implPath}`);
  }
}

// User Repository
addSearchMethod(
  path.join(basePath, "common", "repositories", "user.repository.interface.ts"),
  "search(query: string, organizationId: string): Promise<User[]>;",
);
addPrismaSearchMethod(
  path.join(basePath, "database", "repositories", "prisma-user.repository.ts"),
  `  async search(query: string, organizationId: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 20
    }); // Needs joining with organization member in real app if organizationId scoped
  }`,
);

// Device Repository
addSearchMethod(
  path.join(
    basePath,
    "common",
    "repositories",
    "device.repository.interface.ts",
  ),
  "search(query: string, organizationId: string): Promise<Device[]>;",
);
addPrismaSearchMethod(
  path.join(
    basePath,
    "database",
    "repositories",
    "prisma-device.repository.ts",
  ),
  `  async search(query: string, organizationId: string): Promise<Device[]> {
    return this.prisma.device.findMany({
      where: {
        organizationId,
        OR: [
          { hostname: { contains: query, mode: 'insensitive' } },
          { deviceName: { contains: query, mode: 'insensitive' } },
          { uuid: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 20
    });
  }`,
);

// Alert Repository
addSearchMethod(
  path.join(
    basePath,
    "common",
    "repositories",
    "alert.repository.interface.ts",
  ),
  "search(query: string, organizationId: string): Promise<Alert[]>;",
);
addPrismaSearchMethod(
  path.join(basePath, "database", "repositories", "prisma-alert.repository.ts"),
  `  async search(query: string, organizationId: string): Promise<Alert[]> {
    return this.prisma.alert.findMany({
      where: {
        device: { organizationId },
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { incidentNumber: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 20
    });
  }`,
);

// Inventory Repository
addSearchMethod(
  path.join(
    basePath,
    "common",
    "repositories",
    "inventory.repository.interface.ts",
  ),
  "search(query: string, organizationId: string): Promise<DeviceInventory[]>;",
);
addPrismaSearchMethod(
  path.join(
    basePath,
    "database",
    "repositories",
    "prisma-inventory.repository.ts",
  ),
  `  async search(query: string, organizationId: string): Promise<DeviceInventory[]> {
    return this.prisma.deviceInventory.findMany({
      where: {
        device: { organizationId },
        OR: [
          { manufacturer: { contains: query, mode: 'insensitive' } },
          { model: { contains: query, mode: 'insensitive' } },
          { serialNumber: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 20
    });
  }`,
);

console.log("Done");
