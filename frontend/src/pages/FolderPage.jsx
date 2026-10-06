import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Upload } from "lucide-react";
import { apiFetch, apiUpload } from "../api";
import FileDrop from "../components/FileDrop";
import FileList from "../components/FileList";
import GoogleConnect from "../components/GoogleConnect";

export default function FolderPage() {
  const { folderId } = useParams();
  const [folder, setFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [displayName, setDisplayName] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function loadFolder() {
      try {
        const data = await apiFetch(`/folders/${folderId}`);
        setFolder(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadFolder();
  }, [folderId]);

  async function handleUpload(event) {
    event.preventDefault();
    if (selectedFiles.length === 0) {
      setError("נא לבחור קובץ להעלאה");
      return;
    }
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", selectedFiles[0]);
    formData.append("display_name", displayName);

    try {
      const file = await apiUpload(`/folders/${folderId}/files`, formData);
      setFolder((prev) => ({ ...prev, files: [...prev.files, file] }));
      setSelectedFiles([]);
      setDisplayName("");
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteFile(file) {
    if (!window.confirm(`למחוק את "${file.file_name}"? הקובץ יימחק גם מ-Google Drive.`)) {
      return;
    }

    try {
      await apiFetch(`/folders/${folderId}/files/${file.id}`, { method: "DELETE" });
      setFolder((prev) => ({
        ...prev,
        files: prev.files.filter((item) => item.id !== file.id),
      }));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return <p>טוען תיקייה...</p>;
  }

  if (!folder) {
    return (
      <section className="panel">
        <p className="form-error">{error || "התיקייה לא נמצאה"}</p>
        <Link to="/folders">חזרה לתיקיות</Link>
      </section>
    );
  }

  return (
    <section className="panel">
      <Link to="/folders" className="back-link">
        <ArrowRight size={18} />
        חזרה לתיקיות
      </Link>

      <div className="panel-header">
        <h1>
          <bdi>{folder.name}</bdi>
        </h1>
      </div>

      <GoogleConnect
        scope="drive"
        reason="הקבצים בתיקיות נשמרים ב-Google Drive שלך, בתיקייה בשם LearnX."
      />

      {error && <p className="form-error">{error}</p>}

      <FileList
        files={folder.files}
        basePath={`/folders/${folderId}/files`}
        canDelete
        onDelete={handleDeleteFile}
        onError={setError}
      />

      <h2>הוספת מסמך</h2>
      <form className="upload-form" onSubmit={handleUpload}>
        <div className="form-field">
          <label htmlFor="display-name">שם מותאם אישית (לא חובה)</label>
          <input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="למשל: סיכום הרצאה 3"
            maxLength={200}
          />
        </div>
        <FileDrop files={selectedFiles} onChange={setSelectedFiles} />
        <button
          type="submit"
          className="button-with-icon"
          disabled={uploading || selectedFiles.length === 0}
        >
          <Upload size={18} />
          {uploading ? "מעלה..." : "העלאה"}
        </button>
      </form>
    </section>
  );
}