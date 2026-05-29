import assert from "node:assert/strict";
import test from "node:test";

import { authRedirectTo, authRequest, generateGoogleNonce, onAuthStateChange, requireAuthConfig, signInWithGoogle, signInWithGoogleIdentity } from "./authClient.mjs";

test("requires Supabase auth config", () => {
  assert.throws(() => requireAuthConfig({}), /Supabase Auth/);
  assert.deepEqual(requireAuthConfig({ url: "https://example.supabase.co", key: "anon" }), {
    url: "https://example.supabase.co",
    key: "anon"
  });
});

test("starts Google OAuth with the current redirect target", async () => {
  const calls = [];
  const client = {
    auth: {
      signInWithOAuth: async (payload) => {
        calls.push(payload);
        return { data: {}, error: null };
      }
    }
  };

  await signInWithGoogle(client, { redirectTo: "https://app.example/editor" });

  assert.deepEqual(calls, [{
    provider: "google",
    options: { redirectTo: "https://app.example/editor" }
  }]);
});

test("builds a stable app redirect target from an origin and path", () => {
  assert.equal(authRedirectTo({ origin: "https://movemap.example" }), "https://movemap.example/");
  assert.equal(authRedirectTo({ origin: "https://movemap.example" }, "/share"), "https://movemap.example/share");
  assert.equal(authRedirectTo({ origin: "https://movemap.example" }, "editor"), "https://movemap.example/editor");
  assert.equal(authRedirectTo(null), "");
});

test("signs in with a Google Identity Services ID token", async () => {
  const calls = [];
  const client = {
    auth: {
      signInWithIdToken: async (payload) => {
        calls.push(payload);
        return { data: { session: "session-1" }, error: null };
      }
    }
  };
  const googleIdentity = {
    initialize: (config) => {
      googleIdentity.config = config;
    },
    prompt: () => {
      googleIdentity.config.callback({ credential: "google-id-token" });
    }
  };

  const result = await signInWithGoogleIdentity(client, {
    clientId: "google-client-id",
    googleIdentity,
    createNonce: async () => ({ nonce: "raw-nonce", hashedNonce: "hashed-nonce" })
  });

  assert.deepEqual(calls, [{
    provider: "google",
    token: "google-id-token",
    nonce: "raw-nonce"
  }]);
  assert.equal(googleIdentity.config.client_id, "google-client-id");
  assert.equal(googleIdentity.config.ux_mode, "popup");
  assert.equal(googleIdentity.config.nonce, "hashed-nonce");
  assert.deepEqual(result, { data: { session: "session-1" }, error: null });
});

test("requires a Google Client ID for direct Google Identity sign-in", async () => {
  await assert.rejects(
    () => signInWithGoogleIdentity({ auth: { signInWithIdToken: async () => ({}) } }),
    /Google Client ID/
  );
});

test("generates a raw Google nonce and SHA-256 hex nonce pair", async () => {
  const bytes = new Uint8Array(32);
  bytes.fill(65);
  const cryptoRef = {
    getRandomValues: (target) => {
      target.set(bytes);
      return target;
    },
    subtle: {
      digest: async (_algorithm, encoded) => {
        assert.equal(new TextDecoder().decode(encoded), "QUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUE=");
        return new Uint8Array([0, 1, 15, 16, 255]).buffer;
      }
    }
  };

  assert.deepEqual(await generateGoogleNonce(cryptoRef), {
    nonce: "QUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUE=",
    hashedNonce: "00010f10ff"
  });
});

test("normalizes auth session into request identity", () => {
  assert.deepEqual(authRequest(null), { userId: "", accessToken: "", accountPlan: "free" });
  assert.deepEqual(authRequest({
    access_token: "token-1",
    user: {
      id: "user-1",
      app_metadata: { account_plan: "pro" }
    }
  }), {
    userId: "user-1",
    accessToken: "token-1",
    accountPlan: "pro"
  });
});

test("auth state subscription returns an unsubscribe function", () => {
  let unsubscribed = false;
  const client = {
    auth: {
      onAuthStateChange: (_callback) => ({
        data: {
          subscription: {
            unsubscribe: () => {
              unsubscribed = true;
            }
          }
        }
      })
    }
  };

  const unsubscribe = onAuthStateChange(client, () => {});
  unsubscribe();

  assert.equal(unsubscribed, true);
});
