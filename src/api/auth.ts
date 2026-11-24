/**
 * Frontend Auth API Client for WatsGo Creator Hub.
 * Connects frontend forms to:
 * 1. POST /api/register
 * 2. POST /api/login
 * 3. POST /api/verify-otp
 * 4. POST /api/resend-otp
 * 5. GET  /api/me
 */

function getApiEndpoint(endpoint: string): string {
  let base = (import.meta.env.VITE_API_URL || "/api").trim();
  // Strip all trailing slashes
  base = base.replace(/\/+$/, "");

  // Ensure /api path is present (prevents https://creators.watsgo.in//register)
  if (!base.endsWith("/api")) {
    base = `${base}/api`;
  }

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${base}${cleanEndpoint}`;
}

export interface AuthUser {
  id: number;
  full_name: string;
  email: string;
  mobile_number: string;
  role: string;
  is_verified: boolean;
  onboarding_completed?: boolean;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: AuthUser;
  requires_otp?: boolean;
  email?: string;
  otp_preview?: string;
}

export async function registerCreator(data: {
  full_name?: string;
  email: string;
  mobile_number: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await fetch(getApiEndpoint("/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok && !json.requires_otp) {
    throw new Error(json.message || "Registration failed.");
  }
  return json;
}

export async function loginCreator(data: {
  email: string;
  password: string;
  remember_me?: boolean;
}): Promise<AuthResponse> {
  const res = await fetch(getApiEndpoint("/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok && !json.requires_otp) {
    throw new Error(json.message || "Login failed.");
  }
  if (json.token) {
    localStorage.setItem("watsgo_token", json.token);
    if (json.user) {
      localStorage.setItem("watsgo_user", JSON.stringify(json.user));
    }
  }
  return json;
}

export async function verifyOtp(data: {
  email?: string;
  mobile_number?: string;
  phone?: string;
  otp_code: string;
}): Promise<AuthResponse> {
  const res = await fetch(getApiEndpoint("/verify-otp"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || "Verification failed.");
  }
  if (json.token) {
    localStorage.setItem("watsgo_token", json.token);
    if (json.user) {
      localStorage.setItem("watsgo_user", JSON.stringify(json.user));
    }
  }
  return json;
}

export async function resendOtp(
  data: string | { email?: string; mobile_number?: string; phone?: string },
): Promise<AuthResponse> {
  const payload = typeof data === "string" ? { email: data } : data;
  const res = await fetch(getApiEndpoint("/resend-otp"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || "Failed to resend code.");
  }
  return json;
}

export async function sendMobileOtp(phone: string): Promise<AuthResponse> {
  const res = await fetch(getApiEndpoint("/send-mobile-otp"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  return await res.json();
}

export async function verifyMobileOtp(phone: string, otp: string): Promise<AuthResponse> {
  return verifyOtp({ mobile_number: phone, otp_code: otp });
}

export async function getMe(): Promise<{ success: boolean; user?: AuthUser } | null> {
  const token = localStorage.getItem("watsgo_token");
  if (!token) return null;
  try {
    const res = await fetch(getApiEndpoint("/me"), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      localStorage.removeItem("watsgo_token");
      localStorage.removeItem("watsgo_user");
      return null;
    }
    return await res.json();
  } catch {
    return null;
  }
}

export function logout(): void {
  localStorage.removeItem("watsgo_token");
  localStorage.removeItem("watsgo_user");
}

export function getStoredUser(): AuthUser | null {
  try {
    const item = localStorage.getItem("watsgo_user");
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}
