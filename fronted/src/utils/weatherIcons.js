const CDN_BASE = "https://cdn.jsdelivr.net/npm/@meteocons/svg@latest/fill";

export function getWeatherIconUrl(weather) {
  if (!weather) return `${CDN_BASE}/not-available.svg`;
  
  // Normalize string to match keys
  const normalized = weather.trim();
  
  const iconMap = {
    "Clear": "clear-day",
    "Mainly Clear": "clear-day",
    "Partly Cloudy": "partly-cloudy-day",
    "Overcast": "overcast",
    "Fog": "fog",
    "Depositing Rime Fog": "fog",
    "Light Drizzle": "drizzle",
    "Moderate Drizzle": "drizzle",
    "Dense Drizzle": "drizzle",
    "Light Rain": "rain",
    "Moderate Rain": "rain",
    "Heavy Rain": "extreme-rain",
    "Light Snow": "snow",
    "Moderate Snow": "snow",
    "Heavy Snow": "extreme-snow",
    "Thunderstorm": "thunderstorms",
    "Thunderstorm with Hail": "thunderstorms-rain",
  };

  const icon = iconMap[normalized] || iconMap[weather] || "not-available";
  return `${CDN_BASE}/${icon}.svg`;
}