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
    <Card className="mt-6 border-blue-200 bg-blue-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-blue-800 flex items-center">
          <Route className="mr-2 h-5 w-5" />
          Información de la ruta
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center">
            <Clock className="h-4 w-4 text-blue-600 mr-2" />
            <span className="text-sm">
              Duración total: <strong>{durationInMinutes} minutos</strong>
            </span>
          </div>

          <div className="flex items-center">
            <Route className="h-4 w-4 text-blue-600 mr-2" />
            <span className="text-sm">
              Distancia total: <strong>{distanceInKm} km</strong>
            </span>
          </div>

          <div className="flex items-center">
            <Car className="h-4 w-4 text-blue-600 mr-2" />
            <span className="text-sm">
              Modo recomendado: <strong>{isWalkable ? "A pie 🚶" : "En coche 🚗"}</strong>
            </span>
          </div>

          {recommendations && recommendations.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-blue-700 mb-2">Circuito completo de visita:</h4>
              <ol className="list-decimal list-inside text-sm space-y-1 pl-2">
                {recommendations.map((rec, index) => (
                  <li key={index} className="text-gray-700">
                    {rec.name} <span className="text-gray-500">({rec.recommendedTime})</span>
                  </li>
                ))}
                <li className="text-gray-700">
                  {recommendations[0].name} <span className="text-gray-500">(Regreso al punto inicial)</span>
                </li>
              </ol>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
