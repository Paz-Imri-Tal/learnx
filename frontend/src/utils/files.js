import { apiFetchBlob } from "../api";

const VIEWABLE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "text/plain",
];

export function canView(mimeType) {
  return VIEWABLE_TYPES.includes(mimeType);
}

export function formatSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function viewFile(path) {
  const newTab = window.open("", "_blank");
  try {
    const blob = await apiFetchBlob(path);
    const url = URL.createObjectURL(blob);
    newTab.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    newTab.close();
    throw err;
  }
}

export async function downloadFile(path, fileName) {
  const blob = await apiFetchBlob(`${path}?download=true`);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
