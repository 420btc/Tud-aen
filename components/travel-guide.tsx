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
    <div className="relative h-screen">
      <div className="absolute inset-0 flex flex-col md:flex-row h-full">
        <div className="w-full md:w-1/3 p-6 overflow-y-auto bg-black/90 backdrop-blur-sm border-r border-gray-800 text-white">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-white mb-1">TuDíaEn</h1>
              <p className="text-gray-300">Descubre los mejores lugares para visitar</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-gray-800"
              onClick={handleMenuClick}
              aria-label="Menú principal"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
          <div className="mb-6">
            <SearchBar onSearch={handleSearch} isLoading={isLoading} />
          </div>

          {error && <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">{error}</div>}

          {recommendations && recommendations.length > 0 && (
            <>
              <h2 className="text-xl font-semibold mt-6 mb-4 text-blue-800">Lugares recomendados en {location}</h2>
              <RecommendationsList recommendations={recommendations} />

              {routeInfo && routeInfo.routes && routeInfo.routes.length > 0 && (
                <RouteInfo routeInfo={routeInfo} recommendations={recommendations} />
              )}
            </>
          )}
        </div>

        <div className="w-full md:w-2/3 h-[50vh] md:h-full">
          <MapView coordinates={coordinates} recommendations={recommendations || []} routeInfo={routeInfo} />
        </div>
      </div>
    </div>
  )
}
