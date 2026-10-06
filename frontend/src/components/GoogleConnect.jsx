import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { apiFetch, GOOGLE_LINK_RETURN_KEY } from "../api";
import googleLogo from "../assets/google-g.svg";

const SCOPE_NAMES = { drive: "Google Drive", calendar: "Google Calendar" };

export default function GoogleConnect({ scope, reason }) {
  const location = useLocation();
  const [status, setStatus] = useState(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkStatus() {
      try {
        const data = await apiFetch("/auth/google/status");
        setStatus(data);
      } catch {
        setStatus(null);
      }
    }

    checkStatus();
  }, []);

  async function handleConnect() {
    setStarting(true);
    setError("");

    try {
      sessionStorage.setItem(GOOGLE_LINK_RETURN_KEY, location.pathname);
      const data = await apiFetch("/auth/google/link-start", {
        method: "POST",
      });
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setStarting(false);
    }
  }

  if (status === null || status[scope]) {
    return null;
  }

  const title = status.connected
    ? `חסרה הרשאה ל-${SCOPE_NAMES[scope]}`
    : "החשבון שלך עוד לא מחובר ל-Google";

  return (
    <div className="google-connect">
      <div>
        <p className="google-connect-title">{title}</p>
        <p className="task-meta">{reason}</p>
        <p className="task-meta">
          במסך של Google חשוב לסמן את כל התיבות, כולל {SCOPE_NAMES[scope]}.
        </p>
        {error && <p className="form-error">{error}</p>}
      </div>
      <button
        className="google-button"
        onClick={handleConnect}
        disabled={starting}
      >
        <img src={googleLogo} alt="" className="google-logo" />
        {starting
          ? "מעביר ל-Google..."
          : status.connected
          ? "חיבור מחדש"
          : "חיבור חשבון Google"}
      </button>
    </div>
  );
}
