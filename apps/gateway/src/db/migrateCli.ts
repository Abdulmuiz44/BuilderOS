import "../env/loadEnv.js";
import { runMigrations } from "./migrate.js";

runMigrations()
  .then(() => {
    console.log("Migrations applied successfully");
    process.exit(0);
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown migration error";
    console.error(message);
    process.exit(1);
  });
