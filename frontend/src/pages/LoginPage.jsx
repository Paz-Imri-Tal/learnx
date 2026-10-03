import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch, setToken } from "../api";


export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();


    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setLoading(true);

        try{
            const data = await apiFetch("/auth/login", {
                method: "POST",
                body: JSON.stringify({ email, password }),
            });
            setToken(data.access_token);
            navigate("/");
        }
        catch(err){
            setError(err.message);
        }
        finally{
            setLoading(false);
        }
    }

    return (
      <div className="auth-page">
        <form className="auth-card" onSubmit={handleSubmit}>
          <h1>התחברות</h1>

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

          <p>
            אין לך חשבון? <Link to="/register">להרשמה</Link>
          </p>
        </form>
      </div>
    );
}