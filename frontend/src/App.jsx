import { useEffect, useState } from "react";
import logo from "./assets/logo.png";

function App() {
  const [status, setStatus] = useState("בודק...");

  useEffect(() => {
    fetch("http://localhost:8000/health")
      .then((response) => response.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("השרת לא זמין"))
  }, []);

  return (
    <div>
      <div style={{ backgroundColor: "var(--color-primary)", padding: "16px"}}>
        <img src={logo} alt="LearnX Logo" width="200"/>
      </div>
      <h1>LearnX</h1>
      <p>מצב השרת: {status}</p>
    </div>
  );
}

export default App
