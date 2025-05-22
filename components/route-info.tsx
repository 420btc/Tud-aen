"use client"

import type { Recommendation } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Car, Clock, Route } from "lucide-react"

interface RouteInfoProps {
  routeInfo: any
  recommendations: Recommendation[]
}

export function RouteInfo({ routeInfo, recommendations }: RouteInfoProps) {
  if (!routeInfo || !routeInfo.routes || routeInfo.routes.length === 0) {
    return null
  }

  const route = routeInfo.routes[0]

  // Add null check for route properties
  if (!route || typeof route.duration !== "number" || typeof route.distance !== "number") {
    return null
  }

  const durationInMinutes = Math.round(route.duration / 60)
  const distanceInKm = (route.distance / 1000).toFixed(1)

  // Determine if the route is walkable (less than 5km)
  const isWalkable = route.distance < 5000

  return (
    <Card className="border-2 border-gray-700 bg-gradient-to-br from-gray-900 to-blue-950/80 backdrop-blur-sm flex-shrink-0 w-full h-full flex flex-col">
      <CardHeader className="p-3 pb-1">
        <div className="flex items-center">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold mr-3">
            <Route className="h-4 w-4" />
          </div>
          <CardTitle className="text-lg text-white">Resumen Ruta</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 flex-1 flex flex-col">
        <div className="space-y-2 text-gray-200 flex-1">
          <div className="flex items-start mb-2">
            <Clock className="h-4 w-4 text-blue-400 mr-2 mt-1 flex-shrink-0" />
            <div>
              <div className="text-sm text-white">Duración: {durationInMinutes} min</div>
              <div className="text-xs text-gray-400">Distancia: {distanceInKm} km</div>
            </div>
          </div>
          
          <div className="flex items-center mb-3">
            <Car className="h-4 w-4 text-blue-400 mr-2" />
            <span className="text-sm">
              <span className="text-white">{isWalkable ? "A pie 🚶" : "En coche 🚗"}</span>
            </span>
          </div>

          <div className="mt-2 border-t border-gray-700 pt-2">
            <h4 className="text-sm font-medium text-blue-300 mb-1">Recorrido:</h4>
            <div className="space-y-1 max-h-36 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-blue-900 scrollbar-track-transparent">
              {recommendations.map((rec, index) => (
                <div key={index} className="flex items-start text-xs">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold mr-2 mt-0.5 flex-shrink-0">
                    {index + 1}
                  </span>
                  <div className="truncate">
                    <div className="text-white truncate">{rec.name}</div>
                    <div className="text-gray-400 text-xs">{rec.recommendedTime}</div>
                  </div>
                </div>
              ))}
              <div className="flex items-start text-xs mt-2 pt-1 border-t border-gray-700">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-900/60 text-white text-xs font-bold mr-2 mt-0.5 flex-shrink-0">
                  {recommendations.length + 1}
                </span>
                <div>
                  <div className="text-white">Regreso al inicio</div>
                  <div className="text-gray-400 text-xs">Punto de partida</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
