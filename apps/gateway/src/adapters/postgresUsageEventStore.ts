import type { UsageEventStore } from "@builderos/metering";
import type { UsageEvent } from "@builderos/types";
import { UsageEventRepository } from "../repos/usageEventRepository.js";

export function createPostgresUsageEventStore(repository: UsageEventRepository): UsageEventStore {
  return {
    async write(event: UsageEvent): Promise<void> {
      await repository.insert(event);
    }
  };
}
