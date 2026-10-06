import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { apiFetch } from "../api";

export default function TutorPage() {
  const { student } = useOutletContext();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCourses() {
      try {
        const data = await apiFetch("/courses");
        setCourses(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadCourses();
  }, []);

  if (loading) {
    return <p>טוען...</p>;
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h1>
          היי <bdi>{student.full_name}</bdi>, במה אוכל לעזור לך?
        </h1>
      </div>

      {error && <p className="form-error">{error}</p>}

      {courses.length === 0 ? (
        <div className="empty-state">
          <p>כדי ללמוד עם המורה הפרטי, צריך קודם להוסיף קורס.</p>
          <Link to="/courses">מעבר לעמוד הקורסים</Link>
        </div>
      ) : (
        <>
          <p className="tutor-intro">
            בחר קורס. בתוך הקורס אפשר להעלות סיכומים ומצגות, והמורה ילמד איתך
            מתוך החומר שלך.
          </p>
          <ul className="folder-grid">
            {courses.map((course) => (
              <li key={course.id} className="folder-card">
                <Link to={`/tutor/${course.id}`} className="folder-link">
                  <BookOpen size={40} />
                  <span className="folder-name">
                    <bdi>{course.name}</bdi>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
