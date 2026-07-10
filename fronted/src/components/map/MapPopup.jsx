import React from 'react';

export default function MapPopup({ title, children }) {
  return (
    <div className="map-popup">
      <h4>{title}</h4>
      {children}
    </div>
  );
}
