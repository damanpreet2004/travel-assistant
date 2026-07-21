import maplibregl from "maplibre-gl";
import { getWeatherIconUrl } from "../../utils/weatherIcons";

let markers = [];

export function removeOldMarkers() {
  markers.forEach((marker) => marker.remove());
  markers = [];
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
  element.className = "weather-marker-container";
  element.style.width = "55px";
  element.style.height = "55px";
  element.style.borderRadius = "50%";
  element.style.background = "rgba(46, 46, 46, 0.2)";
  // element.style.backdropFilter = "blur(8px)";
  element.style.border = `2px solid ${riskColor.border}`;
  element.style.display = "flex";
  element.style.alignItems = "center";
  element.style.justifyContent = "center";
  element.style.cursor = "pointer";
  element.style.boxShadow = "0 8px 20px rgba(17, 17, 17, 0.12)";

  // Transition and initial state for dynamic scale-in/slide-in animation
  element.style.transition = "transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 300ms ease, opacity 400ms ease, border-color 300ms ease";
  element.style.opacity = "0";
  // element.style.transform = "translateY(-12px) scale(0.6)";

  const icon = document.createElement("img");
  icon.src = iconUrl;
  icon.alt = "weather icon";
  icon.style.width = "32px";
  icon.style.height = "32px";
  icon.style.objectFit = "contain";
  icon.style.transition = "transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)";

  element.appendChild(icon);

  // Add micro-animations on hover
  // element.addEventListener("mouseenter", () => {
  //   element.style.transform = "translateY(-4px) scale(1.12)";
  //   element.style.boxShadow = "0 14px 30px rgba(15, 23, 42, 0.28)";
  //   icon.style.transform = "scale(1.15) rotate(5deg)";
  // });

  // element.addEventListener("mouseleave", () => {
  //   element.style.transform = "translateY(0) scale(1)";
  //   element.style.boxShadow = "0 8px 20px rgba(15, 23, 42, 0.22)";
  //   icon.style.transform = "scale(1) rotate(0deg)";
  // });

  return element;
}

function createPopup(point, riskColor) {
  const safeEta = point.eta ? new Date(point.eta).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
  const hazardList = Array.isArray(point.hazards) && point.hazards.length
    ? point.hazards.map((hazard) => `<li style="margin-bottom: 4px;">${hazard}</li>`).join("")
    : "<li>No major hazards</li>";

  const popupContent = `
    <div style="min-width:240px; font-family: 'Outfit', 'Inter', system-ui, -apple-system, sans-serif; color:#1f2937; padding: 4px;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:12px;">
        <div>
          <div style="font-size:15px; font-weight:700; color:#0f172a; letter-spacing: -0.01em;">${point.location || "Route stop"}</div>
          <div style="font-size:12px; color:#64748b; margin-top:2px; font-weight: 500;">${point.weather || "Unknown"}</div>
        </div>
        <div style="width:44px; height:44px; border-radius:12px; background:linear-gradient(135deg, #f8fafc, #f1f5f9); border:1px solid #e2e8f0; display:flex; align-items:center; justify-content:center; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8);">
          <img src="${getWeatherIconUrl(point.weather)}" alt="weather" style="width:32px; height:32px;" />
        </div>
      </div>
      <div style="display:flex; justify-content:flex-start; margin:12px 0 14px 0;">
        <span style="padding:6px 12px; border-radius:8px; background:${riskColor.badge}; color:${riskColor.text}; font-size:12px; font-weight:700; border: 1px solid ${riskColor.border}22; display: inline-flex; align-items: center; gap: 6px;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: ${riskColor.border}; display: inline-block;"></span>
          Risk: ${point.risk || "Unknown"}
        </span>
      </div>
      <div style="font-size:13px; line-height:1.6; border-top: 1px dashed #e2e8f0; padding-top: 12px;">
        <div style="margin-bottom:6px; display: flex; justify-content: space-between; color: #475569;">
          <strong>ETA:</strong> <span style="font-weight: 600; color: #0f172a;">${safeEta}</span>
        </div>
        <div style="margin-bottom:8px; display: flex; justify-content: space-between; color: #475569;">
          <strong>Rain Chance:</strong> <span style="font-weight: 600; color: #0f172a;">${point.rain ?? "—"}%</span>
        </div>
        <div style="margin-top: 10px;">
          <strong style="color: #0f172a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">Hazards</strong>
          <ul style="margin:0; padding-left:16px; color:#64748b; font-size:12.5px;">${hazardList}</ul>
        </div>
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
    const markerElement = createMarkerElement(getWeatherIconUrl(point.weather), riskColor);
    const popup = createPopup(point, riskColor);

    const marker = new maplibregl.Marker({ element: markerElement })
      .setLngLat([point.longitude, point.latitude])
      .setPopup(popup)
      .addTo(map);

    markers.push(marker);

    // Staggered entry animation
    window.setTimeout(() => {
      markerElement.style.opacity = "1";
      markerElement.style.transform = "translateY(0) scale(1)";
      markerElement.style.boxShadow = "0 10px 24px rgba(15, 23, 42, 0.24)";
    }, 180 + index * 120);
  });
}

