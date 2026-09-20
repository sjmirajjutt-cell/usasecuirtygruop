'use client'

import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

export function MapUpdater({ position }: { position: { lat: number; lng: number } }) {
  const map = useMap()

  useEffect(() => {
    map.setView([position.lat, position.lng], map.getZoom(), { animate: true })
  }, [map, position.lat, position.lng])

  return null
}
