import { useState } from "react";

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
    const [geometry, setGeometry] = useState(null);
    const [riskSummary, setRiskSummary] = useState([]);
    const [summary, setSummary] = useState(null);
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

        <div className="relative h-screen w-screen overflow-hidden">
            {/* Full-screen map as background */}
            <div className="absolute inset-0">
                <MapView
                    geometry={geometry}
                    riskSummary={riskSummary}
                />
            </div>
            {/* Overlay UI: chat + trip summary on the right side */}
            <div className="absolute top-0 right-0 h-full w-[400px] max-w-[90vw] flex flex-col p-4 gap-3 pointer-events-none">
                {/* Chat window - takes most of the height */}
                <div className="flex-1 min-h-0 pointer-events-auto">
                    <ChatWindow
                        messages={messages}
                        loading={loading}
                        onSend={handleSend}
                    />
                </div>

                {/* Trip summary - below chat */}
                <div className="pointer-events-auto">
                    <TripSummary summary={summary} />
                </div>

            </div>

        </div>

    )

}