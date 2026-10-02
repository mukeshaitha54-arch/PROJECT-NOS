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

function checkDevice(id) {
  const req = http.request(
    `http://127.0.0.1:3001/api/v1/devices/${id}/processes`,
    {
      headers: { Authorization: "Bearer " + token },
    },
    (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(body);
          console.log(`[${id}] processes count:`, json.data?.length);
          if (json.data?.length > 0) {
            console.log(`[${id}] first process:`, json.data[0]);
          }
        } catch (e) {
          console.log(`[${id}] Raw body:`, body);
        }
      });
    },
  );
  req.end();
}

checkDevice("39036fb1-1e87-4028-a01c-8556ab002070");
checkDevice("f291264b-b42c-4a80-8719-d3d938c5a1c9");
checkDevice("897882f9-ba69-49b6-84e1-ec5678841c52");
checkDevice("2612052d-dc03-46e1-9679-84795cc7ae3b");
