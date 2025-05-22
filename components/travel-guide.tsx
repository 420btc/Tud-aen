"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Menu } from "lucide-react"
import { Button } from "./ui/button"
import { MapView } from "./map-view"
import { SearchBar } from "./search-bar"
import { RecommendationsList } from "./recommendations-list"
import { RouteInfo } from "./route-info"
import type { Recommendation } from "@/lib/types"

export function TravelGuide() {
  const [isLoading, setIsLoading] = useState(false)
  const [location, setLocation] = useState("")
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [routeInfo, setRouteInfo] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Function to retry API calls with exponential backoff
  const fetchWithRetry = async (url: string, options: RequestInit, retries = 3, delay = 1000) => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(url, options)

        if (response.status === 429) {
          console.warn(`Rate limit hit on attempt ${attempt + 1}, waiting ${delay}ms before retry`)
          await new Promise((resolve) => setTimeout(resolve, delay))
          // Increase delay for next attempt (exponential backoff)
          delay *= 2
          continue
        }

        return response
      } catch (error) {
        if (attempt === retries - 1) throw error
        await new Promise((resolve) => setTimeout(resolve, delay))
        delay *= 2
      }
    }
    throw new Error("Max retries reached")
  }

  // Update the handleSearch function to include all 5 points in the route
  const handleSearch = async (searchLocation: string) => {
    setIsLoading(true)
    setError(null)
    setLocation(searchLocation)
    setRecommendations([])
    setRouteInfo(null)

    try {
      // 1. Get coordinates from location name using Mapbox Geocoding API
      console.log("Geocoding search location:", searchLocation)

      const geocodingResponse = await fetchWithRetry(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchLocation)}.json?access_token=${
          process.env.NEXT_PUBLIC_MAPBOX_TOKEN
        }&limit=1`,
        {
          headers: {
            "Cache-Control": "max-age=3600", // Add caching headers
          },
        },
      )

      if (!geocodingResponse.ok) {
        throw new Error(`Error geocoding location: ${geocodingResponse.status} ${geocodingResponse.statusText}`)
      }

      const geocodingData = await geocodingResponse.json()

      if (geocodingData.features && geocodingData.features.length > 0) {
        const [lng, lat] = geocodingData.features[0].center
        setCoordinates([lng, lat])
        console.log(`Main location coordinates: [${lng}, ${lat}]`)

        // 2. Get recommendations from our API
        console.log("Fetching recommendations for:", searchLocation)
        const recommendationsResponse = await fetch("/api/recommendations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            location: searchLocation,
            coordinates: [lng, lat],
          }),
        })

        if (!recommendationsResponse.ok) {
          const errorData = await recommendationsResponse.json()
          throw new Error(`Error getting recommendations: ${errorData.error || recommendationsResponse.statusText}`)
        }

        const recommendationsData = await recommendationsResponse.json()

        // Add null check for recommendations
        if (recommendationsData && recommendationsData.recommendations) {
          setRecommendations(recommendationsData.recommendations)
          console.log("Received recommendations:", recommendationsData.recommendations.length)

          // 3. Get route information if we have recommendations
          if (recommendationsData.recommendations.length > 1) {
            try {
              // Extract coordinates for the Mapbox Directions API
              const waypoints = recommendationsData.recommendations
                .map((rec: Recommendation) => {
                  if (!rec.coordinates) {
                    console.error("Missing coordinates for recommendation:", rec)
                    return null
                  }
                  return rec.coordinates
                })
                .filter(Boolean) // Remove any null values

              if (waypoints.length < 2) {
                throw new Error("Not enough valid coordinates to create a route")
              }

              // Create a circular route by adding the first point at the end if we have at least 2 points
              if (waypoints.length >= 2) {
                // Add the first point at the end to create a circular route
                waypoints.push(waypoints[0])
              }

              // Format waypoints for the Directions API
              const waypointsString = waypoints.map((wp: [number, number]) => wp.join(",")).join(";")
              console.log("Route waypoints:", waypointsString)

              // Call the Mapbox Directions API with optimized parameters
              console.log("Fetching route for waypoints")
              const routeUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${waypointsString}?geometries=geojson&overview=full&steps=true&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`

              // Use the retry function for the directions API
              const routeResponse = await fetchWithRetry(routeUrl, {
                headers: {
                  "Cache-Control": "max-age=3600", // Add caching headers
                },
              })

              if (!routeResponse.ok) {
                const routeErrorText = await routeResponse.text()
                console.error("Route API error response:", routeErrorText)
                throw new Error(`Error getting route: ${routeResponse.status} ${routeResponse.statusText}`)
              }

              const routeData = await routeResponse.json()

              if (!routeData.routes || routeData.routes.length === 0) {
                console.error("No routes returned:", routeData)
                throw new Error("No route found between the locations")
              }

              console.log("Route data received:", routeData)
              setRouteInfo(routeData)
            } catch (routeError) {
              console.error("Error fetching route:", routeError)
              const errorMessage = routeError instanceof Error ? routeError.message : 'Error desconocido al crear la ruta'
              setError(`Error creando ruta: ${errorMessage}`)
              setRouteInfo(null)
            }
          }
        } else {
          console.error("Invalid recommendations data:", recommendationsData)
          setRecommendations([])
          setError("No se pudieron obtener recomendaciones para esta ubicación")
        }
      } else {
        console.error("Location not found")
        setCoordinates(null)
        setRecommendations([])
        setError("No se pudo encontrar la ubicación especificada")
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      setRecommendations([])
      setRouteInfo(null)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setError(`Error: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  const router = useRouter()

  const handleMenuClick = () => {
    router.push('/')
  }

  return (
    <div className="relative bg-black text-white">
      {/* Header with search (fijo y fino) */}
      <header className="fixed top-0 left-0 w-full z-50 p-1 bg-black/90 backdrop-blur-sm border-b border-gray-800 h-12 flex items-center">
        <div className="w-full px-4 flex justify-between items-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-white bg-clip-text text-transparent">YourDayIn</h1>
          <SearchBar onSearch={handleSearch} isLoading={isLoading} />
          <Button 
            variant="ghost" 
            size="sm"
            className="text-white hover:bg-gray-800 h-8 w-8 p-0"
            onClick={handleMenuClick}
            aria-label="Menú principal"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Map section (ocupa toda la pantalla menos el header) */}
      <div className="relative w-full h-screen bg-black">
        <MapView coordinates={coordinates} recommendations={recommendations || []} routeInfo={routeInfo} />

        {/* Recommendations overlay */}
        {(recommendations && recommendations.length > 0) && (
          <div className="absolute left-1/2 bottom-6 transform -translate-x-1/2 z-20 w-full flex flex-col items-center pointer-events-none">
            <h2 className="text-lg font-bold text-white mb-2 text-center pointer-events-auto bg-black/60 rounded px-4 py-1">
              Lugares recomendados en {location}
            </h2>
            <div className="flex flex-nowrap overflow-x-auto gap-4 pb-2 scrollbar-hide pointer-events-auto max-w-3xl mx-auto">
              {recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 w-56 h-48 bg-gray-800 bg-opacity-95 rounded-lg overflow-hidden shadow-lg pointer-events-auto flex flex-col justify-between"
                >
                  <div className="p-3 flex flex-col justify-between h-full">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold shadow">{index + 1}</span>
                      <h3 className="font-bold text-white text-base truncate flex-1">{rec.name}</h3>
                    </div>
                    <p className="text-gray-300 text-xs mb-1 line-clamp-2">{rec.description}</p>
                    <p className="text-gray-400 text-xs truncate">📍 {rec.address}</p>
                    <p className="text-yellow-400 text-xs mt-1">⏱️ {rec.recommendedTime}</p>
                    <p className="text-blue-300 text-xs mt-1 italic line-clamp-2">💡 {rec.tips}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Route info panel flotante */}
        {routeInfo && routeInfo.routes && routeInfo.routes.length > 0 && (
          <div className="fixed bottom-0 right-0 z-50 w-80 max-h-96 bg-gray-900 bg-opacity-95 rounded-tl-lg shadow-lg overflow-y-auto pointer-events-auto">
            <div className="p-4">
              <RouteInfo routeInfo={routeInfo} recommendations={recommendations} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
