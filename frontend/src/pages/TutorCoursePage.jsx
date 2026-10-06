import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, FileText, Send, Trash2, Upload } from "lucide-react";
import { apiFetch, apiUpload } from "../api";
import FileDrop from "../components/FileDrop";
import { formatDateTime } from "../utils/dates";

const MATERIAL_TYPES = ".pdf,.docx";

export default function TutorCoursePage() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    async function loadPage() {
      try {
        const [courses, materialList, history] = await Promise.all([
          apiFetch("/courses"),
          apiFetch(`/tutor/courses/${courseId}/materials`),
          apiFetch(`/tutor/courses/${courseId}/messages`),
        ]);
        setCourse(courses.find((item) => item.id === Number(courseId)) ?? null);
        setMaterials(materialList);
        setMessages(history);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [courseId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function handleUpload(event) {
    event.preventDefault();
    if (selectedFiles.length === 0) {
      return;
    }
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", selectedFiles[0]);

    try {
      const material = await apiUpload(
        `/tutor/courses/${courseId}/materials`,
        formData
      );
      setMaterials((prev) => [...prev, material]);
      setSelectedFiles([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteMaterial(material) {
    if (!window.confirm(`למחוק את "${material.file_name}" מחומרי הלימוד?`)) {
      return;
    }

    try {
      await apiFetch(`/tutor/courses/${courseId}/materials/${material.id}`, {
        method: "DELETE",
      });
      setMaterials((prev) => prev.filter((item) => item.id !== material.id));
    } catch (err) {
      setError(err.message);
    }
  }

  async function sendMessage() {
    const content = draft.trim();
    if (!content || sending) {
      return;
    }
    setSending(true);
    setError("");

    const tempMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content,
    };
    setMessages((prev) => [...prev, tempMessage]);
    setDraft("");

    try {
      const reply = await apiFetch(`/tutor/courses/${courseId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      setMessages((prev) => [...prev, reply]);
    } catch (err) {
      setMessages((prev) => prev.filter((item) => item.id !== tempMessage.id));
      setDraft(content);
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    sendMessage();
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  if (loading) {
    return <p>טוען...</p>;
  }

  if (!course) {
    return (
      <section className="panel">
        <p className="form-error">{error || "הקורס לא נמצא"}</p>
        <Link to="/tutor">חזרה למורה הפרטי</Link>
      </section>
    );
  }

  return (
    <section className="panel">
      <Link to="/tutor" className="back-link">
        <ArrowRight size={18} />
        חזרה לבחירת קורס
      </Link>

      <div className="panel-header">
        <h1>
          מורה פרטי: <bdi>{course.name}</bdi>
        </h1>
      </div>

      {error && <p className="form-error">{error}</p>}

      <details className="tutor-materials" open={materials.length === 0}>
        <summary>חומרי לימוד ({materials.length})</summary>

        {materials.length === 0 ? (
          <p className="task-meta">
            עדיין לא הועלו חומרים. העלה סיכום או מצגת, והמורה ילמד איתך מתוכם.
          </p>
        ) : (
          <ul className="course-list">
            {materials.map((material) => (
              <li key={material.id} className="course-item tutor-material">
                <FileText size={20} />
                <span className="tutor-material-name">
                  <bdi>{material.file_name}</bdi>
                </span>
                <span className="task-meta">
                  {formatDateTime(material.created_at)}
                </span>
                <button
                  type="button"
                  className="icon-button icon-button-danger"
                  onClick={() => handleDeleteMaterial(material)}
                  title="מחיקה"
                  aria-label={`מחיקת ${material.file_name}`}
                >
                  <Trash2 size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <form className="upload-form" onSubmit={handleUpload}>
          <FileDrop
            files={selectedFiles}
            onChange={setSelectedFiles}
            maxSizeMb={20}
            accept={MATERIAL_TYPES}
          />
          <p className="task-meta">
            קבצי PDF או Word בלבד. מצגת PowerPoint יש לשמור קודם כ-PDF. המורה
            קורא רק טקסט, ולא תמונות שבתוך הקובץ.
          </p>
          <button
            type="submit"
            className="button-with-icon"
            disabled={uploading || selectedFiles.length === 0}
          >
            <Upload size={18} />
            {uploading ? "מעלה..." : "העלאה"}
          </button>
        </form>
      </details>

      <div className="tutor-chat" aria-live="polite">
        {messages.length === 0 && (
          <p className="tutor-chat-empty">
            {materials.length === 0
              ? "העלה חומר לימוד כדי להתחיל."
              : "על מה נלמד היום? אפשר לשאול על נושא מהחומר, או לבקש הסבר על תרגיל."}
          </p>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === "user"
                ? "tutor-message tutor-message-user"
                : "tutor-message tutor-message-assistant"
            }
          >
            {message.content}
          </div>
        ))}

        {sending && (
          <div className="tutor-message tutor-message-assistant tutor-message-pending">
            המורה כותב...
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <form className="tutor-form" onSubmit={handleSubmit}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          maxLength={5000}
          placeholder="כתוב שאלה למורה... (Shift+Enter לשורה חדשה)"
          aria-label="הודעה למורה"
          disabled={materials.length === 0}
        />
        <button
          type="submit"
          className="button-with-icon"
          disabled={sending || !draft.trim() || materials.length === 0}
        >
          <Send size={18} />
          שליחה
        </button>
      </form>
    </section>
  );
}
