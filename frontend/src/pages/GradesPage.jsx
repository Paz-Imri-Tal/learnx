import { useEffect, useState } from "react";
import { apiFetch } from "../api";

export default function GradesPage() {
  const [courses, setCourses] = useState([]);
  const [grades, setGrades] = useState({});
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [coursesData, averageData] = await Promise.all([
          apiFetch("/courses"),
          apiFetch("/courses/average"),
        ]);
        setCourses(coursesData);
        setGrades(
          Object.fromEntries(
            coursesData.map((course) => [course.id, course.grade ?? ""])
          )
        );
        setSummary(averageData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  function updateGrade(courseId, value) {
    setGrades((prev) => ({ ...prev, [courseId]: value }));
  }

  async function saveGrade(course) {
    const raw = grades[course.id];
    const newGrade = raw === "" ? null : Number(raw);

    if (newGrade === course.grade) {
      return;
    }

    if (newGrade !== null && (newGrade < 0 || newGrade > 100)) {
      setError("ציון חייב להיות בין 0 ל-100");
      return;
    }

    setSavingId(course.id);
    setError("");

    try {
      const updated = await apiFetch(`/courses/${course.id}/grade`, {
        method: "PATCH",
        body: JSON.stringify({ grade: newGrade }),
      });
      setCourses((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      const averageData = await apiFetch("/courses/average");
      setSummary(averageData);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return <p>טוען ציונים...</p>;
  }

  return (
    <section className="panel">
      <h1>חישוב ממוצע</h1>

      {summary && (
        <div className="average-card">
          <span className="average-label">ממוצע משוקלל</span>
          <span className="average-value">{summary.average ?? "—"}</span>
          <span className="average-note">
            לפי {summary.graded_credits} מתוך {summary.total_credits} נ"ז
          </span>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}

      {courses.length === 0 ? (
        <p className="empty-state">
          עדיין אין קורסים. אפשר להוסיף אותם בעמוד "קורסים".
        </p>
      ) : (
        <table className="grades-table">
          <thead>
            <tr>
              <th>קורס</th>
              <th>נ"ז</th>
              <th>ציון</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id}>
                <td>
                  <bdi>{course.name}</bdi>
                </td>
                <td>{course.credits}</td>
                <td>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    className="grade-input"
                    placeholder="—"
                    value={grades[course.id]}
                    onChange={(e) => updateGrade(course.id, e.target.value)}
                    onBlur={() => saveGrade(course)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      }
                    }}
                    disabled={savingId === course.id}
                    aria-label={`ציון בקורס ${course.name}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
