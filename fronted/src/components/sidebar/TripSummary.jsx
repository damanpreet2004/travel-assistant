export default function TripSummary({summary}){

    if(!summary){

        return(

            <div className="h-32 flex items-center justify-center">

                Plan a trip to see details

            </div>

        )

    }

    return(

        <div className="h-32 flex justify-around items-center">

            <div>

                Distance

                <h2>

                    {summary.distance_km} km

                </h2>

            </div>

            <div>

                Duration

                <h2>

                    {summary.duration_min} min

                </h2>

            </div>

        </div>

    )

}