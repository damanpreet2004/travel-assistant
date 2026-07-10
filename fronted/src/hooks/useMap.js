import { useState } from 'react';

export default function useMap() {
  const [selectedRoute, setSelectedRoute] = useState(null);

  return { selectedRoute, setSelectedRoute };
}
