'use client'

import { useEffect } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'

type Position = { lat: number; lng: number }

const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
const tileUrl = mapboxToken
  ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}?access_token=${mapboxToken}`
  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const attribution = mapboxToken
  ? '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  : '&copy; OpenStreetMap contributors'

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
      <TileLayer attribution={attribution} url={tileUrl} tileSize={mapboxToken ? 512 : 256} maxZoom={20} />
      <Marker position={[position.lat, position.lng]} icon={markerIcon} draggable eventHandlers={{ dragend: (event: L.DragEndEvent) => { const next = event.target.getLatLng(); onMarkerMove({ lat: next.lat, lng: next.lng }) } }} />
    </MapContainer>
  )
}
