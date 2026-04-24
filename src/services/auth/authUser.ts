import CryptoJS from "crypto-js";

export type ExternalAuthUser = {
  USERN: string;
  EMP?: string;
  TITLE?: string;
  NAME?: string;
  SNAME?: string;
  POS?: string;
  DIV?: string | null;
  DEPT?: string | null;
  SECT?: string | null;
  SHIFT?: string | null;
  MGR?: string | null;
  source?: string | null;
  level?: string | null;
  plant_visible?: string | null;
  is_admin?: boolean;
  token?: string;
};

export type ExternalAuthWrapper = {
  token?: string;
  username?: string;
  profile: string | ExternalAuthUser;
  loginTime?: string;
};

export type AuthUser = {
  id: string;
  username: string;
  name: string;
  email: string;
  role: "admin" | "user";
  token?: string;
  position?: string;
  department?: string;
};

export const AUTH_STORAGE_KEY = "auth_user";
const CRYPTO_SECRET = import.meta.env.VITE_CRYPTO_SECRET || "default-secret-key";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function decryptField(encryptedText: string): string | null {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, CRYPTO_SECRET);
    return bytes.toString(CryptoJS.enc.Utf8) || null;
  } catch {
    return null;
  }
}

function decodeBase64Json(encodedText: string): string | null {
  try {
    const decoded = window.atob(encodedText);
    return decoded.trim().startsWith("{") ? decoded : null;
  } catch {
    return null;
  }
}

function isExternalAuthUser(value: unknown): value is ExternalAuthUser {
  return isRecord(value) && typeof value.USERN === "string";
}

function resolveExternalAuthUser(value: unknown): ExternalAuthUser | null {
  if (isExternalAuthUser(value)) {
    return value;
  }

  if (!isRecord(value) || !("profile" in value)) {
    return null;
  }

  const wrapper = value as ExternalAuthWrapper;
  const profile =
    typeof wrapper.profile === "string" ? parseJson(wrapper.profile) : wrapper.profile;

  if (!isExternalAuthUser(profile)) {
    return null;
  }

  return {
    ...profile,
    token: profile.token ?? wrapper.token
  };
}

export function getExternalAuthUser(): ExternalAuthUser | null {
  const authData = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!authData) {
    return null;
  }

  const resolvedAuthData =
    authData.trim().startsWith("{")
      ? authData
      : decryptField(authData) ?? decodeBase64Json(authData);

  if (!resolvedAuthData) {
    return null;
  }

  const parsed = parseJson(resolvedAuthData);
  return resolveExternalAuthUser(parsed);
}

export function getAuthUser(): AuthUser | null {
  const externalAuth = getExternalAuthUser();
  if (!externalAuth) {
    return null;
  }

  const username = externalAuth.USERN;
  const name = `${externalAuth.TITLE ?? ""}${externalAuth.NAME ?? ""} ${
    externalAuth.SNAME ?? ""
  }`.trim();

  return {
    id: externalAuth.EMP || username,
    username,
    name: name || username,
    email: `${username}@scg.com`,
    role: externalAuth.is_admin ? "admin" : "user",
    token: externalAuth.token,
    position: externalAuth.POS || undefined,
    department: externalAuth.DEPT || externalAuth.DIV || undefined
  };
}

export function clearAuthUser() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function setRawAuthUser(authData: string) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, authData);
}

export function getAuthToken(): string | null {
  return getExternalAuthUser()?.token ?? null;
}
