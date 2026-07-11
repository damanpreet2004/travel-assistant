import maplibregl from "maplibre-gl";

import clearIcon from "../../assets/weather/clear.svg";
import mainlyClearIcon from "../../assets/weather/mainly-clear.svg";
import partlyCloudyIcon from "../../assets/weather/partly-cloudy.svg";
import cloudyIcon from "../../assets/weather/cloudy.svg";
import rainIcon from "../../assets/weather/rain.svg";
import heavyRainIcon from "../../assets/weather/heavy-rain.svg";
import thunderstormIcon from "../../assets/weather/thunderstorm.svg";
import fogIcon from "../../assets/weather/fog.svg";
import snowIcon from "../../assets/weather/snow.svg";
import unknownIcon from "../../assets/weather/unknown.svg";

let markers = [];

function removeOldMarkers() {
  markers.forEach((marker) => {
    marker.getPopup()?.remove();
    marker.remove();
  });
  markers = [];
}

function getWeatherIcon(weather) {
  switch (weather) {
    case "Clear":
      return clearIcon;
    case "Mainly Clear":
      return mainlyClearIcon;
    case "Partly Cloudy":
      return partlyCloudyIcon;
    case "Cloudy":
      return cloudyIcon;
    case "Rain":
    case "Light Rain":
      return rainIcon;
    case "Heavy Rain":
      return heavyRainIcon;
    case "Thunderstorm":
      return thunderstormIcon;
    case "Fog":
      return fogIcon;
    case "Snow":
      return snowIcon;
    default:
      return unknownIcon;
  }
}

function getRiskColor(risk) {
  const normalizedRisk = `${risk || ""}`.toUpperCase();

  switch (normalizedRisk) {
    case "SAFE":
      return { border: "#2e7d32", badge: "#e8f5e9", text: "#1b5e20" };
    case "LOW":
      return { border: "#f9a825", badge: "#fff8e1", text: "#f57f17" };
    case "MODERATE":
      return { border: "#ef6c00", badge: "#fff3e0", text: "#e65100" };
    case "HIGH":
      return { border: "#c62828", badge: "#ffebee", text: "#b71c1c" };
    default:
      return { border: "#607456", badge: "#f1f5f1", text: "#4b5b3d" };
  }
}

function createMarkerElement(iconUrl, riskColor) {
  const element = document.createElement("div");
  element.style.position = "relative";
  element.style.width = "46px";
  element.style.height = "46px";
  element.style.borderRadius = "50%";
  element.style.background = "#ffffff";
  element.style.boxShadow = "0 8px 20px rgba(15, 23, 42, 0.22)";
  element.style.border = `2px solid ${riskColor.border}`;
  element.style.display = "flex";
  element.style.alignItems = "center";
  element.style.justifyContent = "center";
  element.style.cursor = "pointer";
  element.style.transition = "transform 220ms ease, box-shadow 220ms ease, opacity 220ms ease";
  element.style.opacity = "0";
  element.style.transform = "translateY(-8px) scale(0.8)";
  element.style.overflow = "hidden";

  const icon = document.createElement("img");
  icon.src = iconUrl;
  icon.alt = "weather icon";
  icon.style.width = "28px";
  icon.style.height = "28px";
  icon.style.objectFit = "contain";

  element.appendChild(icon);

  element.addEventListener("mouseenter", () => {
    element.style.transform = "translateY(-4px) scale(1.08)";
    element.style.boxShadow = "0 14px 30px rgba(15, 23, 42, 0.28)";
  });

  element.addEventListener("mouseleave", () => {
    element.style.transform = "translateY(0) scale(1)";
    element.style.boxShadow = "0 8px 20px rgba(15, 23, 42, 0.22)";
  });

  return element;
}

function createPopup(point, riskColor) {
  const safeEta = point.eta ? new Date(point.eta).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
  const hazardList = Array.isArray(point.hazards) && point.hazards.length
    ? point.hazards.map((hazard) => `<li>${hazard}</li>`).join("")
    : "<li>No major hazards</li>";

  const popupContent = `
    <div style="min-width:220px; font-family: Inter, Arial, sans-serif; color:#1f2937;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px;">
        <div>
          <div style="font-size:14px; font-weight:700; color:#0f172a;">${point.location || "Route stop"}</div>
          <div style="font-size:12px; color:#64748b; margin-top:2px;">${point.weather || "Unknown"}</div>
        </div>
        <div style="width:38px; height:38px; border-radius:999px; background:#f8fafc; border:1px solid #e2e8f0; display:flex; align-items:center; justify-content:center;">
          <img src="${getWeatherIcon(point.weather)}" alt="weather" style="width:24px; height:24px;" />
        </div>
      </div>
      <div style="display:flex; justify-content:flex-start; margin:10px 0;">
        <span style="padding:5px 10px; border-radius:999px; background:${riskColor.badge}; color:${riskColor.text}; font-size:12px; font-weight:700;">
          Risk: ${point.risk || "Unknown"}
        </span>
      </div>
      <div style="font-size:13px; line-height:1.5;">
        <div style="margin-bottom:6px;"><strong>ETA:</strong> ${safeEta}</div>
        <div style="margin-bottom:6px;"><strong>Rain:</strong> ${point.rain ?? "—"}%</div>
        <div style="margin-bottom:8px;"><strong>Hazards:</strong></div>
        <ul style="margin:0; padding-left:16px; color:#475569;">${hazardList}</ul>
      </div>
    </div>
  `;

  return new maplibregl.Popup({
    offset: 22,
    closeButton: true,
    closeOnClick: false,
    className: "weather-popup"
  }).setHTML(popupContent);
}

export function addWeatherMarkers(map, riskSummary) {
  if (!map || !Array.isArray(riskSummary)) return;

  removeOldMarkers();

  riskSummary.forEach((point, index) => {
    const riskColor = getRiskColor(point.risk);
    const markerElement = createMarkerElement(getWeatherIcon(point.weather), riskColor);
    const popup = createPopup(point, riskColor);

    const marker = new maplibregl.Marker(markerElement)
      .setLngLat([point.longitude, point.latitude])
      .setPopup(popup)
      .addTo(map);

    markers.push(marker);

    window.setTimeout(() => {
      markerElement.style.opacity = "1";
      markerElement.style.transform = "translateY(0) scale(1)";
      markerElement.style.boxShadow = "0 10px 24px rgba(15, 23, 42, 0.24)";
    }, 180 + index * 420);
  });
}
