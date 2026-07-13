const CDN_BASE = "https://cdn.meteocons.com/3.0-next.10/svg/fill";

export function getWeatherIconUrl(weather) {
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