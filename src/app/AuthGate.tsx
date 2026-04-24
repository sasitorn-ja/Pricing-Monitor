import { type ReactNode, useEffect, useState } from "react";
import {
  clearAuthUser,
  getAuthUser,
  setRawAuthUser,
  type AuthUser
} from "../services/auth/authUser";

const ROP_PORTAL_URL = import.meta.env.VITE_ROP_PORTAL_URL || "https://dev-rop.cipcloud.net/home";
const ROP_RETURN_URL_PARAM = import.meta.env.VITE_ROP_RETURN_URL_PARAM || "redirect_uri";
const SHOW_LOCAL_AUTH_IMPORT = import.meta.env.DEV;
const CALLBACK_AUTH_PARAM_NAMES = ["auth_user", "payload", "token", "profile"];
const BYPASS_AUTH_GATE = true;
const PREVIEW_AUTH_USER: AuthUser = {
  id: "preview",
  username: "preview",
  name: "Preview User",
  email: "preview@local",
  role: "admin"
};

type AuthGateProps = {
  children: (authUser: AuthUser, onLogout: () => void) => ReactNode;
};

function readCallbackAuthPayload() {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  for (const key of CALLBACK_AUTH_PARAM_NAMES) {
    const value = searchParams.get(key) ?? hashParams.get(key);
    if (value) {
      return value;
    }
  }

  return null;
}

function removeCallbackAuthParams() {
  const url = new URL(window.location.href);
  let changed = false;

  for (const key of CALLBACK_AUTH_PARAM_NAMES) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }

  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
  for (const key of CALLBACK_AUTH_PARAM_NAMES) {
    if (hashParams.has(key)) {
      hashParams.delete(key);
      changed = true;
    }
  }

  url.hash = hashParams.toString();

  if (changed) {
    window.history.replaceState({}, document.title, url);
  }
}

export function AuthGate({ children }: AuthGateProps) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [localAuthPayload, setLocalAuthPayload] = useState("");
  const [localAuthError, setLocalAuthError] = useState("");

  useEffect(() => {
    const callbackAuthPayload = readCallbackAuthPayload();
    if (callbackAuthPayload) {
      setRawAuthUser(callbackAuthPayload);
      removeCallbackAuthParams();
    }

    setAuthUser(getAuthUser());
    setHasCheckedAuth(true);
  }, []);

  const handleLogin = () => {
    const portalUrl = new URL(ROP_PORTAL_URL);
    if (ROP_RETURN_URL_PARAM) {
      portalUrl.searchParams.set(ROP_RETURN_URL_PARAM, window.location.href);
    }
    window.location.href = portalUrl.toString();
  };

  const handleLocalAuthImport = () => {
    const payload = localAuthPayload.trim();
    if (!payload) {
      setLocalAuthError("กรุณาวางค่า auth_user");
      return;
    }

    setRawAuthUser(payload);
    const importedUser = getAuthUser();
    if (!importedUser) {
      clearAuthUser();
      setLocalAuthError("อ่านค่า auth_user ไม่ได้: ให้ copy value ของ key auth_user ทั้งก้อนจาก dev-rop");
      return;
    }

    setLocalAuthError("");
    setAuthUser(importedUser);
  };

  const handleLogout = () => {
    clearAuthUser();
    setAuthUser(null);
  };

  if (BYPASS_AUTH_GATE) {
    return children(PREVIEW_AUTH_USER, () => undefined);
  }

  if (!hasCheckedAuth) {
    return (
      <div className="authScreen">
        <div className="authSpinner" />
        <p>กำลังตรวจสอบการเข้าสู่ระบบ...</p>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="authScreen">
        <section className="authPanel" aria-labelledby="auth-title">
          <p className="authEyebrow">Pricing Monitor</p>
          <h1 id="auth-title">เข้าสู่ระบบ</h1>
          <p className="authIntro">กรุณาเข้าสู่ระบบผ่าน ROP Portal เพื่อใช้งาน dashboard</p>
          <button type="button" className="authLoginButton" onClick={handleLogin}>
            เข้าสู่ระบบผ่าน ROP Portal
          </button>
          <p className="authPortalUrl">dev-rop.cipcloud.net</p>
          {SHOW_LOCAL_AUTH_IMPORT ? (
            <div className="authLocalImport">
              <textarea
                value={localAuthPayload}
                onChange={(event) => {
                  setLocalAuthPayload(event.target.value);
                  setLocalAuthError("");
                }}
                placeholder="วางค่า auth_user สำหรับทดสอบบน local"
                rows={3}
              />
              {localAuthError ? <p className="authLocalError">{localAuthError}</p> : null}
              <button type="button" className="authSecondaryButton" onClick={handleLocalAuthImport}>
                ใช้ auth_user นี้
              </button>
            </div>
          ) : null}
        </section>
      </div>
    );
  }

  return children(authUser, handleLogout);
}
