const CDN_BASE = "https://cdn.meteocons.com/3.0-next.10/svg/fill";

function getWeatherIconUrl(weather) {
  const iconMap = {
    "Clear": "clear-day",
    "Mainly Clear": "mostly-clear-day",
    "Partly Cloudy": "partly-cloudy-day",
    "Cloudy": "overcast",
    "Rain": "rain",
    "Light Rain": "drizzle",
    "Heavy Rain": "heavy-rain",
    "Thunderstorm": "thunderstorms",
    "Fog": "fog",
    "Snow": "snow",
  };
  const icon = iconMap[weather] || "not-available";
  return `${CDN_BASE}/${icon}.svg`;
}

export default function WeatherPopup({ point }) {

    return (

        <div className="min-w-[220px]">
            <div className="flex items-center gap-3 mb-2">
                <img
                    src={getWeatherIconUrl(point.weather)}
                    alt={point.weather}
                    className="w-8 h-8"
                />
                <div>
                    <h2 className="font-bold text-lg">
                        {point.location}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {point.weather}
                    </p>
                </div>
            </div>

            <hr className="my-2" />
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
                    point.hazards.length === 0
                        ?
                        <li>None</li>
                        :
                        point.hazards.map((h, i) =>
                            <li key={i}>{h}</li>
                        )
                }
            </ul>

        </div>

    );

}