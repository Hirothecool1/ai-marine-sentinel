'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React-Leaflet
const createWhaleIcon = (imageUrl: string) => {
  return new L.DivIcon({
    html: `
      <div class="custom-whale-marker">
        <img src="${imageUrl}" alt="Whale" />
        <div class="marker-pin"></div>
      </div>
    `,
    className: 'custom-whale-icon-container',
    iconSize: [46, 46],
    iconAnchor: [23, 46],
    popupAnchor: [0, -46]
  });
};

const shipIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/870/870104.png',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

export default function MapComponent({ data }: { data: any }) {
  const [center, setCenter] = useState<[number, number]>([37.7749, -122.4194]); // Default to SF

  useEffect(() => {
    if (data?.sightings?.length > 0) {
      setCenter([data.sightings[0].latitude, data.sightings[0].longitude]);
    } else {
      // Try to get user location if no sightings
      navigator.geolocation.getCurrentPosition(
        (pos) => setCenter([pos.coords.latitude, pos.coords.longitude]),
        () => {} // fallback to default
      );
    }
  }, [data]);

  if (!data) return <div>Loading map data...</div>;

  const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY || process.env.CARTO_API_KEY || '';
  const tileUrl = cartoKey 
    ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?api_key=${cartoKey}`
    : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
  const attribution = cartoKey 
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    : '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ';

  return (
    <MapContainer 
      center={center} 
      zoom={5} 
      style={{ height: '100%', width: '100%', borderRadius: '16px' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution={attribution}
        url={tileUrl}
        maxZoom={16}
      />
      
      {/* Render Whale Sightings */}
      {data.sightings?.map((sighting: any, idx: number) => (
        <Marker 
          key={`whale-${idx}`} 
          position={[sighting.latitude, sighting.longitude]} 
          icon={createWhaleIcon(sighting.image_url)}
        >
          <Popup>
            <div style={{ textAlign: 'center' }}>
              <img src={sighting.image_url} alt="Whale" style={{ width: '150px', borderRadius: '8px', marginBottom: '8px' }} />
              <h3 style={{ margin: '0 0 5px 0' }}>{sighting.species}</h3>
              <p style={{ margin: 0 }}>Count: {sighting.whale_count}</p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>
                {new Date(sighting.timestamp.value || sighting.timestamp).toLocaleString()}
              </p>
            </div>
          </Popup>
          
          {/* Add a sonar radius circle */}
          <Circle 
            center={[sighting.latitude, sighting.longitude]} 
            pathOptions={{ fillColor: 'var(--color-cyan)', fillOpacity: 0.2, color: 'transparent' }} 
            radius={20000} 
          />
        </Marker>
      ))}

      {/* Render AIS Ship Data */}
      {data.ais?.map((ship: any, idx: number) => (
        <Marker 
          key={`ship-${idx}`} 
          position={[ship.latitude, ship.longitude]} 
          icon={shipIcon}
        >
          <Popup>
            <div>
              <h4 style={{ margin: '0 0 5px 0' }}>{ship.name}</h4>
              <p style={{ margin: 0 }}>Speed: {ship.speed} knots</p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>AIS Tracked Vessel</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
