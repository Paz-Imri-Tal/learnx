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


export async function apiFetch(path, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
    };

    const token = getToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${path}`, {...options, headers});
    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const message =
          typeof data?.detail === "string"
            ? data.detail
            : "משהו השתבש, נסה שוב";
        throw new Error(message);
    }

    return data;
}