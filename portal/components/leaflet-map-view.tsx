'use client'

import { useEffect } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'

type Position = { lat: number; lng: number }

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})

function MapUpdater({ position }: { position: Position }) {
  const map = useMap()
  useEffect(() => {
    map.setView([position.lat, position.lng], map.getZoom(), { animate: true })
  }, [map, position.lat, position.lng])
  return null
}

export function LeafletMapView({ position, onMarkerMove }: { position: Position; onMarkerMove: (position: Position) => void }) {
  return (
    <MapContainer center={[position.lat, position.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
      <MapUpdater position={position} />
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[position.lat, position.lng]} icon={markerIcon} draggable eventHandlers={{ dragend: (event: L.DragEndEvent) => { const next = event.target.getLatLng(); onMarkerMove({ lat: next.lat, lng: next.lng }) } }} />
    </MapContainer>
  )
}
