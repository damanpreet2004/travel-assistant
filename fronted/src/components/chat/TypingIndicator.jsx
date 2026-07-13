import { useEffect, useState } from "react";

const steps = [
    {
        icon: "🧠",
        text: "Understanding your request..."
    },
    {
        icon: "📍",
        text: "Finding best route..."
    },
    {
        icon: "🌦",
        text: "Checking weather..."
    },
    {
        icon: "⚠",
        text: "Analyzing travel risks..."
    },
    {
        icon: "🤖",
        text: "Generating AI recommendation..."
    }
];

export default function TypingIndicator() {

    const [current, setCurrent] = useState(0);

    useEffect(() => {

        const timer = setInterval(() => {

            setCurrent(prev => {

                if (prev >= steps.length - 1)
                    return prev;

                return prev + 1;

            });

        }, 1000);

        return () => clearInterval(timer);

    }, []);

    return (

        <div className="space-y-2 mt-3">

            {

                steps.slice(0, current + 1).map((step, index) => (

                    <div
                        key={index}
                        className="flex items-center gap-2.5 text-black/70 animate-pulse text-sm"
                    >

                        <span className="text-base">

                            {step.icon}

                        </span>

                        <span>

                            {step.text}

                        </span>

                    </div>

                ))

            }

        </div>

    );

}