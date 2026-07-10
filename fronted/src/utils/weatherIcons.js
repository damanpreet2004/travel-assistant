export function getWeatherEmoji(weather){

    switch(weather){

        case "Clear":
            return "☀️";

        case "Mainly Clear":
            return "🌤";

        case "Partly Cloudy":
            return "⛅";

        case "Cloudy":
            return "☁️";

        case "Rain":
        case "Light Rain":
            return "🌦";

        case "Heavy Rain":
            return "🌧";

        case "Thunderstorm":
            return "⛈";

        case "Fog":
            return "🌫";

        case "Snow":
            return "❄️";

        default:
            return "📍";

    }

}