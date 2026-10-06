import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Folder, FolderPlus, Trash2 } from "lucide-react";
import { apiFetch } from "../api";
import GoogleConnect from "../components/GoogleConnect";

export default function FoldersPage() {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadFolders() {
      try {
        const data = await apiFetch("/folders");
        setFolders(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadFolders();
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const folder = await apiFetch("/folders", {
        method: "POST",
        body: JSON.stringify({ name: newName }),
      });
      setFolders((prev) =>
        [...prev, folder].sort((a, b) => a.name.localeCompare(b.name, "he"))
      );
      setNewName("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(folder) {
    const warning =
      folder.file_count > 0
        ? `למחוק את התיקייה "${folder.name}"? כל ${folder.file_count} הקבצים בה יימחקו גם מ-Google Drive.`
        : `למחוק את התיקייה "${folder.name}"?`;
    if (!window.confirm(warning)) {
      return;
    }

    try {
      await apiFetch(`/folders/${folder.id}`, { method: "DELETE" });
      setFolders((prev) => prev.filter((item) => item.id !== folder.id));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return <p>טוען תיקיות...</p>;
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h1>התיקיות שלי</h1>
      </div>

      <GoogleConnect
        scope="drive"
        reason="הקבצים בתיקיות נשמרים ב-Google Drive שלך, בתיקייה בשם LearnX."
      />

      {error && <p className="form-error">{error}</p>}

      <form className="invite-row folder-form" onSubmit={handleCreate}>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="שם לתיקייה חדשה"
          maxLength={100}
          required
        />
        <button type="submit" className="button-with-icon" disabled={saving}>
          <FolderPlus size={18} />
          {saving ? "יוצר..." : "תיקייה חדשה"}
        </button>
      </form>

      {folders.length === 0 ? (
        <p className="empty-state">עדיין לא נוספו תיקיות</p>
      ) : (
        <ul className="folder-grid">
          {folders.map((folder) => (
            <li key={folder.id} className="folder-card">
              <Link to={`/folders/${folder.id}`} className="folder-link">
                <Folder size={48} />
                <bdi className="folder-name">{folder.name}</bdi>
                <span className="task-meta">{folder.file_count} קבצים</span>
              </Link>
              <button
                className="icon-button icon-button-danger"
                onClick={() => handleDelete(folder)}
                title="מחיקה"
                aria-label={`מחיקת התיקייה ${folder.name}`}
              >
                <Trash2 size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
