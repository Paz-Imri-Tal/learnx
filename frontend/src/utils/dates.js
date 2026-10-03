export function formatDate(dateString) {
  const [year, month, day] = dateString.split("-");
  return `${day}.${month}.${year}`;
}

export function daysUntil(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dateString}T00:00:00`);
  return Math.round((due - today) / (1000 * 60 * 60 * 24));
}

export function dueLabel(days) {
  if (days < 0) return `באיחור של ${-days} ימים`;
  if (days === 0) return "להגשה היום";
  if (days === 1) return "להגשה מחר";
  return `עוד ${days} ימים`;
}

export function dueClass(days) {
  if (days < 0) return "due-badge due-late";
  if (days <= 3) return "due-badge due-soon";
  return "due-badge";
}

export function formatDateTime(isoString) {
  const date = new Date(`${isoString}Z`);
  return date.toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}