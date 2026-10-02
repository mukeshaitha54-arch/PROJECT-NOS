const http = require("http");
const jwt = require("/app/node_modules/.pnpm/node_modules/jsonwebtoken");

const token = jwt.sign(
  {
    sub: "86d293e1-afad-4016-bd6e-38fa5a6b29cd",
    email: "mukeshaitha54@gmail.com",
    role: "USER",
  },
  "a34c9d0186a9a48d0958f2dd1642beaf6189e8afd31f80f1da0d370ccb3fd0e0",
  { expiresIn: "1h" },
);

function getJson(path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      `http://127.0.0.1:3001${path}`,
      {
        headers: { Authorization: "Bearer " + token },
      },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, body });
          }
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

async function verifyAll() {
  const deviceId = "39036fb1-1e87-4028-a01c-8556ab002070";

  console.log("=== VERIFYING DEVICE STATUS & ENDPOINTS ===");

  // 1. Device details
  const devRes = await getJson(`/api/v1/devices/${deviceId}`);
  console.log("1. Device Details:", {
    status: devRes.status,
    id: devRes.data?.data?.id,
    hostname: devRes.data?.data?.hostname,
    telemetryPaused: devRes.data?.data?.telemetryPaused,
    hasHardware: !!devRes.data?.data?.inventory?.cpuModel,
  });

  // 2. Processes
  const procRes = await getJson(`/api/v1/devices/${deviceId}/processes`);
  console.log("2. Processes:", {
    status: procRes.status,
    count: procRes.data?.data?.length,
    firstProcess: procRes.data?.data?.[0],
  });

  // 3. Services
  const svcRes = await getJson(`/api/v1/devices/${deviceId}/services`);
  console.log("3. Services:", {
    status: svcRes.status,
    count: svcRes.data?.data?.length,
    sampleService: svcRes.data?.data?.[0],
  });

  // 4. Software
  const swRes = await getJson(`/api/v1/devices/${deviceId}/software`);
  console.log("4. Software:", {
    status: swRes.status,
    count: swRes.data?.data?.length,
    sampleSoftware: swRes.data?.data?.[0],
  });

  // 5. Inventory
  const invRes = await getJson(`/api/v1/inventory/${deviceId}`);
  console.log("5. Inventory:", {
    status: invRes.status,
    keys: Object.keys(invRes.data?.data || {}),
    osName: invRes.data?.data?.hardware?.osName || invRes.data?.data?.osName,
    cpuModel:
      invRes.data?.data?.hardware?.cpuModel || invRes.data?.data?.cpuModel,
  });
}

verifyAll().catch(console.error);
