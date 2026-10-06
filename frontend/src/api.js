export const API_URL = "http://localhost:8000";

export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(token) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
}

function authHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function throwIfFailed(response) {
  if (response.ok) {
    return;
  }
  const data = await response.json().catch(() => null);
  const message =
    typeof data?.detail === "string" ? data.detail : "משהו השתבש, נסה שוב";
  throw new Error(message);
}

export async function apiFetch(path, options = {}) {
  const headers = authHeaders({
    "Content-Type": "application/json",
    ...options.headers,
  });

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  await throwIfFailed(response);
  return response.json().catch(() => null);
}

export async function apiUpload(path, formData) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  await throwIfFailed(response);
  return response.json();
}

export async function apiFetchBlob(path) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: authHeaders(),
  });
  await throwIfFailed(response);
  return response.blob();
}


export const GOOGLE_LINK_RETURN_KEY = "googleLinkReturn";