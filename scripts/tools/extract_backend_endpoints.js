const fs = require("fs");
const path = require("path");

function walk(dir, files = []) {
  const dirList = fs.readdirSync(dir);
  for (const file of dirList) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      walk(name, files);
    } else if (name.endsWith(".controller.ts")) {
      files.push(name);
    }
  }
  return files;
}

const allFiles = walk("apps/backend/src");
const endpoints = [];

allFiles.forEach((file) => {
  const content = fs.readFileSync(file, "utf-8");

  // Find controller prefix e.g. @Controller('fleet/registration-keys')
  const controllerMatch = content.match(/@Controller\(['"]([^'"]+)['"]\)/);
  const controllerPrefix = controllerMatch ? controllerMatch[1] : "";

  const regex = /@(Get|Post|Put|Patch|Delete)\((?:['"]([^'"]*)['"])?\)/g;

  let match;
  while ((match = regex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const route = match[2] || "";
    const fullRoute = (
      "/" +
      controllerPrefix +
      (route ? "/" + route : "")
    ).replace(/\/+/g, "/");
    const relativePath = file
      .replace(/\\/g, "/")
      .replace("apps/backend/src/", "");
    endpoints.push(`${method} ${fullRoute} in ${relativePath}`);
  }
});

console.log(endpoints.join("\n"));
