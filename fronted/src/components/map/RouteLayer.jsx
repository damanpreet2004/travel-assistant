import { Polyline } from "react-leaflet";

export default function RouteLayer({ geometry }){

    if(!geometry) return null;

    const positions = geometry.coordinates.map(coord=>[
        coord[1],
        coord[0]
    ]);

    return(

        <Polyline
            positions={positions}
            pathOptions={{
                color:"#607456",
                weight:3
            }}
        />

    )

}