import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Plus, X } from "lucide-react";
import { apiFetch } from "../api";
import { daysUntil, dueClass, dueLabel, formatDate } from "../utils/dates";

const EMPTY_FORM = { name: "", course_id: "", due_date: "" };

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [tasksData, invitationsData, coursesData] = await Promise.all([
          apiFetch("/tasks"),
          apiFetch("/tasks/invitations"),
          apiFetch("/courses"),
        ]);
        setTasks(tasksData);
        setInvitations(invitationsData);
        setCourses(coursesData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function openForm() {
    setForm({
      ...EMPTY_FORM,
      course_id: courses[0] ? String(courses[0].id) : "",
    });
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await apiFetch("/tasks", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          course_id: Number(form.course_id),
          due_date: form.due_date,
        }),
      });
      setShowForm(false);
      setForm(EMPTY_FORM);
      const updated = await apiFetch("/tasks");
      setTasks(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function answerInvitation(invitation, action) {
    setError("");
    try {
      await apiFetch(`/tasks/${invitation.task_id}/${action}`, {
        method: "POST",
      });
      setInvitations((prev) =>
        prev.filter((item) => item.task_id !== invitation.task_id)
      );
      if (action === "accept") {
        const updated = await apiFetch("/tasks");
        setTasks(updated);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return <p>טוען מטלות...</p>;
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h1>המטלות שלי</h1>
        <button className="button-with-icon" onClick={openForm}>
          <Plus size={20} />
          הוסף מטלה
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {invitations.length > 0 && (
        <div className="invitations">
          <h2>הזמנות שממתינות לך</h2>
          {invitations.map((invitation) => (
            <div key={invitation.task_id} className="invitation-item">
              <span>
                <strong>{invitation.invited_by}</strong> הזמין אותך למטלה{" "}
                <bdi>{invitation.task_name}</bdi> בקורס{" "}
                <bdi>{invitation.course_name}</bdi>, להגשה עד{" "}
                {formatDate(invitation.due_date)}
              </span>
              <div className="course-actions">
                <button
                  className="button-with-icon"
                  onClick={() => answerInvitation(invitation, "accept")}
                >
                  <Check size={18} />
                  אישור
                </button>
                <button
                  className="button-with-icon button-secondary"
                  onClick={() => answerInvitation(invitation, "decline")}
                >
                  <X size={18} />
                  דחייה
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm &&
        (courses.length === 0 ? (
          <p className="empty-state">
            כדי להוסיף מטלה, צריך קודם להוסיף קורס בעמוד "קורסים".
          </p>
        ) : (
          <form className="course-form" onSubmit={handleSubmit}>
            <h2>מטלה חדשה</h2>

            <label htmlFor="task-name">שם המטלה</label>
            <input
              id="task-name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              maxLength={255}
              required
            />

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="task-course">קורס</label>
                <select
                  id="task-course"
                  value={form.course_id}
                  onChange={(e) => updateField("course_id", e.target.value)}
                >
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="task-due">תאריך הגשה</label>
                <input
                  id="task-due"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => updateField("due_date", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={saving}>
                {saving ? "שומר..." : "שמור"}
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={() => setShowForm(false)}
              >
                ביטול
              </button>
            </div>
          </form>
        ))}

      {tasks.length === 0 ? (
        <p className="empty-state">אין לך מטלות כרגע.</p>
      ) : (
        <ul className="course-list">
          {tasks.map((task) => {
            const days = daysUntil(task.due_date);
            return (
              <li key={task.id}>
                <Link to={`/tasks/${task.id}`} className="task-item">
                  <div className="task-main">
                    <strong>
                      <bdi>{task.name}</bdi>
                    </strong>
                    <span className="task-meta">
                      <bdi>{task.course_name}</bdi> · עד{" "}
                      {formatDate(task.due_date)}
                      {!task.is_owner && ` · משותף מ${task.owner_name}`}
                    </span>
                  </div>
                  <span className={dueClass(days)}>{dueLabel(days)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
