import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { setToken } from "../api";

export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) {
      return;
    }
    handled.current = true;

    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get("token");

    if (token) {
      setToken(token);
      navigate("/", { replace: true });
    } else {
      navigate("/login?error=google", { replace: true });
    }
  }, [navigate]);

  return <p className="loading">מתחבר עם Google...</p>;
}
