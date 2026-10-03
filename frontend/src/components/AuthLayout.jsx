import { BookOpen, Users, CalendarDays } from "lucide-react";
import logo from "../assets/logo.png";

const FEATURES = [
  { icon: BookOpen, text: "ממוצע משוקלל שמתעדכן מיד" },
  { icon: Users, text: "עבודה על מטלות עם שותפים" },
  { icon: CalendarDays, text: "סנכרון עם Google Calendar" },
];

export default function AuthLayout({ children }) {
  return (
    <div className="auth-page">
      <aside className="auth-brand-panel">
        <img src={logo} alt="לוגו LearnX" className="auth-brand-logo" />
        <h2 className="auth-brand-title">
          כל התואר שלך,
          <br />
          במקום אחד.
        </h2>
        <p className="auth-brand-text">
          קורסים, ציונים, מטלות ולוח שנה, מסודרים בשבילך.
        </p>
        <ul className="auth-features">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text}>
              <span className="auth-feature-icon">
                <Icon size={20} />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </aside>

      <main className="auth-form-side">{children}</main>
    </div>
  );
}
