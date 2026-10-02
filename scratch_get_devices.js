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

const req = http.request(
  "http://127.0.0.1:3001/api/v1/devices",
  {
    headers: { Authorization: "Bearer " + token },
  },
  (res) => {
    let body = "";
    res.on("data", (chunk) => (body += chunk));
    res.on("end", () => {
      try {
        const json = JSON.parse(body);
        console.log(
          "Devices count:",
          json.data?.devices?.length || json.data?.length || json.length,
        );
        console.log(
          "Devices:",
          JSON.stringify(json.data?.devices || json.data || json, null, 2),
        );
      } catch (e) {
        console.log("Raw body:", body);
      }
    });
  },
);
req.end();
