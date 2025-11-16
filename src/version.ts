import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

type PackageJson = {
  version?: string;
};

export function getCliVersion(): string {
  const pkg = require("../package.json") as PackageJson;
  if (!pkg.version) {
    throw new Error("Failed to resolve CLI version.");
  }
  return pkg.version;
}
