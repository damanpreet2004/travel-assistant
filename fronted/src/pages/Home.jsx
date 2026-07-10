import { useState } from "react";

import Navbar from "../components/common/Navbar";
import MapView from "../components/map/MapView";
import ChatWindow from "../components/chat/ChatWindow";
import TripSummary from "../components/sidebar/TripSummary";

import { sendMessage } from "../api/chatApi";

export default function Home() {

    const [messages, setMessages] = useState([
        {
            role: "assistant",
            content: "Hello! Tell me where you're travelling, and I'll analyze the route, weather, and potential risks."
        }
    ]);

    const [loading, setLoading] = useState(false);
    const [geometry,setGeometry]=useState(null);
    const [riskSummary, setRiskSummary] = useState([]);
    const [summary,setSummary]=useState(null);

    async function handleSend(message) {

    setMessages(prev => [
        ...prev,
        {
            role: "user",
            content: message
        }
    ]);

    setLoading(true);

    try {

        const result = await sendMessage(message);

        setGeometry(result.route_geometry);

        setSummary(result.route_summary);
        setRiskSummary(result.risk_summary);


        setMessages(prev => [
            ...prev,
            {
                role: "assistant",
                content: result.recommendation.recommendation
            }
        ]);

    } catch (error) {

        console.error(error);

    } finally {

        setLoading(false);

    }

}

    return (

        <div className="h-screen flex flex-col">

            <Navbar />

            <main className="flex flex-1 overflow-hidden">

                <section className="w-[70%] p-3">

                    <div className="h-full rounded-xl overflow-hidden shadow-xl">

                        <MapView 
                            geometry={geometry} 
                            riskSummary={riskSummary}
                         />
                    </div>

                </section>

                <section className="w-[30%] border-l">

                    <ChatWindow
                        messages={messages}
                        loading={loading}
                        onSend={handleSend}
                    />

                </section>

            </main>

            <TripSummary summary={summary} />

        </div>

    )

}