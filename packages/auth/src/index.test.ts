import test from "node:test";
import assert from "node:assert/strict";
import { createStaticApiKeyResolver, resolveAuthContext } from "./index.js";

test("resolveAuthContext returns hosted auth context for a valid key", async () => {
  const rawKey = "bos_acme_1234567890";
  const resolver = createStaticApiKeyResolver([rawKey]);

  const auth = await resolveAuthContext({
    rawApiKey: rawKey,
    resolver,
    allowAnonLocal: false
  });

  assert.ok(auth);
  assert.equal(auth.mode, "hosted");
  assert.equal(auth.ownerId, "acme");
  assert.equal(auth.keyPrefix, rawKey.slice(0, 12));
  assert.deepEqual(auth.scopes, ["workflows:run"]);
  assert.ok(auth.apiKeyId.startsWith("key_"));
});

test("resolveAuthContext returns local auth context when anon local is allowed", async () => {
  const auth = await resolveAuthContext({
    rawApiKey: undefined,
    allowAnonLocal: true,
    resolver: createStaticApiKeyResolver([])
  });

  assert.ok(auth);
  assert.equal(auth.mode, "local");
  assert.equal(auth.apiKeyId, "local-anon");
  assert.equal(auth.ownerId, "local-dev");
  assert.deepEqual(auth.scopes, ["workflows:run"]);
});

test("resolveAuthContext returns null for invalid key format", async () => {
  const auth = await resolveAuthContext({
    rawApiKey: "not-a-valid-key",
    allowAnonLocal: false,
    resolver: createStaticApiKeyResolver([])
  });

  assert.equal(auth, null);
});
