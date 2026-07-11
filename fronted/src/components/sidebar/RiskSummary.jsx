import { AlertTriangle, CheckCircle, CloudRain, Clock, MapPin } from "lucide-react";

export default function RiskSummary({ riskSummary = [] }) {
    if (!riskSummary.length) {
        return (
            <div className="bg-white rounded-xl shadow-md p-4">
                <h2 className="text-lg font-semibold mb-2">Route Risk Summary</h2>
                <p className="text-gray-500">No trip analyzed yet.</p>
            </div>
        );
    }

    const getRiskColor = (risk) => {
        switch (risk) {
            case "SAFE":
                return "bg-green-100 text-green-700";
            case "LOW":
                return "bg-yellow-100 text-yellow-700";
            case "MODERATE":
                return "bg-orange-100 text-orange-700";
            case "HIGH":
                return "bg-red-100 text-red-700";
            default:
                return "bg-gray-100 text-gray-700";
        }
    };

    const overallRisk =
        riskSummary.find(
            (p) => p.risk === "HIGH" || p.risk === "MODERATE"
        )?.risk || "SAFE";

    return (
        <div className="bg-white rounded-xl shadow-md p-4 overflow-y-auto h-full">

            <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold">
                    Route Risk Summary
                </h2>

                <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${getRiskColor(
                        overallRisk
                    )}`}
                >
                    {overallRisk}
                </span>
            </div>

            <div className="space-y-4">

                {riskSummary.map((point, index) => (

                    <div
                        key={index}
                        className="border rounded-xl p-4 hover:shadow-md transition"
                    >

                        <div className="flex justify-between items-start">

                            <div>

                                <div className="flex items-center gap-2 font-semibold text-lg">

                                    <MapPin size={18} />

                                    {point.location}

                                </div>

                                <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">

                                    <Clock size={15} />

                                    {new Date(point.eta).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}

                                </div>

                            </div>

                            <span
                                className={`px-2 py-1 rounded-lg text-xs font-semibold ${getRiskColor(
                                    point.risk
                                )}`}
                            >
                                {point.risk}
                            </span>

                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">

                            <div className="flex items-center gap-2">

                                <CloudRain size={16} />

                                Weather: {point.weather}

                            </div>

                            <div>

                                Rain: {point.rain}

                            </div>

                        </div>

                        <div className="mt-3">

                            {point.hazards?.length ? (

                                <div className="flex items-start gap-2 text-red-600">

                                    <AlertTriangle size={18} />

                                    <ul className="list-disc ml-4">

                                        {point.hazards.map((hazard, i) => (

                                            <li key={i}>{hazard}</li>

                                        ))}

                                    </ul>

                                </div>

                            ) : (

                                <div className="flex items-center gap-2 text-green-600">

                                    <CheckCircle size={18} />

                                    No hazards detected

                                </div>

                            )}

                        </div>

                    </div>

                ))}

            </div>

        </div>
    );
}