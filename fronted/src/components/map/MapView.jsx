import {

MapContainer,
TileLayer,
useMap

} from "react-leaflet";

import { useEffect } from "react";

import RouteLayer from "./RouteLayer";
import WeatherMarkers from "./WeatherMarkers";

function FitBounds({geometry}){

    const map = useMap();

    useEffect(()=>{

        if(!geometry) return;

        const bounds = geometry.coordinates.map(c=>[
            c[1],
            c[0]
        ]);

        map.fitBounds(bounds);

    },[geometry]);

    return null;

}

export default function MapView({geometry ,riskSummary}){

    return(

        <MapContainer

            center={[28.6139,77.2090]}

            zoom={6}

            className="w-full h-full"

        >

            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />

            <RouteLayer geometry={geometry}/>

            <WeatherMarkers riskSummary={riskSummary}/>

            <FitBounds geometry={geometry}/>

        </MapContainer>

    )

}