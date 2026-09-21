'use client'

import { FormEvent, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

type LocationSelection = { lat: number; lng: number; address: string; locationName?: string }

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

const LeafletMapView = dynamic(() => import('./leaflet-map-view').then(module => module.LeafletMapView), { ssr: false })

export default function FreeMapPicker({ onLocationSelect }: { onLocationSelect: (data: LocationSelection) => void }) {
  const [position, setPosition] = useState({ lat: 26.1224, lng: -80.1373 })
  const [searchQuery, setSearchQuery] = useState('')
  const [address, setAddress] = useState('')
  const [manualLat, setManualLat] = useState('')
  const [manualLng, setManualLng] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')

  function parseCoordinates(value: string) {
    try {
      const decoded = decodeURIComponent(value)
      const coordinateMatch = decoded.match(/(?:@|!3d|[?&](?:q|query|ll|location)=)?(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/)
      if (!coordinateMatch) return null
      const lat = Number(coordinateMatch[1])
      const lng = Number(coordinateMatch[2])
      return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null
    } catch {
      return null
    }
  }

  async function resolveMapboxLocation(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return null
    if (!MAPBOX_TOKEN) throw new Error('Mapbox token configured nahi hai.')

    const coordinates = parseCoordinates(trimmed)
    if (coordinates) {
      const reverseResponse = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates.lng},${coordinates.lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`)
      const reverseResult = await reverseResponse.json()
      const feature = reverseResult?.features?.[0]
      return { ...coordinates, address: feature?.place_name || `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`, locationName: feature?.text }
    }

    let query = trimmed
    try {
      const url = new URL(trimmed)
      query = url.searchParams.get('q') || url.searchParams.get('query') || decodeURIComponent(url.pathname.replace(/^\/+|\/+$/g, '').replace(/\+/g, ' '))
    } catch {
      // Treat plain text as a Mapbox place query.
    }

    const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=1`)
    const result = await response.json()
    const feature = result?.features?.[0]
    if (!feature?.center || feature.center.length < 2) return null
    return { lat: Number(feature.center[1]), lng: Number(feature.center[0]), address: feature.place_name || feature.text || query, locationName: feature.text || query }
  }

  function getFallbackLocationName(value?: string) {
    if (!value) return undefined
    const cleanValue = value.replace(/https?:\/\/[^\s]+/gi, '').replace(/\s+/g, ' ').trim()
    const firstPart = cleanValue.split(',')[0]?.trim()
    const label = firstPart && firstPart.length > 2 ? firstPart : cleanValue
    return label || undefined
  }

  async function selectPosition(lat: number, lng: number, fallbackAddress?: string, locationName?: string) {
    setPosition({ lat, lng })

    const normalizedFallbackAddress = fallbackAddress && /^https?:\/\//i.test(fallbackAddress) ? undefined : fallbackAddress
    const resolvedLocationName = locationName || getFallbackLocationName(normalizedFallbackAddress)

    if (normalizedFallbackAddress) {
      setAddress(normalizedFallbackAddress)
      onLocationSelect({ lat, lng, address: normalizedFallbackAddress, locationName: resolvedLocationName })
      return
    }

    try {
      if (!MAPBOX_TOKEN) throw new Error('Mapbox token configured nahi hai.')
      const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`)
      const result = await response.json()
      const selectedAddress = result?.features?.[0]?.place_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      const nextLocationName = resolvedLocationName || getFallbackLocationName(selectedAddress)
      setAddress(selectedAddress)
      onLocationSelect({ lat, lng, address: selectedAddress, locationName: nextLocationName })
    } catch {
      const selectedAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      const nextLocationName = resolvedLocationName || getFallbackLocationName(selectedAddress)
      setAddress(selectedAddress)
      onLocationSelect({ lat, lng, address: selectedAddress, locationName: nextLocationName })
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!searchQuery.trim()) return
    setIsSearching(true)
    setError('')
    try {
      const mapboxLocation = await resolveMapboxLocation(searchQuery.trim())
      if (mapboxLocation) {
        setSearchQuery('')
        await selectPosition(mapboxLocation.lat, mapboxLocation.lng, mapboxLocation.address, mapboxLocation.locationName)
        return
      }
      setError('Mapbox ko location nahi mili. Address ya coordinates dobara enter karein.')
    } catch {
      setError('Mapbox search nahi ho saki. Token aur internet connection check karein.')
    } finally {
      setIsSearching(false)
    }
  }

  async function useCurrentLocation() {
    setError('')
    if (!navigator.geolocation) {
      setError('Browser geolocation available nahi hai. Manual latitude/longitude enter karo.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        await selectPosition(lat, lng, undefined, 'Current Location')
      },
      () => setError('Current location access reject ho gaya. Manual coordinates enter karo.')
    )
  }

  function applyManualCoordinates() {
    const lat = Number(manualLat)
    const lng = Number(manualLng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError('Latitude aur longitude valid numbers hone chahiye.')
      return
    }

    setError('')
    void selectPosition(lat, lng, undefined, `Manual Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`)
  }

  useEffect(() => {
    void selectPosition(position.lat, position.lng)
    // Initial map address is intentionally resolved once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-3">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Mapbox address ya coordinates enter karein" className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm" />
        <button type="submit" disabled={isSearching} className="rounded-md bg-[#4b98cf] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{isSearching ? 'Searching...' : 'Search'}</button>
      </form>

      <div className="grid gap-2 sm:grid-cols-3">
        <button type="button" onClick={useCurrentLocation} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">Use my location</button>
        <input value={manualLat} onChange={event => setManualLat(event.target.value)} placeholder="Latitude" className="rounded-md border border-slate-200 px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <input value={manualLng} onChange={event => setManualLng(event.target.value)} placeholder="Longitude" className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm" />
          <button type="button" onClick={applyManualCoordinates} className="rounded-md bg-slate-700 px-3 py-2 text-sm font-bold text-white">Set</button>
        </div>
      </div>

      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {address && <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600"><strong>Selected:</strong> {address}<br /><span className="text-slate-400">Mapbox address search, current location, manual coordinates, ya marker drag se site select karein.</span></p>}
      <div className="h-[300px] overflow-hidden rounded-lg border border-slate-200">
        <LeafletMapView position={position} onMarkerMove={next => { void selectPosition(next.lat, next.lng) }} />
      </div>
    </div>
  )
}
