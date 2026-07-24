import { useState } from "react";

import MapView from "../components/map/MapView";
import ChatWindow from "../components/chat/ChatWindow";
import TripSummary from "../components/sidebar/TripSummary";
import RiskTimeSlider from "../components/map/RiskTimeSlider";

import { sendMessage } from "../api/chatApi";

export default function Home() {
    const [messages, setMessages] = useState([
        {
            role: "assistant",
            content: "Hello! Tell me where you're travelling, and I'll analyze the route, weather, and potential risks over time."
        }
    ]);
    const [loading, setLoading] = useState(false);
    const [geometry, setGeometry] = useState(null);
    const [riskSummary, setRiskSummary] = useState([]);
    const [riskTimeline, setRiskTimeline] = useState([]);
    const [bestDeparture, setBestDeparture] = useState(null);
    const [selectedOffset, setSelectedOffset] = useState(0);
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
            setRiskSummary(result.risk_summary || []);
            setRiskTimeline(result.risk_timeline || []);
            setBestDeparture(result.best_departure || null);
            setSelectedOffset(0);

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

    const activeRiskSummary =
        riskTimeline.length > 0 && riskTimeline[selectedOffset]?.risk_summary
            ? riskTimeline[selectedOffset].risk_summary
            : riskSummary;

    return (
        <div className="relative h-screen w-screen overflow-hidden">
            {/* Full-screen map as background */}
            <div className="absolute inset-0">
                <MapView
                    geometry={geometry}
                    riskSummary={activeRiskSummary}
                />
            </div>

            {/* Floating Risk Over Time Slider overlay at bottom left */}
            {riskTimeline.length > 0 && (
                <div className="absolute bottom-6 left-6 z-20 pointer-events-auto">
                    <RiskTimeSlider
                        riskTimeline={riskTimeline}
                        selectedOffset={selectedOffset}
                        onChangeOffset={setSelectedOffset}
                        bestDeparture={bestDeparture}
                    />
                </div>
            )}

            {/* Overlay UI: chat + trip summary on the right side */}
            <div className="absolute top-0 right-0 h-full w-[400px] max-w-[90vw] flex flex-col p-4 gap-3 pointer-events-none z-10">
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
    );
}