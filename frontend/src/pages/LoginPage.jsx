import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch, setToken, API_URL } from "../api";
import googleLogo from "../assets/google-g.svg";
import AuthLayout from "../components/AuthLayout";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(
    searchParams.get("error") === "google"
      ? "ההתחברות עם Google נכשלה, נסה שוב"
      : ""
  );
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(data.access_token);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>ברוך הבא בחזרה</h1>
        <p className="auth-lead">התחבר כדי להמשיך לנהל את התואר שלך</p>

        <label htmlFor="email">אימייל</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="password">סיסמה</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="form-error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "מתחבר..." : "התחבר"}
        </button>

        <p className="auth-divider">או</p>

        <button
          type="button"
          className="google-button"
          onClick={() => {
            window.location.href = `${API_URL}/auth/google/login`;
          }}
        >
          <img src={googleLogo} alt="" className="google-logo" />
          התחברות עם Google
        </button>

        <p>
          אין לך חשבון? <Link to="/register">להרשמה</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
