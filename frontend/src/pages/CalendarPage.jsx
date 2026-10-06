import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import heLocale from "@fullcalendar/core/locales/he";
import { RefreshCw, Trash2 } from "lucide-react";
import { apiFetch } from "../api";
import GoogleConnect from "../components/GoogleConnect";

const TASK_COLOR = "#f47a60";

const EMPTY_FORM = {
  title: "",
  allDay: false,
  startDate: "",
  startTime: "09:00",
  endDate: "",
  endTime: "10:00",
  color: "#316879",
  link: "",
};

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toCalendarEvent(event) {
  return {
    id: `event-${event.id}`,
    title: event.title,
    start: event.start,
    end: event.end,
    allDay: event.all_day,
    backgroundColor: event.color,
    borderColor: event.color,
    extendedProps: { kind: "event", data: event },
  };
}

function toCalendarTask(task) {
  return {
    id: `task-${task.id}`,
    title: `📌 ${task.name}`,
    start: task.due_date,
    allDay: true,
    backgroundColor: TASK_COLOR,
    borderColor: TASK_COLOR,
    textColor: "#13262e",
    extendedProps: { kind: "task", data: task },
  };
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingEvent, setEditingEvent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [eventsData, tasksData] = await Promise.all([
          apiFetch("/events"),
          apiFetch("/tasks"),
        ]);
        setEvents(eventsData);
        setTasks(tasksData);
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

  function handleSelect(info) {
    const startDate = info.startStr.slice(0, 10);
    const endDate = info.allDay
      ? addDays(info.endStr.slice(0, 10), -1)
      : info.endStr.slice(0, 10);

    setForm({
      ...EMPTY_FORM,
      startDate,
      endDate,
      startTime: info.allDay ? "09:00" : info.startStr.slice(11, 16),
      endTime: info.allDay ? "10:00" : info.endStr.slice(11, 16),
    });
    setEditingEvent(null);
    setError("");
    setShowForm(true);
  }

  function handleEventClick(info) {
    const { kind, data } = info.event.extendedProps;

    if (kind === "task") {
      navigate(`/tasks/${data.id}`);
      return;
    }

    if (data.source !== "local") {
      if (data.link) {
        window.open(data.link, "_blank", "noopener");
      }
      return;
    }

    const endDate = data.end.slice(0, 10);
    setForm({
      title: data.title,
      allDay: data.all_day,
      startDate: data.start.slice(0, 10),
      startTime: data.start.slice(11, 16),
      endDate: data.all_day ? addDays(endDate, -1) : endDate,
      endTime: data.end.slice(11, 16),
      color: data.color,
      link: data.link ?? "",
    });
    setEditingEvent(data);
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingEvent(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const start = form.allDay
      ? `${form.startDate}T00:00:00`
      : `${form.startDate}T${form.startTime}:00`;
    const end = form.allDay
      ? `${addDays(form.endDate, 1)}T00:00:00`
      : `${form.endDate}T${form.endTime}:00`;

    if (end <= start) {
      setError("זמן הסיום חייב להיות אחרי זמן ההתחלה");
      return;
    }

    const body = {
      title: form.title.trim(),
      start,
      end,
      all_day: form.allDay,
      color: form.color,
      link: form.link.trim() || null,
    };

    setSaving(true);
    setError("");

    try {
      if (editingEvent) {
        const updated = await apiFetch(`/events/${editingEvent.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        setEvents((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
        );
      } else {
        const created = await apiFetch("/events", {
          method: "POST",
          body: JSON.stringify(body),
        });
        setEvents((prev) => [...prev, created]);
      }
      closeForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`למחוק את האירוע "${editingEvent.title}"?`)) {
      return;
    }

    try {
      await apiFetch(`/events/${editingEvent.id}`, { method: "DELETE" });
      setEvents((prev) => prev.filter((item) => item.id !== editingEvent.id));
      closeForm();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setError("");
    setMessage("");

    try {
      const result = await apiFetch("/events/sync-google", { method: "POST" });
      const updated = await apiFetch("/events");
      setEvents(updated);
      setMessage(
        `הסנכרון הושלם: ${result.imported} חדשים, ${result.updated} עודכנו, ${result.removed} הוסרו`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return <p>טוען לוח שנה...</p>;
  }

  const calendarEvents = [
    ...events.map(toCalendarEvent),
    ...tasks.map(toCalendarTask),
  ];

  return (
    <section className="panel panel-wide">
      <div className="panel-header">
        <h1>לוח שנה</h1>
        <button
          className="button-with-icon button-secondary"
          onClick={handleSync}
          disabled={syncing}
        >
          <RefreshCw size={18} />
          {syncing ? "מסנכרן..." : "סנכרון עם Google Calendar"}
        </button>
      </div>

      <p className="task-meta">
        לחיצה על יום יוצרת אירוע חדש. מטלות מסומנות ב-📌. אירועים מ-Google
        מוצגים באפור.
      </p>

      {message && <p className="form-success">{message}</p>}

      <GoogleConnect
        scope="calendar"
        reason="כדי לסנכרן את האירועים שלך מ-Google Calendar."
      />

      {error && <p className="form-error">{error}</p>}

      {showForm && (
        <form className="course-form" onSubmit={handleSubmit}>
          <h2>{editingEvent ? "עריכת אירוע" : "אירוע חדש"}</h2>

          <label htmlFor="event-title">שם האירוע</label>
          <input
            id="event-title"
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            maxLength={255}
            required
          />

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.allDay}
              onChange={(e) => updateField("allDay", e.target.checked)}
            />
            כל היום
          </label>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="event-start-date">תאריך התחלה</label>
              <input
                id="event-start-date"
                type="date"
                value={form.startDate}
                onChange={(e) => updateField("startDate", e.target.value)}
                required
              />
            </div>
            {!form.allDay && (
              <div className="form-field">
                <label htmlFor="event-start-time">שעת התחלה</label>
                <input
                  id="event-start-time"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => updateField("startTime", e.target.value)}
                  required
                />
              </div>
            )}
            <div className="form-field">
              <label htmlFor="event-end-date">תאריך סיום</label>
              <input
                id="event-end-date"
                type="date"
                value={form.endDate}
                onChange={(e) => updateField("endDate", e.target.value)}
                required
              />
            </div>
            {!form.allDay && (
              <div className="form-field">
                <label htmlFor="event-end-time">שעת סיום</label>
                <input
                  id="event-end-time"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => updateField("endTime", e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-field form-field-small">
              <label htmlFor="event-color">צבע</label>
              <input
                id="event-color"
                type="color"
                value={form.color}
                onChange={(e) => updateField("color", e.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="event-link">קישור (לא חובה)</label>
              <input
                id="event-link"
                type="url"
                value={form.link}
                onChange={(e) => updateField("link", e.target.value)}
                placeholder="https://"
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
              onClick={closeForm}
            >
              ביטול
            </button>
            {editingEvent && (
              <button
                type="button"
                className="button-with-icon button-danger-outline"
                onClick={handleDelete}
              >
                <Trash2 size={18} />
                מחיקה
              </button>
            )}
          </div>
        </form>
      )}

      <div className="calendar-wrapper">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={heLocale}
          direction="rtl"
          headerToolbar={{
            right: "prev,next today",
            center: "title",
            left: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          height="auto"
          selectable
          dayMaxEvents={3}
          eventTimeFormat={{
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }}
          events={calendarEvents}
          select={handleSelect}
          eventClick={handleEventClick}
        />
      </div>
    </section>
  );
}
