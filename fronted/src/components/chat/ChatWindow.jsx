import { useEffect, useRef } from "react";

import Message from "./Message";
import ChatInput from "./ChatInput";
import TypingIndicator from "./TypingIndicator";

export default function ChatWindow({
    messages,
    loading,
    onSend
}) {

    const bottomRef = useRef();
    useEffect(() => {
        bottomRef.current?.scrollIntoView({
            behavior: "smooth"
        });
    }, [messages, loading]);

    return (

        <div className="h-full flex flex-col rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10">
                <h2 className="text-skyblue font-semibold text-lg tracking-tight">
                    AI Travel Assistant
                </h2>
                <p className="text-black/60 text-xs mt-0.5">
                    Ask about routes, weather & risks
                </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
                {
                    messages?.map((msg, index) => (
                        <Message
                            key={index}
                            message={msg}
                        />
                    ))
                }

                {
                    loading && <TypingIndicator />
                }

                <div ref={bottomRef} />

            </div>

            <ChatInput onSend={onSend} />

        </div>

    )

}