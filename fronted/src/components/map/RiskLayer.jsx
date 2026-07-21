export function getRiskColor(risk) {
  const normalizedRisk = `${risk || ""}`.toUpperCase();

  switch (normalizedRisk) {
    case "SAFE":
      return { border: "#2e7d32", badge: "#e8f5e9", text: "#1b5e20", line: "#2e7d32" };
    case "LOW":
      return { border: "#f9a825", badge: "#fff8e1", text: "#f57f17", line: "#f9a825" };
    case "MODERATE":
      return { border: "#ef6c00", badge: "#fff3e0", text: "#e65100", line: "#ef6c00" };
    case "HIGH":
      return { border: "#c62828", badge: "#ffebee", text: "#b71c1c", line: "#c62828" };
    default:
      return { border: "#607456", badge: "#f1f5f1", text: "#4b5b3d", line: "#607456" };
  }
}

export function segmentRouteByRisk(coordinates, riskSummary) {
  if (!coordinates || coordinates.length === 0) {
    return {
      type: "FeatureCollection",
      features: []
    };
  }

  if (!riskSummary || riskSummary.length === 0) {
    // Default to a single line with DEFAULT risk
    return {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: { risk: "DEFAULT" },
        geometry: {
          type: "LineString",
          coordinates: coordinates
        }
      }]
    };
  }

  // Find nearest risk point for each coordinate
  const pointsWithRisk = coordinates.map(coord => {
    let minD2 = Infinity;
    let nearestRisk = "SAFE"; // default

    riskSummary.forEach(point => {
      const dx = coord[0] - point.longitude;
      const dy = coord[1] - point.latitude;
      const d2 = dx * dx + dy * dy;
      if (d2 < minD2) {
        minD2 = d2;
        nearestRisk = point.risk || "SAFE";
      }
    });

    return {
      coord,
      risk: nearestRisk
    };
  });

  // Group consecutive points with same risk into features
  const features = [];
  let currentSegment = [];
  let currentRisk = null;

  for (let i = 0; i < pointsWithRisk.length; i++) {
    const pt = pointsWithRisk[i];
    
    if (currentSegment.length === 0) {
      currentSegment.push(pt.coord);
      currentRisk = pt.risk;
    } else if (pt.risk === currentRisk) {
      currentSegment.push(pt.coord);
    } else {
      // Risk changed. Finish the current segment.
      // Include the boundary point in both segments so they connect visually.
      currentSegment.push(pt.coord);
      features.push({
        type: "Feature",
        properties: { risk: currentRisk },
        geometry: {
          type: "LineString",
          coordinates: currentSegment
        }
      });
      // Start new segment
      currentSegment = [pt.coord];
      currentRisk = pt.risk;
    }
  }

  // Add the last segment
  if (currentSegment.length > 1) {
    features.push({
      type: "Feature",
      properties: { risk: currentRisk },
      geometry: {
        type: "LineString",
        coordinates: currentSegment
      }
    });
  }

  return {
    type: "FeatureCollection",
    features
  };
}
