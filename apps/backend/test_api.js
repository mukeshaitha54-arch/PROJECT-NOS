const http = require("http");

http
  .get("http://nos.is-local.org/api/v1/devices", (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => console.log("Devices:", data));
  })
  .on("error", console.error);
