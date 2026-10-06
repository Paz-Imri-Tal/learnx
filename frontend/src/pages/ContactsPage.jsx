import { useEffect, useState } from "react";
import { Mail, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { apiFetch } from "../api";

const EMPTY_CONTACT = { name: "", email: "" };
const EMPTY_MESSAGE = { subject: "", message: "" };

function mailtoLink(email, subject, message) {
  const params = new URLSearchParams({ subject, body: message });
  return `mailto:${email}?${params.toString().replaceAll("+", "%20")}`;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_CONTACT);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [recipient, setRecipient] = useState(null);
  const [draft, setDraft] = useState(EMPTY_MESSAGE);
  const [sending, setSending] = useState(false);
  const [fallbackLink, setFallbackLink] = useState("");

  useEffect(() => {
    async function loadContacts() {
      try {
        const data = await apiFetch("/contacts");
        setContacts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadContacts();
  }, []);

  function clearMessages() {
    setError("");
    setSuccess("");
    setFallbackLink("");
  }

  function openAddForm() {
    clearMessages();
    setRecipient(null);
    setForm(EMPTY_CONTACT);
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(contact) {
    clearMessages();
    setRecipient(null);
    setForm({ name: contact.name, email: contact.email });
    setEditingId(contact.id);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_CONTACT);
  }

  function openCompose(contact) {
    clearMessages();
    closeForm();
    setDraft(EMPTY_MESSAGE);
    setRecipient(contact);
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    clearMessages();

    try {
      const saved = await apiFetch(
        editingId ? `/contacts/${editingId}` : "/contacts",
        {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify(form),
        }
      );
      setContacts((prev) =>
        [...prev.filter((item) => item.id !== saved.id), saved].sort((a, b) =>
          a.name.localeCompare(b.name, "he")
        )
      );
      closeForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(contact) {
    if (!window.confirm(`למחוק את ${contact.name} מהרישומון?`)) {
      return;
    }
    clearMessages();

    try {
      await apiFetch(`/contacts/${contact.id}`, { method: "DELETE" });
      setContacts((prev) => prev.filter((item) => item.id !== contact.id));
      if (recipient?.id === contact.id) {
        setRecipient(null);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSend(event) {
    event.preventDefault();
    setSending(true);
    clearMessages();

    try {
      await apiFetch(`/contacts/${recipient.id}/send`, {
        method: "POST",
        body: JSON.stringify(draft),
      });
      setSuccess(`המייל נשלח ל${recipient.name}`);
      setRecipient(null);
      setDraft(EMPTY_MESSAGE);
    } catch (err) {
      setError(err.message);
      setFallbackLink(
        mailtoLink(recipient.email, draft.subject, draft.message)
      );
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <p>טוען אנשי קשר...</p>;
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h1>רישומון מיילים</h1>
        <button className="button-with-icon" onClick={openAddForm}>
          <Plus size={20} />
          הוסף איש קשר
        </button>
      </div>

      {success && <p className="form-success">{success}</p>}
      {error && <p className="form-error">{error}</p>}
      {fallbackLink && (
        <p className="task-meta">
          אפשר לשלוח את אותה פנייה דרך תוכנת המייל שלך:{" "}
          <a href={fallbackLink}>פתיחה בתוכנת המייל</a>
        </p>
      )}

      {showForm && (
        <form className="course-form" onSubmit={handleSave}>
          <h2>{editingId ? "עריכת איש קשר" : "איש קשר חדש"}</h2>

          <label htmlFor="contact-name">שם המרצה</label>
          <input
            id="contact-name"
            value={form.name}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, name: e.target.value }))
            }
            maxLength={100}
            required
          />

          <label htmlFor="contact-email">מייל</label>
          <input
            id="contact-email"
            type="email"
            dir="ltr"
            value={form.email}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, email: e.target.value }))
            }
            required
          />

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

      {recipient && (
        <form className="course-form" onSubmit={handleSend}>
          <h2>
            פנייה ל<bdi>{recipient.name}</bdi>
          </h2>
          <p className="task-meta">
            המייל יישלח מ-LearnX, ותשובה של המרצה תגיע ישירות למייל שלך.
          </p>

          <label htmlFor="message-subject">נושא (לא חובה)</label>
          <input
            id="message-subject"
            value={draft.subject}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, subject: e.target.value }))
            }
            placeholder="למשל: שאלה על מטלה 2"
            maxLength={150}
          />

          <label htmlFor="message-body">תוכן הפנייה</label>
          <textarea
            id="message-body"
            rows={6}
            value={draft.message}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, message: e.target.value }))
            }
            maxLength={5000}
            required
          />

          <div className="form-actions">
            <button
              type="submit"
              className="button-with-icon"
              disabled={sending}
            >
              <Send size={18} />
              {sending ? "שולח..." : "שליחה"}
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => setRecipient(null)}
            >
              ביטול
            </button>
          </div>
        </form>
      )}

      {contacts.length === 0 ? (
        <p className="empty-state">
          עוד אין אנשי קשר. לחץ על "הוסף איש קשר" כדי להוסיף מרצה.
        </p>
      ) : (
        <ul className="course-list">
          {contacts.map((contact) => (
            <li key={contact.id} className="course-item">
              <div>
                <bdi className="file-name">{contact.name}</bdi>
                <p className="task-meta contact-email">
                  <bdi>{contact.email}</bdi>
                </p>
              </div>
              <div className="course-actions">
                <button
                  className="button-with-icon button-secondary"
                  onClick={() => openCompose(contact)}
                >
                  <Mail size={18} />
                  פנייה למרצה
                </button>
                <button
                  className="icon-button"
                  onClick={() => openEditForm(contact)}
                  title="עריכה"
                  aria-label={`עריכת ${contact.name}`}
                >
                  <Pencil size={18} />
                </button>
                <button
                  className="icon-button icon-button-danger"
                  onClick={() => handleDelete(contact)}
                  title="מחיקה"
                  aria-label={`מחיקת ${contact.name}`}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
