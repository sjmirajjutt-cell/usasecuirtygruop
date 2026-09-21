'use client'

import { FormEvent, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

type LocationSelection = { lat: number; lng: number; address: string; locationName?: string }

const LeafletMapView = dynamic(() => import('./leaflet-map-view').then(module => module.LeafletMapView), { ssr: false })

export default function FreeMapPicker({ onLocationSelect }: { onLocationSelect: (data: LocationSelection) => void }) {
  const [position, setPosition] = useState({ lat: 26.1224, lng: -80.1373 })
  const [searchQuery, setSearchQuery] = useState('')
  const [address, setAddress] = useState('')
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

      const locationName = decodeURIComponent(url.pathname.match(/\/maps\/(?:search\/)?([^/@?]+)/)?.[1] ?? '')
        .replace(/\+/g, ' ')
        .replace(/-/g, ' ')
        .trim()
      return { lat: Number(coordinates[1]), lng: Number(coordinates[2]), locationName: locationName || undefined }
    } catch {
      return null
    }
  }

  async function resolveGoogleMapsLink(value: string) {
    const trimmed = value.trim()
    if (!trimmed || !/^https?:\/\//i.test(trimmed)) return parseGoogleMapsUrl(trimmed)

    try {
      const response = await fetch(trimmed, { redirect: 'follow', cache: 'no-store' })
      const resolved = parseGoogleMapsUrl(response.url || trimmed)
      if (resolved) return resolved
    } catch {
      // fallback below
    }

    return parseGoogleMapsUrl(trimmed)
  }

  async function selectPosition(lat: number, lng: number, fallbackAddress?: string, locationName?: string) {
    setPosition({ lat, lng })
    if (fallbackAddress) {
      setAddress(fallbackAddress)
      onLocationSelect({ lat, lng, address: fallbackAddress, locationName })
      return
    }

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
      const result = await response.json()
      const selectedAddress = result.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      setAddress(selectedAddress)
      onLocationSelect({ lat, lng, address: selectedAddress, locationName })
    } catch {
      const selectedAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      setAddress(selectedAddress)
      onLocationSelect({ lat, lng, address: selectedAddress, locationName })
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!searchQuery.trim()) return
    setIsSearching(true)
    setError('')
    try {
      const googleLocation = await resolveGoogleMapsLink(searchQuery.trim())
      if (googleLocation) {
        await selectPosition(googleLocation.lat, googleLocation.lng, searchQuery.trim(), googleLocation.locationName)
        return
      }

      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(searchQuery)}`)
      const results = await response.json()
      if (!results.length) {
        setError('Location nahi mili. Address ya city dobara search karein.')
        return
      }
      await selectPosition(Number(results[0].lat), Number(results[0].lon), results[0].display_name)
    } catch {
      setError('Location search nahi ho saki. Internet connection check karein.')
    } finally {
      setIsSearching(false)
    }
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
      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {address && <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600"><strong>Selected:</strong> {address}<br /><span className="text-slate-400">Google Maps link paste karne par marker exact coordinates par set hoga.</span></p>}
      <div className="h-[300px] overflow-hidden rounded-lg border border-slate-200">
        <LeafletMapView position={position} onMarkerMove={next => { void selectPosition(next.lat, next.lng) }} />
      </div>
    </div>
  )
}
