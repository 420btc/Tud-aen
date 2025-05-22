"use client"

import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import type { Recommendation } from "@/lib/types"

interface MapViewProps {
  coordinates: [number, number] | null
  recommendations: Recommendation[]
  routeInfo: any | null
  selectedRecommendation: Recommendation | null
}

export function MapView({ coordinates, recommendations, routeInfo, selectedRecommendation }: MapViewProps) {
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

  // Add markers for each recommendation and handle selected recommendation
  useEffect(() => {
    if (!map.current || !mapLoaded || !recommendations.length) return

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    // Add a marker for each recommendation
    recommendations.forEach((rec, index) => {
      // Create marker element
      const el = document.createElement('div')
      el.className = 'marker cursor-pointer'
      el.innerHTML = `
        <div class="relative">
          <div class="bg-${selectedRecommendation?.name === rec.name ? 'green' : 'blue'}-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shadow-lg border-2 border-white transition-colors">
            ${index + 1}
          </div>
        </div>
      `

      // Add marker to map
      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'bottom'
      })
        .setLngLat([rec.coordinates[0], rec.coordinates[1]])
        .addTo(map.current!)

      // Add popup
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div class="text-black">
          <h3 class="font-bold">${rec.name}</h3>
          <p class="text-sm">${rec.address}</p>
        </div>
      `)

      marker.setPopup(popup)
      markersRef.current.push(marker)

      // If this is the selected recommendation, fly to it and open popup
      if (selectedRecommendation?.name === rec.name && map.current) {
        map.current.flyTo({
          center: [rec.coordinates[0], rec.coordinates[1]],
          zoom: 14,
          essential: true
        });
        
        // Open the popup after the map has finished moving
        const popup = marker.getPopup();
        if (popup) {
          setTimeout(() => {
            if (!popup.isOpen()) {
              marker.togglePopup();
            }
          }, 1000);
        }
      }
    })

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
  }, [mapLoaded, recommendations, routeInfo, selectedRecommendation])

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
