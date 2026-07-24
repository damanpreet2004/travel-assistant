import { useState, useEffect } from "react";
import { Play, Pause, Clock, Sparkles, AlertTriangle, ShieldCheck, ChevronRight } from "lucide-react";

export default function RiskTimeSlider({
    riskTimeline = [],
    selectedOffset = 0,
    onChangeOffset,
    bestDeparture = null,
    goldenWindow = null,
}) {
    const [isPlaying, setIsPlaying] = useState(false);

    const maxOffset = riskTimeline.length > 0 ? riskTimeline.length - 1 : 24;
    const currentSnapshot = riskTimeline[selectedOffset] || riskTimeline[0];

    // Auto-advance playback loop
    useEffect(() => {
        let interval = null;
        if (isPlaying) {
            interval = setInterval(() => {
                onChangeOffset((prev) => {
                    const next = prev + 1;
                    if (next > maxOffset) {
                        setIsPlaying(false);
                        return 0;
                    }
                    return next;
                });
            }, 1100);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isPlaying, maxOffset, onChangeOffset]);

    if (!riskTimeline || riskTimeline.length === 0) {
        return null;
    }

    const getRiskBadge = (level) => {
        const norm = (level || "SAFE").toUpperCase();
        switch (norm) {
            case "SAFE":
                return {
                    bg: "bg-emerald-500/20",
                    text: "text-emerald-400",
                    border: "border-emerald-500/40",
                    dot: "bg-emerald-500",
                    bar: "#10b981",
                };
            case "LOW":
                return {
                    bg: "bg-amber-500/20",
                    text: "text-amber-300",
                    border: "border-amber-500/40",
                    dot: "bg-amber-400",
                    bar: "#f59e0b",
                };
            case "MODERATE":
                return {
                    bg: "bg-orange-500/20",
                    text: "text-orange-400",
                    border: "border-orange-500/40",
                    dot: "bg-orange-500",
                    bar: "#f97316",
                };
            case "HIGH":
                return {
                    bg: "bg-red-500/20",
                    text: "text-red-400",
                    border: "border-red-500/40",
                    dot: "bg-red-500",
                    bar: "#ef4444",
                };
            case "EXTREME":
                return {
                    bg: "bg-purple-500/25",
                    text: "text-purple-300",
                    border: "border-purple-500/50",
                    dot: "bg-purple-500",
                    bar: "#a855f7",
                };
            default:
                return {
                    bg: "bg-slate-500/20",
                    text: "text-slate-300",
                    border: "border-slate-500/40",
                    dot: "bg-slate-400",
                    bar: "#64748b",
                };
        }
    };

    const currentRiskBadge = getRiskBadge(currentSnapshot?.overall_risk);

    const formatDepartureTime = (isoString, offset) => {
        if (!isoString) return `+${offset}h`;
        try {
            const dt = new Date(isoString);
            const timeStr = dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            if (offset === 0) return `Leave Now (${timeStr})`;
            return `+${offset}h (${timeStr})`;
        } catch (e) {
            return `+${offset}h`;
        }
    };

    return (
        <div className="w-[520px] max-w-[92vw] bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 shadow-2xl rounded-2xl p-4 text-white font-sans transition-all duration-300">
            {/* Header: Title, Current Time, Risk Level Badge */}
            <div className="flex items-center justify-between mb-3 gap-2">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-cyan-400 shadow-inner">
                        <Clock size={18} />
                    </div>
                    <div>
                        <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Departure Time
                        </div>
                        <div className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                            {formatDepartureTime(currentSnapshot?.departure_time, selectedOffset)}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Overall Risk Badge */}
                    <div
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${currentRiskBadge.bg} ${currentRiskBadge.text} ${currentRiskBadge.border}`}
                    >
                        <span className={`w-2 h-2 rounded-full ${currentRiskBadge.dot} animate-pulse`} />
                        Risk: {currentSnapshot?.overall_risk || "SAFE"}
                    </div>
                </div>
            </div>

            {/* Smart Best Departure Window Badge */}
            {bestDeparture && bestDeparture.offset_hours !== undefined && (
                <div
                    onClick={() => onChangeOffset(bestDeparture.offset_hours)}
                    className="cursor-pointer mb-3 group p-2.5 rounded-xl bg-gradient-to-r from-cyan-950/60 via-slate-800/80 to-emerald-950/60 border border-cyan-500/30 hover:border-cyan-400/60 transition-all duration-200 flex items-center justify-between shadow-md"
                >
                    <div className="flex items-center gap-2 text-xs">
                        <Sparkles size={16} className="text-cyan-400 shrink-0 group-hover:scale-110 transition-transform" />
                        <span className="text-slate-200 font-medium">
                            <strong className="text-cyan-300">Optimal Window:</strong>{" "}
                            {bestDeparture.offset_hours === 0
                                ? "Leave Now (lowest route risk)"
                                : `Leave in +${bestDeparture.offset_hours} hrs`}
                        </span>
                    </div>
                    <span className="text-[11px] font-semibold text-cyan-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform shrink-0 ml-2">
                        Apply <ChevronRight size={14} />
                    </span>
                </div>
            )}

            {/* Risk Gradient Timeline Visual Bar */}
            <div className="relative mb-2">
                <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-slate-800 border border-slate-700/50">
                    {riskTimeline.map((item, idx) => {
                        const badge = getRiskBadge(item.overall_risk);
                        return (
                            <div
                                key={idx}
                                onClick={() => onChangeOffset(idx)}
                                className="h-full flex-1 cursor-pointer hover:brightness-125 transition-all relative"
                                style={{ backgroundColor: badge.bar }}
                                title={`+${idx}h: ${item.overall_risk} Risk`}
                            />
                        );
                    })}
                </div>
                {/* Golden window pin marker */}
                {goldenWindow?.detected && (
                    <div
                        className="absolute -top-1 flex flex-col items-center pointer-events-none"
                        style={{
                            left: `${Math.min((goldenWindow.offset_hours / Math.max(riskTimeline.length - 1, 1)) * 100, 100)}%`,
                            transform: "translateX(-50%)"
                        }}
                    >
                        <span className="text-amber-400 drop-shadow text-base leading-none" title={goldenWindow.headline}>⭐</span>
                    </div>
                )}
            </div>

            {/* Range Slider & Controls */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30 transition-all active:scale-95 shrink-0"
                    title={isPlaying ? "Pause Timeline" : "Play Timeline"}
                >
                    {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                </button>

                <input
                    type="range"
                    min={0}
                    max={maxOffset}
                    value={selectedOffset}
                    onChange={(e) => onChangeOffset(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
            </div>

            {/* Scale Hours Ticks */}
            <div className="flex justify-between text-[10px] font-medium text-slate-400 mt-1 px-1">
                <span>Leave Now (+0h)</span>
                <span>+6h</span>
                <span>+12h</span>
                <span>+18h</span>
                <span>+24h</span>
            </div>

            {/* Primary Hazards Warning Pill if hazards exist */}
            {currentSnapshot?.hazards && currentSnapshot.hazards.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center gap-2 text-xs text-amber-300">
                    <AlertTriangle size={14} className="shrink-0 text-amber-400" />
                    <span className="truncate">
                        Hazards at +{selectedOffset}h: {currentSnapshot.hazards.join(", ")}
                    </span>
                </div>
            )}
        </div>
    );
}
