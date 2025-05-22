"use client"

import { useState } from "react"
import type { Recommendation } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MapPin, Clock, Star, ExternalLink, Route as RouteIcon, X, Info, Map as MapIcon } from "lucide-react"

// Extend the Recommendation type to include missing properties
type ExtendedRecommendation = Recommendation & {
  rating?: number;
  website?: string;
  additionalInfo?: string;
}

interface RecommendationsListProps {
  recommendations: Recommendation[]
  onRecommendationClick: (recommendation: Recommendation) => void
  selectedRecommendation: Recommendation | null
}

export function RecommendationsList({ recommendations, onRecommendationClick, selectedRecommendation }: RecommendationsListProps) {
  const [selectedCard, setSelectedCard] = useState<ExtendedRecommendation | null>(null)

  const handleCardClick = (recommendation: ExtendedRecommendation) => {
    setSelectedCard(recommendation)
  }
  return (
    <>
      <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
        {recommendations.map((rec, index) => (
          <Card 
            key={index} 
            className={`border-2 transition-all duration-300 flex-shrink-0 w-64 h-80 flex flex-col cursor-pointer ${selectedRecommendation?.name === rec.name ? 'border-blue-400 bg-gradient-to-br from-blue-900/90 to-blue-950/90' : 'border-gray-700 bg-gradient-to-br from-gray-900 to-blue-950/80 hover:from-gray-800 hover:to-blue-900/80'}`}
            onClick={() => handleCardClick(rec)}
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
              <p className="text-xs text-gray-300 mb-2 line-clamp-3 flex-1">{rec.description}</p>
              {rec.tips && (
                <div className="flex items-start text-xs text-gray-400 mb-2">
                  <Info className="h-3.5 w-3.5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{rec.tips}</span>
                </div>
              )}
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
                  <MapIcon className="h-3.5 w-3.5" />
                  <span>Ver en mapa</span>
                </button>
              </div>

            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de detalles */}
      <Dialog open={!!selectedCard} onOpenChange={(open) => !open && setSelectedCard(null)}>
        <DialogContent className="sm:max-w-[600px] bg-gray-900 border-2 border-gray-700 rounded-xl p-0 overflow-hidden">
          {selectedCard && (
            <>
              <DialogHeader className="border-b border-gray-800 p-4">
                <div className="flex justify-between items-center">
                  <DialogTitle className="text-xl text-white">{selectedCard.name}</DialogTitle>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full hover:bg-gray-800"
                    onClick={() => setSelectedCard(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center text-sm text-gray-400 mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>{selectedCard.address}</span>
                </div>
              </DialogHeader>
              
              <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-2 text-blue-400" />
                    <div>
                      <div className="text-gray-400">Tiempo recomendado</div>
                      <div className="text-white">{selectedCard.recommendedTime || 'No especificado'}</div>
                    </div>
                  </div>
                  <div className="flex items-center text-sm">
                    <Star className="h-4 w-4 mr-2 text-yellow-400" />
                    <div>
                      <div className="text-gray-400">Valoración</div>
                      <div className="text-white">{selectedCard.rating ? `${selectedCard.rating}/5` : 'No disponible'}</div>
                    </div>
                  </div>
                </div>

                {/* Descripción */}
                <div>
                  <h3 className="text-sm font-medium text-blue-300 mb-2">Descripción</h3>
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <p className="text-gray-200 text-sm whitespace-pre-line">
                      {selectedCard.description || 'No hay descripción disponible.'}
                    </p>
                  </div>
                </div>

                {/* Información Adicional */}
                {(selectedCard.additionalInfo || selectedCard.tips) && (
                  <div>
                    <h3 className="text-sm font-medium text-blue-300 mb-2">
                      {selectedCard.additionalInfo ? 'Información Adicional' : 'Consejos'}
                    </h3>
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <p className="text-gray-200 text-sm whitespace-pre-line">
                        {selectedCard.additionalInfo || selectedCard.tips}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-800 p-4 flex justify-between">
                <Button 
                  variant="outline" 
                  className="bg-blue-900/30 border-blue-700 text-blue-300 hover:bg-blue-800/40 hover:text-white"
                  onClick={() => {
                    onRecommendationClick(selectedCard);
                    setSelectedCard(null);
                  }}
                >
                  <RouteIcon className="h-4 w-4 mr-2" />
                  Ver en el mapa
                </Button>
                {selectedCard.website && (
                  <a 
                    href={selectedCard.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-400 hover:text-blue-300"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Visitar sitio web
                  </a>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
