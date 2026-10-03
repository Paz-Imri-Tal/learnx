import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, clearToken } from "../api";

export default function HomePage() {
  const [student, setStudent] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadStudent() {
      try {
        const data = await apiFetch("/auth/me");
        setStudent(data);
      } catch {
        clearToken();
        navigate("/login");
      }
    }

    loadStudent();
  }, [navigate]);

  function handleLogout() {
    clearToken();
    navigate("/login");
  }

  if (!student) {
    return <p>טוען...</p>;
  }

  return (
    <div className="home-page">
      <h1>שלום, {student.full_name}</h1>
      <p>{student.email}</p>
      <button onClick={handleLogout}>התנתקות</button>
    </div>
  );
}
