export default function WeatherPopup({ point }) {

    return (

        <div className="min-w-[220px]">

            <h2 className="font-bold text-lg">

                {point.location}

            </h2>

            <hr className="my-2"/>

            <p>

                🌤 Weather : {point.weather}

            </p>

            <p>

                🚗 ETA : {new Date(point.eta).toLocaleTimeString()}

            </p>

            <p>

                🌧 Rain : {point.rain}

            </p>

            <p>

                ⚠ Risk : {point.risk}

            </p>

            <p>

                Hazards :

            </p>

            <ul>

                {

                    point.hazards.length===0

                    ?

                    <li>None</li>

                    :

                    point.hazards.map((h,i)=>

                        <li key={i}>{h}</li>

                    )

                }

            </ul>

        </div>

    );

}