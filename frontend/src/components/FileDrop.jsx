import { useRef, useState } from "react";
import { UploadCloud, X } from "lucide-react";

const MAX_FILE_SIZE = 40 * 1024 * 1024;

export default function FileDrop({ files, onChange, multiple = false }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState([]);

  function addFiles(newFiles) {
    const valid = newFiles.filter((file) => file.size <= MAX_FILE_SIZE);
    setRejected(
      newFiles
        .filter((file) => file.size > MAX_FILE_SIZE)
        .map((file) => file.name)
    );
    onChange(multiple ? [...files, ...valid] : valid.slice(0, 1));
  }

  function removeFile(index) {
    onChange(files.filter((_, i) => i !== index));
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  function handleSelect(event) {
    addFiles(Array.from(event.target.files));
    event.target.value = "";
  }

  return (
    <div>
      <div
        className={dragging ? "file-drop file-drop-active" : "file-drop"}
        onClick={() => inputRef.current.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <UploadCloud size={32} />
        <p>גרור לכאן {multiple ? "קבצים" : "קובץ"} או לחץ לבחירה</p>
        <p className="task-meta">עד 40MB לקובץ</p>
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          onChange={handleSelect}
          hidden
        />
      </div>

      {rejected.length > 0 && (
        <p className="form-error">
          {rejected.length === 1 ? "הקובץ" : "הקבצים"}{" "}
          <bdi>{rejected.join(", ")}</bdi>{" "}
          {rejected.length === 1
            ? "גדול מ-40MB ולא נוסף"
            : "גדולים מ-40MB ולא נוספו"}
        </p>
      )}

      {files.length > 0 && (
        <ul className="file-drop-list">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`}>
              <bdi>{file.name}</bdi>
              <button
                type="button"
                className="icon-button icon-button-danger"
                onClick={() => removeFile(index)}
                title="הסרה מהרשימה"
                aria-label={`הסרת ${file.name} מהרשימה`}
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
