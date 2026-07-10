import React from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { getWeatherEmoji } from "../../utils/weatherIcons";

export default function WeatherMarkers({ riskSummary }) {
  if (!riskSummary || !Array.isArray(riskSummary)) return null;

  return (
    <>
      {riskSummary.map((point, index) => {
        const lat = point?.latitude;
        const lon = point?.longitude;
        if (lat == null || lon == null) return null;

        const icon = L.divIcon({
          className: "",
          html: `<div style="font-size:28px;text-align:center;">${getWeatherEmoji(
            point?.weather
          )}</div>`,
        });

        return (
          <Marker key={index} position={[lat, lon]} icon={icon}>
            <Popup>
              <h3>{point.location}</h3>
              <p>{point.weather}</p>
              <p>{point.risk}</p>
              <p>{point.eta}</p>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}