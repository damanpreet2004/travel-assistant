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
      return { border: "#2e7d32", background: "#43a047", badge: "#e8f5e9", text: "#1b5e20" };
    case "LOW":
      return { border: "#f9a825", background: "#fbc02d", badge: "#fff8e1", text: "#f57f17" };
    case "MODERATE":
      return { border: "#ef6c00", background: "#fb8c00", badge: "#fff3e0", text: "#e65100" };
    case "HIGH":
      return { border: "#c62828", background: "#e53935", badge: "#ffebee", text: "#b71c1c" };
    default:
      return { border: "#607456", background: "#78876b", badge: "#f1f5f1", text: "#4b5b3d" };
  }
}

// Pin height constants: badge + pointer, used for the entry animation and popup offset
const BADGE_SIZE = 56;
const POINTER_HEIGHT = 14;
const POINTER_OVERLAP = 4; // pulls pointer up slightly so it visually fuses with the badge
const PIN_HEIGHT = BADGE_SIZE + POINTER_HEIGHT - POINTER_OVERLAP;

function createMarkerElement(iconUrl, riskColor) {
  // Outer container: the whole pin (badge + pointer). This is what MapLibre
  // anchors — with anchor:"bottom" the very tip of the pointer sits on the
  // actual lng/lat, and the badge rises above it instead of covering the route.
  //
  // IMPORTANT: do NOT set `position` here. MapLibre applies its own
  // positioning (translate transform) to this exact element on every map
  // move/zoom. `position: fixed` was overriding that and would have caused
  // the same "marker drifts off route" bug from before — removed.
  const container = document.createElement("div");
  container.className = "weather-marker-container";
  container.style.width = `${BADGE_SIZE}px`;
  container.style.height = `${PIN_HEIGHT}px`;
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.alignItems = "center";
  container.style.cursor = "pointer";

  // ANIM wrapper — animate this, never `container` itself (MapLibre owns
  // container's transform for positioning; animating it directly is what
  // caused markers to drift off the route in the earlier version).
  const anim = document.createElement("div");
  anim.className = "weather-marker-anim";
  anim.style.width = "100%";
  anim.style.height = "100%";
  anim.style.display = "flex";
  anim.style.flexDirection = "column";
  anim.style.alignItems = "center";
  anim.style.transformOrigin = "bottom center";
  anim.style.transition =
    "transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 400ms ease";
  anim.style.opacity = "0";
  anim.style.transform = "translateY(-12px) scale(0.6)";

  // Badge — filled with the actual risk color (tinted, not flat teal) so
  // risk is readable at a glance, with a soft ring + two-layer shadow for depth.
  const badge = document.createElement("div");
  badge.className = "weather-marker-badge";
  badge.style.position = "relative";
  badge.style.zIndex = "2";
  badge.style.width = `${BADGE_SIZE}px`;
  badge.style.height = `${BADGE_SIZE}px`;
  badge.style.borderRadius = "30%"; // squircle — softer than a hard square, more distinct than a circle
  badge.style.background = `linear-gradient(160deg, ${riskColor.background}, ${riskColor.border})`;
  badge.style.border = `2.5px solid ${riskColor.border}`;
  badge.style.display = "flex";
  badge.style.alignItems = "center";
  badge.style.justifyContent = "center";
  badge.style.transition = "transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 300ms ease";
  badge.style.boxShadow = [
    `0 0 0 4px ${riskColor.border}26`, // colored halo — makes risk legible even zoomed out
    "0 3px 6px rgba(15, 23, 42, 0.30)", // tight contact shadow
    "0 10px 20px rgba(15, 23, 42, 0.20)" // soft ambient shadow — creates the "floating" depth
  ].join(", ");

  // Icon backing circle — icons were getting muddy directly on a colored
  // badge; a light disc behind the icon makes it pop regardless of risk color.
  const iconBacking = document.createElement("div");
  iconBacking.className = "weather-marker-icon-backing";
  iconBacking.style.width = "36px";
  iconBacking.style.height = "36px";
  iconBacking.style.borderRadius = "50%";
  iconBacking.style.background = "rgba(66, 66, 66, 0.92)";
  iconBacking.style.display = "flex";
  iconBacking.style.alignItems = "center";
  iconBacking.style.justifyContent = "center";
  iconBacking.style.boxShadow = "inset 0 1px 2px rgba(15, 23, 42, 0.12)";

  const icon = document.createElement("img");
  icon.src = iconUrl;
  icon.alt = "weather icon";
  icon.style.width = "24px";
  icon.style.height = "24px";
  icon.style.objectFit = "contain";
  icon.style.transition = "transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)";

  iconBacking.appendChild(icon);
  badge.appendChild(iconBacking);

  // Pointer/tail — colored with the risk border (was hardcoded to the old
  // teal before), so the whole pin — badge, halo, and tail — reads as one
  // risk-coded unit.
  const pointer = document.createElement("div");
  pointer.className = "weather-marker-pointer";
  pointer.style.position = "relative";
  pointer.style.zIndex = "1";
  pointer.style.width = "0";
  pointer.style.height = "0";
  pointer.style.marginTop = `-${POINTER_OVERLAP}px`;
  pointer.style.borderLeft = "8px solid transparent";
  pointer.style.borderRight = "8px solid transparent";
  pointer.style.borderTop = `${POINTER_HEIGHT}px solid ${riskColor.border}`;
  pointer.style.filter = "drop-shadow(0 3px 3px rgba(15, 23, 42, 0.28))";

  anim.appendChild(badge);
  anim.appendChild(pointer);
  container.appendChild(anim);

  // Hover micro-animation — safe: targets `badge`/`icon`, never `container`.
  container.addEventListener("mouseenter", () => {
    badge.style.transform = "translateY(-4px) scale(1.1)";
    badge.style.boxShadow = [
      `0 0 0 6px ${riskColor.border}33`,
      "0 4px 8px rgba(15, 23, 42, 0.32)",
      "0 16px 28px rgba(15, 23, 42, 0.26)"
    ].join(", ");
    icon.style.transform = "scale(1.15) rotate(5deg)";
  });

  container.addEventListener("mouseleave", () => {
    badge.style.transform = "translateY(0) scale(1)";
    badge.style.boxShadow = [
      `0 0 0 4px ${riskColor.border}26`,
      "0 3px 6px rgba(15, 23, 42, 0.30)",
      "0 10px 20px rgba(15, 23, 42, 0.20)"
    ].join(", ");
    icon.style.transform = "scale(1) rotate(0deg)";
  });

  return { container, anim };
}

