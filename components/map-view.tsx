"use client"

import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import type { Recommendation } from "@/lib/types"

interface MapViewProps {
  coordinates: [number, number] | null
  recommendations: Recommendation[]
  routeInfo: any | null
}

export function MapView({ coordinates, recommendations, routeInfo }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)

  // Initialize map only once
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    try {
      if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
        throw new Error("Mapbox token is not configured. Please check your .env.local file.")
      }
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

      // Use a less resource-intensive map style to reduce API calls
      // Configuración inicial del mapa centrado en el mundo con zoom máximo
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/satellite-streets-v12",
        center: [0, 20], // Centrado en el ecuador
        zoom: 1.5, // Zoom inicial muy alejado para ver el mundo
        minZoom: 1, // Zoom mínimo para evitar que el usuario se aleje demasiado
        maxZoom: 16,
        projection: "globe",
        renderWorldCopies: false // Evita la repetición del mapa
      })

      // Add error handling for map loading
      map.current.on("error", (e) => {
        console.error("Mapbox error:", e)
        setMapError("Error loading map: " + (e.error?.message || "Unknown error"))
      })

      map.current.on("load", () => {
        setMapLoaded(true)
        console.log("Map loaded successfully")

        // Add atmosphere with reduced complexity
        if (map.current) {
          map.current.setFog({
            color: "rgb(186, 210, 235)",
            "high-color": "rgb(36, 92, 223)",
            "horizon-blend": 0.02,
            "space-color": "rgb(11, 11, 25)",
            "star-intensity": 0.4, // Reduce star intensity
          })
        }
      })
    } catch (error) {
      console.error("Error initializing map:", error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setMapError(`Error initializing map: ${errorMessage}`)
    }

    return () => {
      if (map.current) {
        // Clean up markers before removing map
        markersRef.current.forEach((marker) => marker.remove())
        markersRef.current = []

        map.current.remove()
        map.current = null
      }
    }
  }, []) // Only run once on component mount

  // Update map center when coordinates change
  useEffect(() => {
    if (!map.current || !coordinates) return

    try {
      map.current.flyTo({
        center: coordinates,
        zoom: 12,
        essential: true,
      })
    } catch (error) {
      console.error("Error updating map center:", error)
    }
  }, [coordinates])

  // Add markers and route when recommendations change
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Clear previous markers
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    // Clear previous route
    try {
      if (map.current.getLayer("route")) {
        map.current.removeLayer("route")
      }
      if (map.current.getSource("route")) {
        map.current.removeSource("route")
      }
    } catch (error) {
      console.error("Error clearing previous route:", error)
    }

    // If no recommendations, don't proceed further
    if (!recommendations || recommendations.length === 0) return

    console.log("Adding markers for recommendations:", recommendations.length)

    // Add markers for each recommendation
    recommendations.forEach((rec, index) => {
      if (!map.current || !rec.coordinates) {
        console.warn(`Missing coordinates for recommendation ${index}:`, rec)
        return
      }

      try {
        // Create custom marker element
        const el = document.createElement("div")
        el.className = "marker"
        el.style.width = "32px"
        el.style.height = "32px"
        el.style.borderRadius = "50%"
        el.style.backgroundColor = "#3b82f6"
        el.style.color = "white"
        el.style.fontWeight = "bold"
        el.style.display = "flex"
        el.style.alignItems = "center"
        el.style.justifyContent = "center"
        el.style.border = "2px solid white"
        el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)"
        el.innerHTML = `${index + 1}`

        // Add marker to map
        const marker = new mapboxgl.Marker(el)
          .setLngLat(rec.coordinates)
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              `<h3 style="font-weight: bold; margin-bottom: 5px;">${rec.name}</h3>
               <p style="font-size: 12px;">${rec.address}</p>
               <p style="font-size: 12px;">${rec.description.substring(0, 100)}...</p>`,
            ),
          )
          .addTo(map.current)

        markersRef.current.push(marker)
      } catch (error) {
        console.error(`Error adding marker for ${rec.name}:`, error)
      }
    })

    // Fit map to show all markers if we have any
    if (markersRef.current.length > 0 && map.current) {
      try {
        const bounds = new mapboxgl.LngLatBounds()
        recommendations.forEach((rec) => {
          if (rec.coordinates) {
            bounds.extend(rec.coordinates)
          }
        })

        // Add some padding around the bounds
        map.current.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          maxZoom: 14, // Limit zoom level to reduce tile requests
          duration: 1000, // Smooth transition
        })
      } catch (error) {
        console.error("Error fitting bounds:", error)
      }
    }

    // Add route line if available
    if (routeInfo && routeInfo.routes && routeInfo.routes.length > 0) {
      const route = routeInfo.routes[0]

      if (route && route.geometry) {
        try {
          // Add new source and layer
          map.current.addSource("route", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: route.geometry,
            },
          })

          map.current.addLayer({
            id: "route",
            type: "line",
            source: "route",
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": "#3b82f6",
              "line-width": 5,
              "line-opacity": 0.8,
            },
          })
        } catch (error) {
          console.error("Error adding route to map:", error)
        }
      }
    }
  }, [recommendations, routeInfo, mapLoaded])

  // Show error message if map fails to load
  if (mapError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-red-500 p-4 bg-white rounded shadow">
          <p>{mapError}</p>
          <p className="text-sm mt-2">
            Esto puede deberse a límites de tasa de la API de Mapbox. Por favor, intenta de nuevo más tarde.
          </p>
        </div>
      </div>
    )
  }

  return <div ref={mapContainer} className="w-full h-full" />
}
