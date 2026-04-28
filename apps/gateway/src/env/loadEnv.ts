import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const currentDir = dirname(fileURLToPath(import.meta.url));
const gatewayRoot = resolve(currentDir, "../..");
const repoRoot = resolve(gatewayRoot, "../..");

// Load local overrides first, then shared defaults. Existing shell env values win.
const envPaths = [
  resolve(repoRoot, ".env.local"),
  resolve(gatewayRoot, ".env.local"),
  resolve(repoRoot, ".env"),
  resolve(gatewayRoot, ".env")
];

for (const envPath of envPaths) {
  config({ path: envPath });
}
