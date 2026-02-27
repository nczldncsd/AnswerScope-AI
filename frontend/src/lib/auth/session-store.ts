const SESSION_KEY = "answerscope.session";

export interface SessionIdentity {
  userId: number;
  email: string;
  name?: string;
  logoUrl?: string;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function readSessionIdentity(): SessionIdentity | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as {
      userId?: unknown;
      email?: unknown;
      name?: unknown;
      logoUrl?: unknown;
    };
    if (
      typeof parsed.userId === "number" &&
      Number.isFinite(parsed.userId) &&
      typeof parsed.email === "string"
    ) {
      const identity: SessionIdentity = {
        userId: parsed.userId,
        email: parsed.email,
      };
      if (typeof parsed.name === "string" && parsed.name.trim().length > 0) {
        identity.name = parsed.name;
      }
      if (typeof parsed.logoUrl === "string" && parsed.logoUrl.trim().length > 0) {
        identity.logoUrl = parsed.logoUrl;
      }
      return identity;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeSessionIdentity(identity: SessionIdentity) {
  if (!canUseStorage()) {
    return;
  }
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(identity));
}

export function clearSessionIdentity() {
  if (!canUseStorage()) {
    return;
  }
  window.sessionStorage.removeItem(SESSION_KEY);
}
