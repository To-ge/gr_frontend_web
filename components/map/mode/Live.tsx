import { useEffect, useState } from "react";

export default function Live() {
    const[index, setIndex] = useState(0)
    const dotSequence = [".", "..", "..."]
    useEffect(() => {
        const interval = setInterval(() => {
          setIndex((prevIndex) => (prevIndex + 1) % dotSequence.length);
        }, 500);
        return () => clearInterval(interval);
      }, []);
    return (
        <div 
        style={{ textShadow: "2px 2px 4px rgba(0, 0, 0, 0.6), -2px -2px 4px rgba(0, 0, 0, 0.6)" }}
        className="text-red-600 text-3xl font-black italic">
            Live{dotSequence[index]}
        </div>
    )
}