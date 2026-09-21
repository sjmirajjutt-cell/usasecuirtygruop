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

  function parseGoogleMapsUrl(value: string) {
    try {
      const url = new URL(value)
      const pathAndQuery = decodeURIComponent(`${url.pathname} ${url.search}`)
      const coordinateMatches = [
        pathAndQuery.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/),
        pathAndQuery.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/),
        pathAndQuery.match(/[?&](?:q|query|ll|location)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/),
        pathAndQuery.match(/[?&](?:q|query)=([^&]+)/i)
      ]

      const coordinates = coordinateMatches.find(match => match && match[1] && match[2])
      if (!coordinates) {
        const queryFallback = pathAndQuery.match(/[?&](?:q|query)=([^&]+)/i)
        if (queryFallback && queryFallback[1]?.includes(',')) {
          const [lat, lng] = queryFallback[1].split(',').map(piece => Number(piece.trim()))
          if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
        }
        return null
      }

      let locationName = ''
      const pathNameMatch = url.pathname.match(/\/maps\/(?:place\/|search\/)?(?:@)?([^/@?]+)/i)
      if (pathNameMatch?.[1]) locationName = decodeURIComponent(pathNameMatch[1]).replace(/\+/g, ' ').replace(/-/g, ' ')
      else {
        const queryName = url.searchParams.get('q') ?? url.searchParams.get('query')
        if (queryName) locationName = decodeURIComponent(queryName).replace(/\+/g, ' ')
      }

      const lat = Number(coordinates[1])
      const lng = Number(coordinates[2])
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng, locationName: locationName.trim() || undefined } : null
    } catch {
      return null
    }
  }

  async function resolveGoogleMapsLink(value: string) {
    const trimmed = value.trim()
    if (!trimmed || !/^https?:\/\//i.test(trimmed)) return parseGoogleMapsUrl(trimmed)

    console.log('[MapPicker] Raw URL:', trimmed)

    try {
      const response = await fetch('/api/resolve-map-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed })
      })
      const result = await response.json()
      console.log('[MapPicker] Resolved URL:', result?.url ?? trimmed)
      if (result?.url) {
        const resolved = parseGoogleMapsUrl(result.url)
        console.log('[MapPicker] Resolved coordinates:', resolved)
        if (resolved) return resolved
      }
    } catch (error) {
      console.error('[MapPicker] Resolve error:', error)
    }

    const fallback = parseGoogleMapsUrl(trimmed)
    console.log('[MapPicker] Fallback parse:', fallback)
    return fallback
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
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
      const result = await response.json()
      const selectedAddress = result.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
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
      const googleLocation = await resolveGoogleMapsLink(searchQuery.trim())
      console.log('[MapPicker] Selected from search:', googleLocation)
      if (googleLocation) {
        setSearchQuery('')
        await selectPosition(googleLocation.lat, googleLocation.lng, undefined, googleLocation.locationName)
        return
      }

      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(searchQuery)}`)
      const results = await response.json()
      if (!results.length) {
        setError('Location nahi mili. Address ya city dobara search karein. Agar exact Google Maps link hai to coordinates manual bhi enter kar sakte hain.')
        return
      }
      await selectPosition(Number(results[0].lat), Number(results[0].lon), results[0].display_name)
    } catch {
      setError('Location search nahi ho saki. Internet connection check karein. Coordinates manual entry ya current location use karo.')
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
        await selectPosition(lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)}`, 'Current Location')
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
    void selectPosition(lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)}`, `Manual Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`)
  }

  useEffect(() => {
    void selectPosition(position.lat, position.lng)
    // Initial map address is intentionally resolved once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-3">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Address ya Google Maps link paste karein" className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm" />
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
      {address && <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600"><strong>Selected:</strong> {address}<br /><span className="text-slate-400">Google Maps link paste karne par marker exact coordinates par set hoga, warna current location ya manual coordinates use kar sakte hain.</span></p>}
      <div className="h-[300px] overflow-hidden rounded-lg border border-slate-200">
        <LeafletMapView position={position} onMarkerMove={next => { void selectPosition(next.lat, next.lng) }} />
      </div>
    </div>
  )
}
