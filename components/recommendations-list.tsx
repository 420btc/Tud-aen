"use client"

import type { Recommendation } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Clock, Info } from "lucide-react"

interface RecommendationsListProps {
  recommendations: Recommendation[]
}

export function RecommendationsList({ recommendations }: RecommendationsListProps) {
  return (
    <div className="space-y-4">
      {recommendations.map((rec, index) => (
        <Card key={index} className="border-gray-700 bg-gradient-to-br from-gray-900 to-blue-950/80 backdrop-blur-sm hover:from-gray-800 hover:to-blue-900/80 transition-all duration-300">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold mr-3">
                {index + 1}
              </div>
              <CardTitle className="text-lg text-white">{rec.name}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-gray-200">
            <div className="flex items-start mb-2">
              <MapPin className="h-4 w-4 text-blue-400 mr-2 mt-1 flex-shrink-0" />
              <CardDescription className="text-gray-300">{rec.address}</CardDescription>
            </div>
            <p className="text-sm text-gray-300 mb-3">{rec.description}</p>
            <div className="flex items-center text-sm text-blue-400">
              <Clock className="h-4 w-4 mr-1" />
              <span>Tiempo recomendado: {rec.recommendedTime}</span>
            </div>
            {rec.tips && (
              <div className="flex items-start mt-2 text-sm text-gray-300">
                <Info className="h-4 w-4 text-blue-400 mr-2 mt-1 flex-shrink-0" />
                <span>{rec.tips}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
