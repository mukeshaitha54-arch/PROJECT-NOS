const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const http = require("http");

async function main() {
  const d = await prisma.device.findUnique({
    where: { id: "c31ad257-181a-459f-a931-221b245eb996" },
  });
  if (!d) {
    console.log("Device not found");
    return;
  }
  const token = d.registrationToken;
  console.log("Got token:", token);

  const payload = JSON.stringify({
    cpuUsage: 10,
    cpuTemperature: 45,
    cpuFrequency: 2500,
    logicalProcessors: 4,
    physicalProcessors: 2,
    memoryUsed: 1024,
    memoryFree: 1024,
    memoryTotal: 2048,
    memoryUsagePercent: 50,
    diskReadSpeed: 100,
    diskWriteSpeed: 100,
    diskUsagePercent: 50,
    diskFree: 1000,
    diskTotal: 2000,
    networkUploadSpeed: 100,
    networkDownloadSpeed: 100,
    bytesSent: 10000,
    bytesReceived: 10000,
    activeConnections: 10,
    runningProcesses: 100,
    runningServices: 50,
    systemUptime: 3600,
    bootTime: new Date().toISOString(),
    ipAddress: "192.168.1.100",
    macAddress: "00:11:22:33:44:55",
    gateway: "",
    dns: "",
    timestamp: new Date().toISOString(),
  });

  const req = http.request(
    {
      hostname: "localhost",
      port: 3001, // Assuming backend is on 3001, or 80 if nos.is-local.org
      path: "/api/v1/telemetry", // or /telemetry
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": payload.length,
        "X-Device-Token": token,
      },
    },
    (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => console.log("Response:", res.statusCode, data));
    },
  );

  req.on("error", (e) => console.error("Error:", e.message));
  req.write(payload);
  req.end();
}

main().finally(() => prisma.$disconnect());
