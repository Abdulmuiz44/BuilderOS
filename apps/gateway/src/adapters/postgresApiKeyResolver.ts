import type { ApiKeyResolver } from "@builderos/auth";
import { ApiKeyRepository } from "../repos/apiKeyRepository.js";
import { hashApiKey } from "../db/hash.js";

export function createPostgresApiKeyResolver(repository: ApiKeyRepository): ApiKeyResolver {
  return {
    async resolve(rawKey: string) {
      const keyHash = hashApiKey(rawKey);
      const record = await repository.findActiveByHash(keyHash);

      if (!record) {
        return null;
      }

      return {
        rawKey,
        apiKeyId: record.id,
        keyPrefix: record.key_prefix,
        ownerId: record.owner_id,
        scopes: record.scopes,
        mode: "hosted"
      };
    }
  };
}
