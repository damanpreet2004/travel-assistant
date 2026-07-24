import { useState } from "react";
import { Sparkles, X, ArrowRight, Clock, TrendingDown } from "lucide-react";

const RISK_COLORS = {
    SAFE:     { pill: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40", dot: "bg-emerald-400", glow: "shadow-emerald-500/20" },
    LOW:      { pill: "bg-amber-500/20 text-amber-300 border-amber-500/40",      dot: "bg-amber-400",   glow: "shadow-amber-500/20"   },
    MODERATE: { pill: "bg-orange-500/20 text-orange-300 border-orange-500/40",   dot: "bg-orange-400",  glow: "shadow-orange-500/20"  },
    HIGH:     { pill: "bg-red-500/20 text-red-300 border-red-500/40",            dot: "bg-red-400",     glow: "shadow-red-500/20"     },
    EXTREME:  { pill: "bg-purple-500/25 text-purple-300 border-purple-500/50",   dot: "bg-purple-400",  glow: "shadow-purple-500/20"  },
};

function RiskPill({ level }) {
    const c = RISK_COLORS[level?.toUpperCase()] || RISK_COLORS.SAFE;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-bold ${c.pill}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
            {level}
        </span>
    );
}

export default function GoldenWindowBanner({ goldenWindow, onApply }) {
    const [dismissed, setDismissed] = useState(false);

    if (!goldenWindow?.detected || dismissed) return null;

    const {
        initial_risk,
        new_risk,
        time_desc,
        formatted_time,
        score_reduction,
        headline,
    } = goldenWindow;

    return (
        <div
            className="
                relative w-[520px] max-w-[92vw] overflow-hidden
                rounded-2xl border border-amber-400/30
                bg-gradient-to-br from-slate-900/95 via-amber-950/30 to-slate-900/95
                backdrop-blur-xl shadow-2xl shadow-amber-500/10
                animate-[fadeSlideUp_0.4s_cubic-bezier(0.34,1.56,0.64,1)_both]
            "
            style={{ animationName: "fadeSlideUp" }}
        >
            {/* Glow top bar */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />

            {/* Dismiss button */}
            <button
                onClick={() => setDismissed(true)}
                className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                title="Dismiss"
            >
                <X size={14} />
            </button>

            <div className="p-4">
                {/* Header row */}
                <div className="flex items-center gap-2.5 mb-3">
                    <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 shadow-lg shadow-amber-500/10">
                        <Sparkles size={18} className="text-amber-400" />
                    </div>
                    <div>
                        <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-widest">
                            Golden Window Detected
                        </div>
                        <div className="text-sm font-bold text-white leading-tight mt-0.5">
                            {headline}
                        </div>
                    </div>
                </div>

                {/* Risk transition visualizer */}
                <div className="flex items-center gap-2 mb-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                    <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <span className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">Now</span>
                        <RiskPill level={initial_risk} />
                    </div>

                    <div className="flex-1 flex items-center justify-center">
                        <div className="flex items-center gap-1 text-emerald-400">
                            <div className="h-px flex-1 w-8 bg-gradient-to-r from-slate-600 to-emerald-500/60" />
                            <TrendingDown size={14} />
                            <div className="h-px w-4 bg-emerald-500/40" />
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                            <Clock size={11} />
                            <span className="uppercase tracking-wider">{time_desc} later</span>
                        </div>
                        <RiskPill level={new_risk} />
                    </div>
                </div>

                {/* Stats + CTA row */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-xs">
                        <div className="text-slate-400">
                            Depart at
                            <span className="ml-1 font-bold text-white">{formatted_time}</span>
                        </div>
                        {score_reduction > 0 && (
                            <div className="flex items-center gap-1 text-emerald-400 font-semibold">
                                <TrendingDown size={12} />
                                {score_reduction} pts safer
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onApply}
                        className="
                            flex items-center gap-1.5 px-3.5 py-2 rounded-xl
                            bg-gradient-to-r from-amber-500 to-amber-400
                            hover:from-amber-400 hover:to-amber-300
                            text-slate-900 text-xs font-bold
                            shadow-lg shadow-amber-500/30
                            transition-all duration-200 active:scale-95
                            whitespace-nowrap
                        "
                    >
                        Apply to Slider
                        <ArrowRight size={13} />
                    </button>
                </div>
            </div>
        </div>
    );
}