function createPopup(point, riskColor) {
  const safeEta = point.eta ? new Date(point.eta).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
  const hazardList = Array.isArray(point.hazards) && point.hazards.length
    ? point.hazards.map((hazard) => `<li style="margin-bottom: 4px;">${hazard}</li>`).join("")
    : "<li>No major hazards</li>";

  const popupContent = `
    <div style="width: 260px; max-width: 100%; box-sizing: border-box; font-family: 'Outfit', 'Inter', system-ui, -apple-system, sans-serif; color:#1f2937;">
  <div style="display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:12px;">
    <div>
      <div style="font-size:15px; font-weight:700; color:#0f172a; letter-spacing: -0.01em;">${point.location || "Route stop"}</div>
      <div style="font-size:12px; color:#64748b; margin-top:2px; font-weight: 500;">${point.weather || "Unknown"}</div>
    </div>
    <div style="width:44px; height:44px; border-radius:12px; background:linear-gradient(135deg, #f8fafc, #f1f5f9); border:1px solid #e2e8f0; display:flex; align-items:center; justify-content:center; box-shadow: inset 0 1px 2px rgba(255,255,255,0.8); flex-shrink: 0;">
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
    // Push the popup up clear of the whole pin (badge + pointer), since the
    // marker's anchor point is now the pointer tip, not the badge center.
    offset: PIN_HEIGHT + 12,
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
    const { container, anim } = createMarkerElement(getWeatherIconUrl(point.weather), riskColor);
    const popup = createPopup(point, riskColor);

    const marker = new maplibregl.Marker({
      element: container,
      anchor: "bottom" // pointer tip sits on the route coordinate; badge floats above it
    })
      .setLngLat([point.longitude, point.latitude])
      .setPopup(popup)
      .addTo(map);

    markers.push(marker);

    // Staggered entry animation — targets `anim` (a child), never `container`
    // (the element MapLibre positions), so it can't fight with map positioning.
    window.setTimeout(() => {
      anim.style.opacity = "1";
      anim.style.transform = "translateY(0) scale(1)";
    }, 180 + index * 120);
  });
}