import { useOutletContext } from "react-router-dom";

export default function HomePage() {
  const { student } = useOutletContext();

  return (
    <div>
      <h1>שלום, {student.full_name}</h1>
      <p>ברוך הבא למערכת לניהול התואר.</p>
    </div>
  );
}
