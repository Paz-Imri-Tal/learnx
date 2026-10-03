import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { apiFetch } from "../api";

const YEAR_LABELS = { 1: "שנה א'", 2: "שנה ב'", 3: "שנה ג'", 4: "שנה ד'" };
const SEMESTERS = ["א", "ב", "ג"];
const EMPTY_FORM = { name: "", credits: "", academic_year: "1", semester: "א" };

function groupCourses(courses) {
  const groups = [];
  for (const course of courses) {
    const last = groups[groups.length - 1];
    if (
      last &&
      last.year === course.academic_year &&
      last.semester === course.semester
    ) {
      last.courses.push(course);
    } else {
      groups.push({
        year: course.academic_year,
        semester: course.semester,
        courses: [course],
      });
    }
  }
  return groups;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

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

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function openAddForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError("");
    setShowForm(true);
  }

  function openEditForm(course) {
    setForm({
      name: course.name,
      credits: String(course.credits),
      academic_year: String(course.academic_year),
      semester: course.semester,
    });
    setEditingId(course.id);
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const body = {
      name: form.name.trim(),
      credits: Number(form.credits),
      academic_year: Number(form.academic_year),
      semester: form.semester,
    };

    try {
      if (editingId) {
        const existing = courses.find((course) => course.id === editingId);
        await apiFetch(`/courses/${editingId}`, {
          method: "PUT",
          body: JSON.stringify({ ...body, grade: existing.grade }),
        });
      } else {
        await apiFetch("/courses", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      closeForm();
      const updated = await apiFetch("/courses");
      setCourses(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(course) {
    if (!window.confirm(`למחוק את הקורס "${course.name}"?`)) {
      return;
    }

    try {
      await apiFetch(`/courses/${course.id}`, { method: "DELETE" });
      setCourses((prev) => prev.filter((item) => item.id !== course.id));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return <p>טוען קורסים...</p>;
  }

  const groups = groupCourses(courses);
  const totalCredits = courses.reduce((sum, course) => sum + course.credits, 0);

  return (
    <section className="panel">
      <div className="panel-header">
        <h1>הקורסים שלי</h1>
        <button className="button-with-icon" onClick={openAddForm}>
          <Plus size={20} />
          הוסף קורס
        </button>
      </div>

      <p className="credits-summary">
        סה"כ נקודות זכות: <strong>{totalCredits}</strong>
      </p>

      {error && <p className="form-error">{error}</p>}

      {showForm && (
        <form className="course-form" onSubmit={handleSubmit}>
          <h2>{editingId ? "עריכת קורס" : "קורס חדש"}</h2>

          <label htmlFor="course-name">שם הקורס</label>
          <input
            id="course-name"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            maxLength={255}
            required
          />

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="course-credits">נקודות זכות</label>
              <input
                id="course-credits"
                type="number"
                min="0.5"
                max="10"
                step="0.5"
                value={form.credits}
                onChange={(e) => updateField("credits", e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="course-year">שנה</label>
              <select
                id="course-year"
                value={form.academic_year}
                onChange={(e) => updateField("academic_year", e.target.value)}
              >
                {Object.entries(YEAR_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="course-semester">סמסטר</label>
              <select
                id="course-semester"
                value={form.semester}
                onChange={(e) => updateField("semester", e.target.value)}
              >
                {SEMESTERS.map((semester) => (
                  <option key={semester} value={semester}>
                    סמסטר {semester}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving ? "שומר..." : "שמור"}
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={closeForm}
            >
              ביטול
            </button>
          </div>
        </form>
      )}

      {courses.length === 0 ? (
        <p className="empty-state">
          אין לך עדיין קורסים במערכת. לחץ על "הוסף קורס" כדי להתחיל.
        </p>
      ) : (
        groups.map((group) => (
          <div key={`${group.year}-${group.semester}`} className="course-group">
            <h3 className="course-group-title">
              {YEAR_LABELS[group.year]} · סמסטר {group.semester}
            </h3>
            <ul className="course-list">
              {group.courses.map((course) => (
                <li key={course.id} className="course-item">
                  <span>
                    <bdi>{course.name}</bdi> | {course.credits} נ"ז
                  </span>
                  <div className="course-actions">
                    <button
                      className="icon-button"
                      onClick={() => openEditForm(course)}
                      title="עריכה"
                      aria-label={`עריכת ${course.name}`}
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      className="icon-button icon-button-danger"
                      onClick={() => handleDelete(course)}
                      title="מחיקה"
                      aria-label={`מחיקת ${course.name}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
