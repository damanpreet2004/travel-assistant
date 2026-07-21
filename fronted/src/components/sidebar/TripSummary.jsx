export default function TripSummary({ summary }) {

    if (!summary) {
        return (
            <div className="rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 shadow-2xl px-5 py-4">
                <p className="text-black/80 text-sm text-center">
                    Plan a trip to see details
                </p>
            </div>
        )
    }

    return (

        <div className="rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 shadow-2xl px-5 py-4">
            <div className="flex justify-around items-center gap-4">

                <div className="text-center">
                    <p className="text-black/40 text-xs uppercase tracking-widest mb-1">
                        Distance
                    </p>
                    <h2 className="text-black text-xl font-bold">
                        {summary.distance_km} km
                    </h2>
                </div>

                <div className="w-px h-10 bg-white/10"></div>

                <div className="text-center">
                    <p className="text-black/40 text-xs uppercase tracking-widest mb-1">
                        Duration
                    </p>
                    <h2 className="text-black text-xl font-bold">
                        {summary.duration_min} min
                    </h2>
                </div>

            </div>
        </div>

    )

}