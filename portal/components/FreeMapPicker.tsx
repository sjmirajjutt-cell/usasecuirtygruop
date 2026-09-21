'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import type { Map, Marker } from 'mapbox-gl'

type Coordinates = { lat: number; lng: number }
type LocationSelection = Coordinates & { address: string; locationName?: string }
type MapboxFeature = { center?: [number, number]; place_name?: string; text?: string }

const DEFAULT_POSITION: Coordinates = { lat: 26.1224, lng: -80.1373 }
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

function parseCoordinates(value: string): Coordinates | null {
  try {
    const decoded = decodeURIComponent(value)
    const match = decoded.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/)
      || decoded.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
      || decoded.match(/[?&](?:q|query|ll|location)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i)
      || decoded.match(/^\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\s*$/)
    if (!match) return null
    const lat = Number(match[1])
    const lng = Number(match[2])
    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null
  } catch {
    return null
  }
}

function featureToSelection(feature: MapboxFeature, fallbackQuery: string): LocationSelection | null {
  if (!feature.center || feature.center.length < 2) return null
  const [lng, lat] = feature.center
  return { lat, lng, address: feature.place_name || feature.text || fallbackQuery, locationName: feature.text || fallbackQuery }
}

export default function FreeMapPicker({ onLocationSelect }: { onLocationSelect: (data: LocationSelection) => void }) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const markerRef = useRef<Marker | null>(null)
  const callbackRef = useRef(onLocationSelect)
  const autocompleteRequestRef = useRef(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [address, setAddress] = useState('')
  const [suggestions, setSuggestions] = useState<LocationSelection[]>([])
  const [manualLat, setManualLat] = useState('')
  const [manualLng, setManualLng] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    callbackRef.current = onLocationSelect
  }, [onLocationSelect])

  async function reverseGeocode(coordinates: Coordinates, locationName?: string) {
    const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates.lng},${coordinates.lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`)
    if (!response.ok) throw new Error('Mapbox reverse geocoding failed')
    const result = await response.json()
    const feature = result?.features?.[0] as MapboxFeature | undefined
    return { ...coordinates, address: feature?.place_name || `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`, locationName: locationName || feature?.text }
  }

  function updateMarker(coordinates: Coordinates) {
    mapRef.current?.flyTo({ center: [coordinates.lng, coordinates.lat], zoom: 15, essential: true })
    markerRef.current?.setLngLat([coordinates.lng, coordinates.lat])
  }

  async function selectCoordinates(coordinates: Coordinates, selection?: LocationSelection) {
    updateMarker(coordinates)
    try {
      const nextSelection = selection || await reverseGeocode(coordinates)
      setAddress(nextSelection.address)
      callbackRef.current(nextSelection)
    } catch {
      const fallback = { ...coordinates, address: `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}` }
      setAddress(fallback.address)
      callbackRef.current(fallback)
      setError('Mapbox address resolve nahi kar saka, lekin coordinates select ho gaye hain.')
    }
  }

  async function searchMapbox(value: string, limit: number) {
    if (!MAPBOX_TOKEN) throw new Error('NEXT_PUBLIC_MAPBOX_TOKEN configured nahi hai.')
    const coordinates = parseCoordinates(value)
    if (coordinates) {
      return [{ ...coordinates, address: `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`, locationName: 'Google Maps location' }]
    }

    let query = value.trim()
    try {
      const url = new URL(query)
      query = url.searchParams.get('q') || url.searchParams.get('query') || query
    } catch {
      // Plain address text is already a valid Mapbox query.
    }
    const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=${limit}`)
    if (!response.ok) throw new Error('Mapbox geocoding failed')
    const result = await response.json()
    return (result.features || [])
      .map((feature: MapboxFeature) => featureToSelection(feature, query))
      .filter((feature: LocationSelection | null): feature is LocationSelection => Boolean(feature))
  }

  useEffect(() => {
    let disposed = false
    async function initializeMap() {
      if (!mapContainerRef.current || mapRef.current) return
      if (!MAPBOX_TOKEN) {
        setError('Mapbox token configured nahi hai.')
        return
      }
      const mapboxgl = (await import('mapbox-gl')).default
      if (disposed || !mapContainerRef.current) return
      mapboxgl.accessToken = MAPBOX_TOKEN
      const map = new mapboxgl.Map({ container: mapContainerRef.current, style: 'mapbox://styles/mapbox/streets-v12', center: [DEFAULT_POSITION.lng, DEFAULT_POSITION.lat], zoom: 13 })
      const marker = new mapboxgl.Marker({ color: '#2d8fd5', draggable: true }).setLngLat([DEFAULT_POSITION.lng, DEFAULT_POSITION.lat]).addTo(map)
      marker.on('dragend', () => {
        const next = marker.getLngLat()
        void selectCoordinates({ lat: next.lat, lng: next.lng })
      })
      mapRef.current = map
      markerRef.current = marker
      map.on('load', () => { void selectCoordinates(DEFAULT_POSITION) })
    }
    void initializeMap()
    return () => {
      disposed = true
      markerRef.current?.remove()
      mapRef.current?.remove()
      markerRef.current = null
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const query = searchQuery.trim()
    if (!query || parseCoordinates(query)) {
      setSuggestions([])
      return
    }
    const requestId = ++autocompleteRequestRef.current
    const timer = window.setTimeout(async () => {
      try {
        const results = await searchMapbox(query, 5)
        if (requestId === autocompleteRequestRef.current) setSuggestions(results)
      } catch {
        if (requestId === autocompleteRequestRef.current) setSuggestions([])
      }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchQuery])

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!searchQuery.trim()) return
    setIsSearching(true)
    setError('')
    setSuggestions([])
    try {
      const results = await searchMapbox(searchQuery.trim(), 1)
      if (!results[0]) throw new Error('Location not found')
      setSearchQuery('')
      await selectCoordinates(results[0], results[0])
    } catch {
      setError('Mapbox ko location nahi mili. Address, Google Maps link, ya coordinates dobara enter karein.')
    } finally {
      setIsSearching(false)
    }
  }

  async function useCurrentLocation() {
    setError('')
    if (!navigator.geolocation) {
      setError('Browser geolocation available nahi hai.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      location => { void selectCoordinates({ lat: location.coords.latitude, lng: location.coords.longitude }) },
      () => setError('Current location access reject ho gaya.')
    )
  }

  function applyManualCoordinates() {
    const lat = Number(manualLat)
    const lng = Number(manualLng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      setError('Latitude aur longitude valid numbers hone chahiye.')
      return
    }
    setError('')
    void selectCoordinates({ lat, lng })
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSearch} className="relative flex gap-2">
        <input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} onFocus={() => setError('')} placeholder="Search address, Google Maps link, or coordinates" className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm" />
        <button type="submit" disabled={isSearching} className="rounded-md bg-[#4b98cf] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{isSearching ? 'Searching...' : 'Search'}</button>
        {suggestions.length > 0 && <div className="absolute left-0 right-[88px] top-full z-20 mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">{suggestions.map(suggestion => <button key={`${suggestion.lat}-${suggestion.lng}`} type="button" onClick={() => { setSearchQuery(''); setSuggestions([]); void selectCoordinates(suggestion, suggestion) }} className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm text-slate-700 last:border-0 hover:bg-slate-50">{suggestion.address}</button>)}</div>}
      </form>
      <div className="grid gap-2 sm:grid-cols-3">
        <button type="button" onClick={useCurrentLocation} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">Use my location</button>
        <input value={manualLat} onChange={event => setManualLat(event.target.value)} placeholder="Latitude" className="rounded-md border border-slate-200 px-3 py-2 text-sm" />
        <div className="flex gap-2"><input value={manualLng} onChange={event => setManualLng(event.target.value)} placeholder="Longitude" className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm" /><button type="button" onClick={applyManualCoordinates} className="rounded-md bg-slate-700 px-3 py-2 text-sm font-bold text-white">Set</button></div>
      </div>
      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {address && <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600"><strong>Selected:</strong> {address}</p>}
      <div ref={mapContainerRef} className="h-[300px] overflow-hidden rounded-lg border border-slate-200" />
    </div>
  )
}
