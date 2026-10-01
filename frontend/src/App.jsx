import { useEffect, useState } from "react";

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
      <h1>LearnX</h1>
      <p>מצב השרת: {status}</p>
    </div>
  );
}

export default App
