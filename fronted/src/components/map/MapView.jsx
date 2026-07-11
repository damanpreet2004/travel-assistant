import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { addWeatherMarkers } from "./WeatherMarkers";

export default function MapView({ geometry, riskSummary }) {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const routeSourceRef = useRef(null);
    const routeAnimationFrameRef = useRef(null);
    const cameraAnimationFrameRef = useRef(null);
    const cameraResetTimerRef = useRef(null);
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
                    type: "Feature",
                    geometry: {
                        type: "LineString",
                        coordinates: []
                    }
                }
            });

            mapInstance.addLayer({
                id: "route-layer",
                type: "line",
                source: "route",
                paint: {
                    "line-color": "#607456",
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

        const feature = {
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates
            }
        };

        mapInstance.getSource("route").setData(feature);
    };

    const fitRoute = (coordinates) => {
        const mapInstance = map.current;
        if (!mapInstance || !coordinates?.length) return;

        const bounds = coordinates.reduce(
            (accumulator, coordinate) => accumulator.extend(coordinate),
            new maplibregl.LngLatBounds(coordinates[0], coordinates[0])
        );

        mapInstance.fitBounds(bounds, {
            padding: 80,
            duration: 2200,
            pitch: 62,
            bearing: 24,
            maxZoom: 15,
            essential: true
        });
    };

    const animateCamera = () => {
        const mapInstance = map.current;
        if (!mapInstance) return;

        cancelCameraAnimation();

        const startBearing = mapInstance.getBearing();
        const targetBearing = startBearing + 28;
        const startTime = performance.now();
        const duration = 2200;

        const step = (timestamp) => {
            const elapsed = timestamp - startTime;
            const progress = Math.min(1, elapsed / duration);
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            const currentBearing = startBearing + (targetBearing - startBearing) * easedProgress;

            mapInstance.setBearing(currentBearing);
            mapInstance.setPitch(62);

            if (progress < 1) {
                cameraAnimationFrameRef.current = requestAnimationFrame(step);
            } else {
                cameraAnimationFrameRef.current = null;
            }
        };

        cameraAnimationFrameRef.current = requestAnimationFrame(step);
    };

    const resetCameraBearing = () => {
        const mapInstance = map.current;
        if (!mapInstance) return;

        cancelCameraAnimation();

        const startBearing = mapInstance.getBearing();
        const startTime = performance.now();
        const duration = 1200;

        const step = (timestamp) => {
            const elapsed = timestamp - startTime;
            const progress = Math.min(1, elapsed / duration);
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            const currentBearing = startBearing + (0 - startBearing) * easedProgress;

            mapInstance.setBearing(currentBearing);
            mapInstance.setPitch(62);

            if (progress < 1) {
                cameraAnimationFrameRef.current = requestAnimationFrame(step);
            } else {
                cameraAnimationFrameRef.current = null;
            }
        };

        cameraAnimationFrameRef.current = requestAnimationFrame(step);
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
        animateCamera();

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
                    resetCameraBearing();
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
            zoom: 6
        });

        mapInstance.addControl(new maplibregl.NavigationControl(), "top-right");
        mapInstance.addControl(new maplibregl.FullscreenControl(), "top-right");
        mapInstance.addControl(new maplibregl.ScaleControl(), "bottom-left");

        mapInstance.on("load", () => {
            mapReadyRef.current = true;
            createRouteLayer();
        });

        map.current = mapInstance;

        return () => {
            cancelRouteAnimation();
            cancelCameraAnimation();
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