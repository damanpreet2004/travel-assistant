export default function Message({ message }) {

    const isUser = message.role === "user";

    return (

        <div
            className={`flex mb-3 ${isUser ? "justify-end" : "justify-start"
                }`}
        >
            <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 whitespace-pre-wrap text-sm leading-relaxed ${isUser
                        ? "bg-black/70 text-white backdrop-blur-sm border border-white/10"
                        : "bg-skyblue/20 text-black backdrop-blur-sm border border-skyblue/20"
                    }`}
            >
                {message.content}
            </div>

        </div>

    );

}