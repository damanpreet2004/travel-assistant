import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { addWeatherMarkers } from "./WeatherMarkers";
import { segmentRouteByRisk } from "./RiskLayer";

export default function MapView({ geometry, riskSummary }) {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const routeSourceRef = useRef(null);
    const routeAnimationFrameRef = useRef(null);
    const cameraAnimationFrameRef = useRef(null);
    const cameraResetTimerRef = useRef(null);
    const continuousAnimationRef = useRef(null);
    const mapReadyRef = useRef(false);

    const cancelRouteAnimation = () => {
        if (routeAnimationFrameRef.current) {
            cancelAnimationFrame(routeAnimationFrameRef.current);
            routeAnimationFrameRef.current = null;
        }
    };

    const cancelCameraAnimation = () => {
        if (cameraAnimationFrameRef.current) {
            cancelAnimationFrame(cameraAnimationFrameRef.current);
            cameraAnimationFrameRef.current = null;
        }

        if (cameraResetTimerRef.current) {
            clearTimeout(cameraResetTimerRef.current);
            cameraResetTimerRef.current = null;
        }
    };

    const createRouteLayer = () => {
        const mapInstance = map.current;
        if (!mapInstance || !mapInstance.isStyleLoaded()) return;

        if (!mapInstance.getSource("route")) {
            mapInstance.addSource("route", {
                type: "geojson",
                data: {
                    type: "FeatureCollection",
                    features: []
                }
            });

            mapInstance.addLayer({
                id: "route-layer",
                type: "line",
                source: "route",
                paint: {
                    "line-color": [
                        "match",
                        ["get", "risk"],
                        "SAFE", "#2e7d32",
                        "LOW", "#f9a825",
                        "MODERATE", "#ef6c00",
                        "HIGH", "#c62828",
                        "#607456" // fallback
                    ],
                    "line-width": 6,
                    "line-opacity": 0.9
                }
            });
        }

        routeSourceRef.current = mapInstance.getSource("route");
    };

    const updateRoute = (coordinates) => {
        const mapInstance = map.current;
        if (!mapInstance || !coordinates?.length) return;

        createRouteLayer();

        const geojsonData = segmentRouteByRisk(coordinates, riskSummary);

        mapInstance.getSource("route").setData(geojsonData);
    };

    const stopContinuousAnimation = () => {
        if (continuousAnimationRef.current) {
            cancelAnimationFrame(continuousAnimationRef.current);
            continuousAnimationRef.current = null;
        }
    };

    const startContinuousCameraAnimation = () => {
        const mapInstance = map.current;
        if (!mapInstance) return;

        cancelCameraAnimation();
        stopContinuousAnimation();

        const step = () => {
            if (!mapInstance) return;
            const currentBearing = mapInstance.getBearing();
            // Slowly rotate bearing for a premium dynamic showcase effect
            mapInstance.setBearing((currentBearing + 0.05) % 360);
            continuousAnimationRef.current = requestAnimationFrame(step);
        };

        continuousAnimationRef.current = requestAnimationFrame(step);
    };

    const fitRoute = (coordinates) => {
        const mapInstance = map.current;
        if (!mapInstance || !coordinates?.length) return;

        // Trigger map resize first to ensure correct dimensions
        mapInstance.resize();

        const bounds = coordinates.reduce(
            (accumulator, coordinate) => accumulator.extend(coordinate),
            new maplibregl.LngLatBounds(coordinates[0], coordinates[0])
        );

        // Sidebar takes 400px on desktop, so pad the right side to keep the route visible on the left
        const padding = {
            top: 100,
            bottom: 100,
            left: 100,
            right: window.innerWidth > 1024 ? 480 : 100
        };

        // Combine fitBounds, pitch, and bearing into a single conflict-free animation
        mapInstance.fitBounds(bounds, {
            padding,
            duration: 2800,
            pitch: 52,
            bearing: 20,
            maxZoom: 14,
            essential: true
        });
    };

    const renderWeatherMarkers = () => {
        if (!map.current || !riskSummary?.length) return;
        addWeatherMarkers(map.current, riskSummary);
    };

    const animateRoute = (coordinates) => {
        const mapInstance = map.current;
        if (!mapInstance || !coordinates?.length) return;

        cancelRouteAnimation();
        cancelCameraAnimation();
        stopContinuousAnimation();

        createRouteLayer();

        const initialFeature = {
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: [coordinates[0]]
            }
        };

        mapInstance.getSource("route").setData(initialFeature);
        fitRoute(coordinates);

        const duration = Math.min(1800, Math.max(1000, coordinates.length * 18));
        const startTime = performance.now();

        const drawStep = (timestamp) => {
            const elapsed = timestamp - startTime;
            const progress = Math.min(1, elapsed / duration);
            const nextIndex = Math.max(1, Math.round(progress * coordinates.length));

            updateRoute(coordinates.slice(0, nextIndex));

            if (progress < 1) {
                routeAnimationFrameRef.current = requestAnimationFrame(drawStep);
            } else {
                routeAnimationFrameRef.current = null;
                renderWeatherMarkers();
                cameraResetTimerRef.current = window.setTimeout(() => {
                    // Start slow rotating camera until user interacts
                    startContinuousCameraAnimation();
                }, 250);
            }
        };

        routeAnimationFrameRef.current = requestAnimationFrame(drawStep);
    };

    useEffect(() => {
        if (map.current) return;

        const mapInstance = new maplibregl.Map({
            container: mapContainer.current,
            style: "https://tiles.openfreemap.org/styles/liberty",
            center: [77.209, 28.6139],
            zoom: 6,
            attributionControl: false
        });

        mapInstance.addControl(new maplibregl.NavigationControl(), "top-left");
        mapInstance.addControl(new maplibregl.FullscreenControl(), "top-left");
        mapInstance.addControl(new maplibregl.ScaleControl(), "bottom-left");

        mapInstance.on("load", () => {
            mapReadyRef.current = true;
            createRouteLayer();
        });

        // Cancel the continuous camera rotation as soon as the user physically touches the map
        const handleUserInteraction = () => {
            stopContinuousAnimation();
        };
        mapInstance.on("mousedown", handleUserInteraction);
        mapInstance.on("touchstart", handleUserInteraction);
        mapInstance.on("wheel", handleUserInteraction);

        map.current = mapInstance;

        return () => {
            cancelRouteAnimation();
            cancelCameraAnimation();
            stopContinuousAnimation();
            mapInstance.remove();
            map.current = null;
        };
    }, []);

    useEffect(() => {
        if (!geometry?.coordinates?.length) return;

        if (!map.current) {
            return;
        }

        if (!mapReadyRef.current) {
            map.current.once("load", () => {
                animateRoute(geometry.coordinates);
            });
            return;
        }

        animateRoute(geometry.coordinates);
    }, [geometry]);

    useEffect(() => {
        if (!map.current || !riskSummary?.length) return;
        if (routeAnimationFrameRef.current) return;

        renderWeatherMarkers();
    }, [riskSummary]);

    return <div ref={mapContainer} className="w-full h-full" />;
}