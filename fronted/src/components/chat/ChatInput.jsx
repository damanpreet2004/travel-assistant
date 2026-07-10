import { useState } from "react";

export default function ChatInput({ onSend }) {

    const [message, setMessage] = useState("");

    const send = () => {

        if (!message.trim()) return;

        onSend(message);

        setMessage("");

    };

    return (

        <div className="border-t p-4 flex gap-2">

            <input

                className="flex-1 border rounded-xl p-3"

                value={message}

                onChange={(e)=>setMessage(e.target.value)}

                onKeyDown={(e)=>{

                    if(e.key==="Enter") send();

                }}

                placeholder="Describe your trip..."

            />

            <button

                onClick={send}

                className="bg-[#607456] text-white px-5 rounded-xl"

            >

                Send

            </button>

        </div>

    );

}