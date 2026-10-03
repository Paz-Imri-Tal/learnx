import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import GradesPage from "./pages/GradesPage";
import CoursesPage from "./pages/CoursesPage";
import HomePage from "./pages/HomePage";
import TasksPage from "./pages/TasksPage";
import TaskDetailPage from "./pages/TaskDetailPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />

        <Route path="/courses" element={<CoursesPage />} />

        <Route path="/grades" element={<GradesPage />} />

        <Route path="/tasks" element={<TasksPage />} />

        <Route path="/tasks/:taskId" element={<TaskDetailPage />} />

        <Route path="*" element={<p>העמוד בבנייה</p>} />
      </Route>
    </Routes>
  );
}
