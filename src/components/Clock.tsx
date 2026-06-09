import { useState, useEffect } from "react";

function Clock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const fmt = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="clock" role="timer" aria-label={`Current time: ${fmt(time.getHours())}:${fmt(time.getMinutes())}`}>
      {fmt(time.getHours())}:{fmt(time.getMinutes())}
    </div>
  );
}

export default Clock;
