import { createClient } from "@supabase/supabase-js";

const clients = new Map();
let googleIdentityScriptPromise = null;

export async function generateGoogleNonce(cryptoRef = globalThis.crypto) {
  if (!cryptoRef?.getRandomValues || !cryptoRef?.subtle?.digest) {
    throw new Error("Google nonce를 생성할 수 없습니다.");
  }
  const randomBytes = cryptoRef.getRandomValues(new Uint8Array(32));
  const nonce = btoa(String.fromCharCode(...randomBytes));
  const encodedNonce = new TextEncoder().encode(nonce);
  const hashBuffer = await cryptoRef.subtle.digest("SHA-256", encodedNonce);
  const hashedNonce = Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return { nonce, hashedNonce };
}

export function requireAuthConfig(config = {}) {
  if (!config.url || !config.key) throw new Error("Supabase Auth 환경변수가 없습니다.");
  return config;
}

export function createMovemapSupabaseClient(config) {
  const { url, key } = requireAuthConfig(config);
  const cacheKey = `${url}|${key}`;
  if (clients.has(cacheKey)) return clients.get(cacheKey);
  const client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  clients.set(cacheKey, client);
  return client;
}

export function authRedirectTo(location = globalThis.location, path = "/") {
  const origin = location?.origin || "";
  if (!origin) return "";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalizedPath}`;
}

export async function signInWithGoogle(client, { redirectTo = authRedirectTo() } = {}) {
  if (!client?.auth?.signInWithOAuth) throw new Error("Supabase Auth client가 없습니다.");
  return client.auth.signInWithOAuth({
    provider: "google",
    options: redirectTo ? { redirectTo } : undefined
  });
}

export function loadGoogleIdentityScript(documentRef = globalThis.document) {
  const existing = globalThis.google?.accounts?.id;
  if (existing) return Promise.resolve(existing);
  if (!documentRef?.createElement) return Promise.reject(new Error("Google Identity Services를 불러올 수 없습니다."));
  if (googleIdentityScriptPromise) return googleIdentityScriptPromise;

  googleIdentityScriptPromise = new Promise((resolve, reject) => {
    const script = documentRef.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const googleIdentity = globalThis.google?.accounts?.id;
      if (googleIdentity) resolve(googleIdentity);
      else reject(new Error("Google Identity Services 초기화에 실패했습니다."));
    };
    script.onerror = () => reject(new Error("Google Identity Services 스크립트 로딩에 실패했습니다."));
    documentRef.head?.appendChild(script);
  });

  return googleIdentityScriptPromise;
}

export async function signInWithGoogleIdentity(client, { clientId, googleIdentity, loadIdentity = loadGoogleIdentityScript, createNonce = generateGoogleNonce } = {}) {
  if (!clientId) throw new Error("Google Client ID 환경변수가 없습니다.");
  if (!client?.auth?.signInWithIdToken) throw new Error("Supabase ID token 로그인 client가 없습니다.");
  const identity = googleIdentity || await loadIdentity();
  const { nonce, hashedNonce } = await createNonce();

  return new Promise((resolve) => {
    identity.initialize({
      client_id: clientId,
      context: "signin",
      ux_mode: "popup",
      auto_select: false,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: true,
      nonce: hashedNonce,
      callback: async (response) => {
        if (!response?.credential) {
          resolve({ data: null, error: new Error("Google 인증 응답이 없습니다.") });
          return;
        }
        resolve(await client.auth.signInWithIdToken({
          provider: "google",
          token: response.credential,
          nonce
        }));
      }
    });

    identity.prompt((notification) => {
      const unavailable = notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.();
      if (unavailable) {
        const reason = notification?.getNotDisplayedReason?.() || notification?.getSkippedReason?.() || "unknown";
        resolve({ data: null, error: new Error(`Google 로그인 창을 열 수 없습니다: ${reason}`) });
      }
    });
  });
}

export async function signOut(client) {
  if (!client?.auth?.signOut) throw new Error("Supabase Auth client가 없습니다.");
  return client.auth.signOut();
}

export async function getAuthSession(client) {
  if (!client?.auth?.getSession) return null;
  const { data } = await client.auth.getSession();
  return data?.session || null;
}

export function onAuthStateChange(client, callback) {
  if (!client?.auth?.onAuthStateChange) return () => {};
  const { data } = client.auth.onAuthStateChange((_event, session) => callback(session || null));
  return () => data?.subscription?.unsubscribe?.();
}

export function authRequest(authSession) {
  const userId = authSession?.user?.id || "";
  const accessToken = authSession?.access_token || "";
  return {
    userId,
    accessToken,
    accountPlan: authSession?.user?.app_metadata?.account_plan || authSession?.user?.user_metadata?.account_plan || "free"
  };
}
