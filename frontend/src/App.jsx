import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import GradesPage from "./pages/GradesPage";
import CoursesPage from "./pages/CoursesPage";
import HomePage from "./pages/HomePage";
import TasksPage from "./pages/TasksPage";
import TaskDetailPage from "./pages/TaskDetailPage";
import CalendarPage from "./pages/CalendarPage";
import GoogleCallbackPage from "./pages/GoogleCallbackPage";
import FoldersPage from "./pages/FoldersPage";
import FolderPage from "./pages/FolderPage.jsx";
import GoogleLinkedPage from "./pages/GoogleLinkedPage";
import ContactsPage from "./pages/ContactsPage";
import TutorPage from "./pages/TutorPage";
import TutorCoursePage from "./pages/TutorCoursePage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/auth/google" element={<GoogleCallbackPage />} />

      <Route path="/register" element={<RegisterPage />} />

      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/grades" element={<GradesPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/folders" element={<FoldersPage />} />
        <Route path="/folders/:folderId" element={<FolderPage />} />
        <Route path="/google/linked" element={<GoogleLinkedPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/tutor" element={<TutorPage />} />
        <Route path="/tutor/:courseId" element={<TutorCoursePage />} />
        <Route path="*" element={<p>העמוד בבנייה</p>} />
      </Route>
    </Routes>
  );
}
