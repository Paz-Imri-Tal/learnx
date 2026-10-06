import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch, GOOGLE_LINK_RETURN_KEY } from "../api";

export default function GoogleLinkedPage() {
  const navigate = useNavigate();
  const handled = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (handled.current) {
      return;
    }
    handled.current = true;

    const params = new URLSearchParams(window.location.hash.slice(1));
    const linkToken = params.get("link");
    const returnTo = sessionStorage.getItem(GOOGLE_LINK_RETURN_KEY) || "/";
    sessionStorage.removeItem(GOOGLE_LINK_RETURN_KEY);

    async function completeLink() {
      if (!linkToken) {
        setError("החיבור ל-Google בוטל או נכשל. אפשר לנסות שוב");
        return;
      }

      try {
        await apiFetch("/auth/google/link-complete", {
          method: "POST",
          body: JSON.stringify({ link_token: linkToken }),
        });
        navigate(returnTo, { replace: true });
      } catch (err) {
        setError(err.message);
      }
    }

    completeLink();
  }, [navigate]);

  if (error) {
    return (
      <section className="panel">
        <p className="form-error">{error}</p>
        <Link to="/">חזרה לדף הבית</Link>
      </section>
    );
  }

  return <p className="loading">מחבר את חשבון Google...</p>;
}
