import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Trash2, UserPlus, X } from "lucide-react";
import { apiFetch } from "../api";
import { daysUntil, dueClass, dueLabel, formatDate, formatDateTime } from "../utils/dates";

const STATUS_LABELS = { pending: "ממתין לאישור", accepted: "שותף" };

export default function TaskDetailPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    async function loadTask() {
      try {
        const data = await apiFetch(`/tasks/${taskId}`);
        setTask(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadTask();
  }, [taskId]);

  async function handleInvite(event) {
    event.preventDefault();
    setInviting(true);
    setError("");

    try {
      const partner = await apiFetch(`/tasks/${taskId}/partners`, {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      setTask((prev) => ({ ...prev, partners: [...prev.partners, partner] }));
      setInviteEmail("");
    } catch (err) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  }

  async function handleRemovePartner(partner) {
    if (!window.confirm(`להסיר את ${partner.full_name} מהמטלה?`)) {
      return;
    }

    try {
      await apiFetch(`/tasks/${taskId}/partners/${partner.student_id}`, {
        method: "DELETE",
      });
      setTask((prev) => ({
        ...prev,
        partners: prev.partners.filter(
          (item) => item.student_id !== partner.student_id
        ),
      }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`למחוק את המטלה "${task.name}"?`)) {
      return;
    }

    try {
      await apiFetch(`/tasks/${taskId}`, { method: "DELETE" });
      navigate("/tasks");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleLeave() {
    if (!window.confirm("לעזוב את המטלה?")) {
      return;
    }

    try {
      await apiFetch(`/tasks/${taskId}/leave`, { method: "POST" });
      navigate("/tasks");
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return <p>טוען מטלה...</p>;
  }

  if (!task) {
    return (
      <section className="panel">
        <p className="form-error">{error || "המטלה לא נמצאה"}</p>
        <Link to="/tasks">חזרה למטלות</Link>
      </section>
    );
  }

  const days = daysUntil(task.due_date);

  return (
    <section className="panel">
      <Link to="/tasks" className="back-link">
        <ArrowRight size={18} />
        חזרה למטלות
      </Link>

      <div className="panel-header">
        <h1>
          <bdi>{task.name}</bdi>
        </h1>
        <span className={dueClass(days)}>{dueLabel(days)}</span>
      </div>

      <p className="task-meta">
        קורס: <bdi>{task.course_name}</bdi> · תאריך הגשה:{" "}
        {formatDate(task.due_date)}
      </p>

      <p className="task-meta">
        עודכן לאחרונה: {formatDateTime(task.updated_at)}
        {task.updated_by_name && ` · על ידי ${task.updated_by_name}`}
      </p>

      {error && <p className="form-error">{error}</p>}

      <h2>מי עובד על המטלה</h2>
      <ul className="course-list">
        <li className="course-item">
          <span>{task.owner_name}</span>
          <span className="status-badge">בעלים</span>
        </li>
        {task.partners.map((partner) => (
          <li key={partner.student_id} className="course-item">
            <span>
              {partner.full_name}{" "}
              <span className="task-meta">({partner.email})</span>
            </span>
            <div className="course-actions">
              <span className="status-badge">
                {STATUS_LABELS[partner.status]}
              </span>
              {task.is_owner && (
                <button
                  className="icon-button icon-button-danger"
                  onClick={() => handleRemovePartner(partner)}
                  title="הסרה"
                  aria-label={`הסרת ${partner.full_name}`}
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {task.is_owner ? (
        <>
          <form className="invite-form" onSubmit={handleInvite}>
            <label htmlFor="invite-email">הזמנת שותף לפי אימייל</label>
            <div className="invite-row">
              <input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />
              <button
                type="submit"
                className="button-with-icon"
                disabled={inviting}
              >
                <UserPlus size={18} />
                {inviting ? "שולח..." : "הזמן"}
              </button>
            </div>
          </form>

          <div className="danger-zone">
            <button
              className="button-with-icon button-danger"
              onClick={handleDelete}
            >
              <Trash2 size={18} />
              מחיקת המטלה
            </button>
          </div>
        </>
      ) : (
        <div className="danger-zone">
          <button className="button-danger-outline" onClick={handleLeave}>
            עזיבת המטלה
          </button>
        </div>
      )}
    </section>
  );
}
