import { useState } from "react";

export default function ChatInput({ onSend }) {

    const [message, setMessage] = useState("");

    const send = () => {
        if (!message.trim()) return;
        onSend(message);
        setMessage("");
    };

    return (

        <div className="border-t border-white/10 p-3 flex gap-2">

            <input
                className="flex-1 rounded-xl px-4 py-2.5 bg-skyblue/60 text-black placeholder-black/80 border border-skyblue/20 focus:outline-none focus:ring-2 focus:ring-skyblue/30 focus:border-transparent text-sm transition-all backdrop-blur-sm"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") send();
                }}
                placeholder="Describe your trip..."
            />
            <button
                onClick={send}
                className="bg-skyblue/60 hover:bg-skyblue/100 text-black px-5 rounded-xl text-sm font-medium transition-all backdrop-blur-sm border border-skyblue/20"
            >
                Send
            </button>

        </div>

    );

}