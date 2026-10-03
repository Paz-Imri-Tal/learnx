import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate} from "react-router-dom";
import {
  BookOpen,
  ClipboardList,
  Calculator,
  FolderOpen,
  Mail,
  CalendarDays,
  LogOut,
} from "lucide-react";
import { apiFetch, clearToken } from "../api";
import logo from "../assets/logo.png";

const NAV_ITEMS = [
  { to: "/courses", label: "קורסים", icon: BookOpen },
  { to: "/tasks", label: "מטלות", icon: ClipboardList },
  { to: "/grades", label: "חישוב ממוצע", icon: Calculator },
  { to: "/folders", label: "תיקיות", icon: FolderOpen },
  { to: "/contacts", label: "רישומון מיילים", icon: Mail },
  { to: "/calendar", label: "לוח שנה", icon: CalendarDays },
];

export default function Layout() {
    const [student, setStudent] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        async function loadStudent() {
            try{
                const data = await apiFetch("/auth/me");
                setStudent(data);
            }
            catch{
                clearToken();
                navigate("/login");
            }
        }

        loadStudent();
    }, [navigate]);


    function handleLogout() {
        clearToken();
        navigate("/login");
    }

    if (!student) {
      return <p className="loading">טוען...</p>;
    }

    return (
      <div className="layout">
        <header className="topbar">
          <div className="topbar-brand">
            <img src={logo} alt="LearnX Logo" className="topbar-logo" />
            <div>
              <h2 className="topbar-title">לרניקס</h2>
              <p className="topbar-subtitle">מערכת לניהול התואר</p>
            </div>
          </div>

          <div className="topbar-user">
            <span className="topbar-greeting">
              היי <bdi>{student.full_name}</bdi>!
            </span>
            <button className="logout-button" onClick={handleLogout}>
              <LogOut size={20} />
              התנתקות
            </button>
          </div>
        </header>

        <div className="layout-body">
          <nav className="sidenav">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={item.to} className="sidenav-link">
                  <span>{item.label}</span>
                  <Icon size={26} />
                </NavLink>
              );
            })}
          </nav>

          <main className="main-content">
            <Outlet context={{ student }} />
          </main>
        </div>
      </div>
    );
}
