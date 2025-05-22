"use client"

import { useState } from "react"
import type { Recommendation } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Clock, Info, Map } from "lucide-react"

interface RecommendationsListProps {
  recommendations: Recommendation[]
  onRecommendationClick: (recommendation: Recommendation) => void
  selectedRecommendation: Recommendation | null
}

export function RecommendationsList({ recommendations, onRecommendationClick, selectedRecommendation }: RecommendationsListProps) {
  return (
    <div className="flex flex-nowrap gap-4 overflow-x-auto pb-2 scrollbar-hide">
      {recommendations.map((rec, index) => (
        <Card 
          key={index} 
          className={`border-2 transition-all duration-300 flex-shrink-0 w-64 h-80 flex flex-col ${
            selectedRecommendation?.name === rec.name 
              ? 'border-blue-400 bg-gradient-to-br from-blue-900/90 to-blue-950/90' 
              : 'border-gray-700 bg-gradient-to-br from-gray-900 to-blue-950/80 hover:from-gray-800 hover:to-blue-900/80'
          }`}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold mr-3">
                {index + 1}
              </div>
              <CardTitle className="text-lg text-white">{rec.name}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-gray-200 pb-4 flex-1 flex flex-col">
            <div className="flex items-start mb-2">
              <MapPin className="h-4 w-4 text-blue-400 mr-2 mt-1 flex-shrink-0" />
              <CardDescription className="text-gray-300">{rec.address}</CardDescription>
            </div>
            <p className="text-xs text-gray-300 mb-3 line-clamp-4 flex-1">{rec.description}</p>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center text-sm text-blue-400">
                <Clock className="h-4 w-4 mr-1" />
                <span>Tiempo: {rec.recommendedTime}</span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onRecommendationClick(rec);
                }}
                className="inline-flex items-center gap-1 px-3 py-1 text-sm rounded-md bg-blue-600/80 hover:bg-blue-500/90 transition-all duration-200 text-white"
                title="Ver en el mapa"
              >
                <Map className="h-3.5 w-3.5" />
                <span>Ver en mapa</span>
              </button>
            </div>
            {rec.tips && (
              <div className="flex items-start mt-2 text-xs text-gray-300">
                <Info className="h-3.5 w-3.5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{rec.tips}</span>
              </div>
            )}

          </CardContent>
        </Card>
      ))}
    </div>
  )
}
