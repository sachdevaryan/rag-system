import { useState, useEffect } from "react";

export default function Typewriter({ text }) {

  const [displayed, setDisplayed] = useState("");

  useEffect(() => {

    let i = 0;

    const interval = setInterval(() => {

      setDisplayed(text.slice(0, i));

      i++;

      if (i > text.length) clearInterval(interval);

    }, 15);

    return () => clearInterval(interval);

  }, [text]);

  return <span>{displayed}</span>;
}