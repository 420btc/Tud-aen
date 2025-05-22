"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Menu, MapPin, Search } from "lucide-react"
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
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null)
  const [showRecommendations, setShowRecommendations] = useState(false)

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

  // Handle when a recommendation card is clicked
  const handleRecommendationClick = (recommendation: Recommendation) => {
    setSelectedRecommendation(recommendation);
  };

  // Update the handleSearch function to include all 5 points in the route
  const handleSearch = async (searchLocation: string) => {
    setSelectedRecommendation(null); // Reset selected recommendation on new search
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
      {/* Header transparente */}
      <header className="fixed top-0 left-0 w-full z-50 p-1 bg-black/20 backdrop-blur-sm border-b border-blue-400/20 h-16 flex items-center">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          {/* Contenido izquierdo (logo) */}
          <div className="flex items-center">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <MapPin className="h-6 w-6 sm:h-7 sm:w-7 text-blue-400" />
              <button 
                onClick={() => router.push('/')}
                className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-white bg-clip-text text-transparent hover:from-blue-300 hover:to-gray-200 transition-colors duration-200 cursor-pointer"
              >
                YourDayIn
              </button>
            </div>
            
            {/* Barra de búsqueda - Oculto en móviles */}
            <div className="hidden md:block ml-4 sm:ml-6 w-64 lg:w-96">
              <SearchBar onSearch={handleSearch} isLoading={isLoading} />
            </div>
          </div>
          
          {/* Botón de menú con texto */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Botón de búsqueda solo en móvil */}
            <button 
              className="md:hidden text-white hover:bg-white/10 p-2 rounded-full transition-colors"
              onClick={() => { /* Aquí puedes añadir la lógica para mostrar la barra de búsqueda en móvil */ }}
              aria-label="Buscar"
            >
              <Search className="h-5 w-5" />
            </button>
            
            {/* Botón de menú con texto */}
            <Button 
              variant="ghost" 
              size="sm"
              className="text-white hover:bg-white/10 h-10 px-3 sm:px-4 rounded-full transition-colors"
              onClick={handleMenuClick}
              aria-label="Menú principal"
            >
              <span className="hidden sm:inline-block mr-2">Menú</span>
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Map section (ocupa toda la pantalla menos el header) */}
      <div className="relative w-full h-screen bg-black">
        <MapView 
          coordinates={coordinates} 
          recommendations={recommendations} 
          routeInfo={routeInfo} 
          selectedRecommendation={selectedRecommendation} 
        />

        {/* Botón flotante para mostrar recomendaciones */}
        {recommendations && recommendations.length > 0 && !showRecommendations && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-30">
            <button
              onClick={() => setShowRecommendations(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-full shadow-lg flex items-center space-x-2 transition-all duration-200"
            >
              <span>Mostrar recomendaciones</span>
              <svg 
                className="w-4 h-4 transition-transform duration-200" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        )}

        {/* Panel de recomendaciones */}
        {recommendations && recommendations.length > 0 && showRecommendations && (
          <div className="fixed bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black to-transparent pt-4 pb-4">
            <div className="w-full px-4">
              <div className="flex justify-between items-center mb-3 px-2">
                <h2 className="text-lg font-bold text-white">
                  Lugares recomendados en {location}
                </h2>
                <button
                  onClick={() => setShowRecommendations(false)}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                  aria-label="Ocultar recomendaciones"
                >
                  <svg 
                    className="w-5 h-5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <RecommendationsList 
                recommendations={recommendations}
                onRecommendationClick={setSelectedRecommendation}
                selectedRecommendation={selectedRecommendation}
              />
            </div>
          </div>
        )}
        
        {/* Panel de ruta */}
        {routeInfo && routeInfo.routes && routeInfo.routes.length > 0 && (
          <div className="fixed bottom-4 right-4 z-30 w-80 h-80">
            <RouteInfo routeInfo={routeInfo} recommendations={recommendations} />
          </div>
        )}
      </div>
    </div>
  )
}
