"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Menu, MapPin, Search, Clock, Loader2 } from "lucide-react"
import { Button } from "./ui/button"
import { MapView } from "./map-view"
import { SearchBar } from "./search-bar"
import { RecommendationsList } from "./recommendations-list"
import { RouteInfo } from "./route-info"
import { LoadingModal } from "./ui/loading-modal"
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
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [loadingLogs, setLoadingLogs] = useState<string[]>([])
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  // Function to retry API calls with exponential backoff
  const fetchWithRetry = async (url: string, options: RequestInit, retries = 3, delay = 1000) => {
    // Add the abort signal to the request options
    const controller = new AbortController()
    const signal = controller.signal
    
    // If there's a global abort controller, use its signal
    if (abortController) {
      signal.addEventListener('abort', () => controller.abort())
    }
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
  const addLoadingLog = (message: string) => {
    setLoadingLogs(prev => [...prev, message])
  }

  const handleSearch = async (searchLocation: string) => {
    // Cancel any ongoing search
    if (abortController) {
      abortController.abort('Nueva búsqueda iniciada')
      addLoadingLog('⚠️ Cancelando búsqueda anterior...')
    }
    
    // Create new AbortController for this search
    const controller = new AbortController()
    setAbortController(controller)
    
    setSelectedRecommendation(null) // Reset selected recommendation on new search
    setIsLoading(true)
    setIsGenerating(true)
    setLoadingLogs([])
    setLoadingProgress(0)
    setError(null)
    setLocation(searchLocation)
    setRecommendations([])
    setRouteInfo(null)
    
    // Clear any existing timeout
    if ((window as any).loadingTimeout) {
      clearTimeout((window as any).loadingTimeout)
    }
    addLoadingLog(`🔍 Buscando ubicación: ${searchLocation}...`)

    try {
      // Check if the search was aborted
      if (abortController?.signal.aborted) {
        addLoadingLog('❌ Búsqueda cancelada')
        return
      }

      // 1. Get coordinates from location name using Mapbox Geocoding API
      addLoadingLog(`🔍 Buscando coordenadas para: ${searchLocation}...`)
      setLoadingProgress(10)

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
        addLoadingLog(`📍 Coordenadas obtenidas: ${lat.toFixed(6)}, ${lng.toFixed(6)}`)
        addLoadingLog("✅ Ubicación encontrada en el mapa")
        setLoadingProgress(30)

        // 2. Get recommendations from our API
        addLoadingLog("🔍 Buscando lugares recomendados cercanos...")
        addLoadingLog(`🌍 Radio de búsqueda: 5 km`)
        addLoadingLog(`📌 Puntos de interés: Atracciones turísticas, restaurantes, miradores`)
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
          const validRecommendations = recommendationsData.recommendations.filter(
            (rec: Recommendation) => rec.coordinates && rec.coordinates.length === 2
          )
          setRecommendations(validRecommendations)
          console.log("Received recommendations:", validRecommendations.length)
          setLoadingProgress(60)
          
          // Log each recommendation with coordinates
          addLoadingLog(`✅ ${validRecommendations.length} lugares encontrados:`)
          validRecommendations.forEach((rec: Recommendation) => {
            if (rec.coordinates) {
              const [lng, lat] = rec.coordinates;
              addLoadingLog(`📍 ${rec.name} (${rec.recommendedTime})`)
              addLoadingLog(`   → Coordenadas: ${lat.toFixed(6)}, ${lng.toFixed(6)}`)
              if (rec.description) {
                addLoadingLog(`   → ${rec.description}`)
              }
            } else {
              addLoadingLog(`⚠️ ${rec.name} (Coordenadas no disponibles)`)
            }
          })

          // 3. Get route information if we have recommendations
          if (validRecommendations.length > 0) {
            addLoadingLog("🛣️ Calculando ruta óptima entre los lugares...")
            setLoadingProgress(70)
            try {
              // Extract coordinates for the Mapbox Directions API
              const waypoints = validRecommendations
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
              
              addLoadingLog("🛣 Calculando ruta óptima entre los puntos...")
              addLoadingLog(`📍 Puntos de ruta: ${waypoints.length} paradas`)

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
              setLoadingProgress(90)
              const distance = (routeData.routes[0].distance / 1000).toFixed(1)
              const duration = Math.round(routeData.routes[0].duration / 60)
              addLoadingLog(`✅ Ruta calculada exitosamente`)
              addLoadingLog(`📏 Distancia total: ${distance} km`)
              addLoadingLog(`⏱ Tiempo estimado: ${duration} minutos`)
              addLoadingLog("🚀 Cargando mapa con la ruta...")
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
      // Don't show error if the search was aborted
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error("Error fetching data:", error)
        setRecommendations([])
        setRouteInfo(null)
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        setError(`Error: ${errorMessage}`)
      } else {
        addLoadingLog('🔄 Nueva búsqueda iniciada')
      }
    } finally {
      // Only update loading states if this wasn't an aborted request
      if (!abortController?.signal.aborted) {
        setIsLoading(false)
        
        // Set loading to 100% and schedule modal close after 3 seconds
        setLoadingProgress(100);
        
        // Close the loading modal after 3 seconds
        (window as any).loadingTimeout = setTimeout(() => {
          setIsGenerating(false);
        }, 3000);
      }
    }
  }

  const router = useRouter()

  const handleMenuClick = () => {
    router.push('/')
  }

  return (
    <div className="relative bg-black text-white">
      {/* Loading Modal - Always render but control visibility with isOpen */}
      <LoadingModal 
        isOpen={isGenerating} 
        logs={loadingLogs} 
        progress={loadingProgress} 
        onClose={() => {
          setIsGenerating(false);
          setLoadingProgress(0);
          setLoadingLogs([]);
        }}
      />
      
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
            
            {/* Barra de búsqueda - Oculto en móviles por defecto */}
            <div className={`${showMobileSearch ? 'block absolute top-16 left-0 right-0 px-4 z-50' : 'hidden'} md:block md:static md:px-0 md:ml-4 sm:ml-6 w-full md:w-64 lg:w-96`}>
              <SearchBar onSearch={(query) => {
                handleSearch(query);
                setShowMobileSearch(false);
              }} isLoading={isLoading} />
            </div>
          </div>
          
          {/* Botón de menú con texto */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Botón de búsqueda solo en móvil */}
            <button 
              className="md:hidden text-white hover:bg-white/10 p-2 rounded-full transition-colors"
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              aria-label={showMobileSearch ? 'Ocultar búsqueda' : 'Mostrar búsqueda'}
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
        
        {/* Panel de ruta y recomendaciones */}
        {routeInfo && routeInfo.routes && routeInfo.routes.length > 0 && (
          <>
            {/* Versión móvil - Carrusel */}
            <div className="md:hidden fixed bottom-4 left-0 right-0 z-30 px-4">
              <div className="flex overflow-x-auto pb-4 space-x-4 snap-x snap-mandatory hide-scrollbar">
                {/* Tarjeta de resumen de ruta */}
                <div className="flex-shrink-0 w-[85%] sm:w-72 snap-start">
                  <RouteInfo routeInfo={routeInfo} recommendations={recommendations} />
                </div>
                
                {/* Tarjetas de recomendaciones */}
                {recommendations.map((rec, index) => (
                  <div key={index} className="flex-shrink-0 w-[85%] sm:w-72 snap-start">
                    <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg p-4 h-full">
                      <h3 className="text-white font-medium mb-2">{rec.name}</h3>
                      <p className="text-sm text-gray-300 mb-2">{rec.description}</p>
                      <div className="flex items-center text-xs text-blue-400">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{rec.recommendedTime}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Versión escritorio - Tarjeta fija */}
            <div className="hidden md:block fixed bottom-4 right-4 z-30 w-80 h-auto max-h-[70vh] overflow-y-auto">
              <RouteInfo routeInfo={routeInfo} recommendations={recommendations} />
            </div>
          </>
        )}
      </div>
      
      {/* Estilos para el carrusel móvil */}
      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .snap-x {
          scroll-snap-type: x mandatory;
        }
        .snap-start {
          scroll-snap-align: start;
        }
      `}</style>
    </div>
  )
}
