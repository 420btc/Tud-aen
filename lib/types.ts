export interface Recommendation {
  name: string
  description: string
  address: string
  recommendedTime: string
  tips: string
  coordinates: [number, number]
  geocodingResult?: {
    placeName: string
    relevance: number
    id: string
    type: string[]
  }
  geocodingError?: string
}
