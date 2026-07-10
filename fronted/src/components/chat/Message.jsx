export default function Message({ message }) {

    const isUser = message.role === "user";

    return (

        <div
            className={`flex mb-4 ${
                isUser ? "justify-end" : "justify-start"
            }`}
        >

            <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 whitespace-pre-wrap ${
                    isUser
                        ? "bg-[#BA6A4C] text-white"
                        : "bg-white border"
                }`}
            >
                {message.content}
            </div>

        </div>

    );

}