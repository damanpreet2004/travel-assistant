import { useEffect,useRef } from "react";

import Message from "./Message";
import ChatInput from "./ChatInput";
import TypingIndicator from "./TypingIndicator";

export default function ChatWindow({

    messages,

    loading,

    onSend

}){

    const bottomRef = useRef();

    useEffect(()=>{

        bottomRef.current?.scrollIntoView({
            behavior:"smooth"
        });

    },[messages,loading]);

    return(

        <div className="h-full flex flex-col bg-[#F7F4EE]">

            <div className="flex-1 overflow-y-auto p-4">

                {

                    messages?.map((msg,index)=>(

                        <Message

                            key={index}

                            message={msg}

                        />

                    ))

                }

                {

                    loading && <TypingIndicator/>

                }

                <div ref={bottomRef}/>

            </div>

            <ChatInput onSend={onSend}/>

        </div>

    )

}