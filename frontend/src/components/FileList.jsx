import { Download, Eye, FileText, Trash2 } from "lucide-react";
import { canView, downloadFile, formatSize, viewFile } from "../utils/files";
import { formatDateTime } from "../utils/dates";

export default function FileList({
  files,
  basePath,
  canDelete,
  onDelete,
  onError,
}) {
  if (files.length === 0) {
    return <p className="empty-state">עוד לא הועלו קבצים</p>;
  }

  async function handleView(file) {
    try {
      await viewFile(`${basePath}/${file.id}`);
    } catch (err) {
      onError(err.message);
    }
  }

  async function handleDownload(file) {
    try {
      await downloadFile(`${basePath}/${file.id}`, file.file_name);
    } catch (err) {
      onError(err.message);
    }
  }

  return (
    <ul className="course-list">
      {files.map((file) => (
        <li key={file.id} className="course-item file-item">
          <div className="file-info">
            <FileText size={20} />
            <div>
              <bdi className="file-name">{file.file_name}</bdi>
              <p className="task-meta">
                {formatSize(file.size)} · {formatDateTime(file.created_at)}
                {file.uploaded_by_name &&
                  ` · הועלה על ידי ${file.uploaded_by_name}`}
              </p>
            </div>
          </div>
          <div className="course-actions">
            {canView(file.mime_type) && (
              <button
                className="icon-button"
                onClick={() => handleView(file)}
                title="צפייה"
                aria-label={`צפייה ב-${file.file_name}`}
              >
                <Eye size={18} />
              </button>
            )}
            <button
              className="icon-button"
              onClick={() => handleDownload(file)}
              title="הורדה"
              aria-label={`הורדת ${file.file_name}`}
            >
              <Download size={18} />
            </button>
            {canDelete && (
              <button
                className="icon-button icon-button-danger"
                onClick={() => onDelete(file)}
                title="מחיקה"
                aria-label={`מחיקת ${file.file_name}`}
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
