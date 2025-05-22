import { type NextRequest, NextResponse } from "next/server"
import type { Recommendation } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    const { location, coordinates } = await request.json()

    if (!location || !coordinates) {
      return NextResponse.json({ error: "Location and coordinates are required" }, { status: 400 })
    }

    // Prepare the prompt for OpenAI - explicitly ask for raw JSON
    const prompt = `
      Act as a professional tour guide for ${location}. 
      Provide exactly 5 must-visit tourist attractions or emblematic places in this area.
      
      For each place, include:
      1. Name of the place (be specific and accurate with the official name)
      2. A brief description (2-3 sentences)
      3. Address or location (be as specific and accurate as possible with the full address)
      4. Recommended time to spend there
      5. A helpful tip for visitors
      
      Format your response as a JSON array with the following structure for each place:
      {
        "name": "Place name",
        "description": "Brief description",
        "address": "Address or location",
        "recommendedTime": "e.g., 1-2 hours",
        "tips": "A helpful tip"
      }
      
      IMPORTANT: Return ONLY the raw JSON array without any markdown formatting, code blocks, or additional text.
    `

    // Call OpenAI API
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a professional tour guide with extensive knowledge of global tourist destinations. You MUST respond with raw JSON only, no markdown formatting or explanations.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: "json_object" }, // Force JSON response format
      }),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json()
      console.error("OpenAI API error:", errorData)
      return NextResponse.json({ error: "Failed to get recommendations from AI" }, { status: 500 })
    }

    const openaiData = await openaiResponse.json()

    // Check if we have a valid response from OpenAI
    if (!openaiData || !openaiData.choices || !openaiData.choices[0] || !openaiData.choices[0].message) {
      console.error("Invalid response from OpenAI:", openaiData)
      return NextResponse.json({ error: "Invalid response from AI" }, { status: 500 })
    }

    let recommendations: Recommendation[] = []

    try {
      // Parse the response from OpenAI with improved error handling
      const content = openaiData.choices[0].message.content
      console.log("Raw OpenAI response:", content)

      // Clean up the content to handle markdown code blocks
      const jsonContent = content
        .replace(/```json\s*/g, "") // Remove \`\`\`json
        .replace(/```\s*$/g, "") // Remove closing \`\`\`
        .trim()

      // If the content is wrapped in an object with a "recommendations" field, extract it
      try {
        const parsedContent = JSON.parse(jsonContent)
        if (parsedContent.recommendations && Array.isArray(parsedContent.recommendations)) {
          recommendations = parsedContent.recommendations
        } else if (Array.isArray(parsedContent)) {
          recommendations = parsedContent
        } else {
          // Look for an array in any property
          for (const key in parsedContent) {
            if (Array.isArray(parsedContent[key])) {
              recommendations = parsedContent[key]
              break
            }
          }
        }
      } catch (parseError) {
        console.error("Error parsing cleaned JSON:", parseError)

        // Try to extract JSON array using regex as a last resort
        const arrayMatch = jsonContent.match(/\[\s*\{[\s\S]*\}\s*\]/)
        if (arrayMatch) {
          recommendations = JSON.parse(arrayMatch[0])
        } else {
          throw new Error("Could not parse JSON from OpenAI response")
        }
      }

      // Validate that recommendations is an array
      if (!Array.isArray(recommendations)) {
        throw new Error("OpenAI did not return an array of recommendations")
      }

      console.log("Parsed recommendations:", recommendations)

      // Limit to 5 recommendations
      recommendations = recommendations.slice(0, 5)

      // Geocode all 5 recommendations with improved rate limit handling
      const recommendationsWithCoordinates = []

      // Function to retry geocoding with exponential backoff
      const geocodeWithRetry = async (query, retries = 3, delay = 1000) => {
        for (let attempt = 0; attempt < retries; attempt++) {
          try {
            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${
                process.env.NEXT_PUBLIC_MAPBOX_TOKEN
              }&limit=1&proximity=${coordinates[0]},${coordinates[1]}`,
              {
                headers: {
                  "Cache-Control": "max-age=3600", // Add caching headers
                },
              },
            )

            if (response.status === 429) {
              console.warn(`Rate limit hit on attempt ${attempt + 1}, waiting ${delay}ms before retry`)
              await new Promise((resolve) => setTimeout(resolve, delay))
              // Increase delay for next attempt (exponential backoff)
              delay *= 2
              continue
            }

            if (!response.ok) {
              throw new Error(`Geocoding API error: ${response.status} ${response.statusText}`)
            }

            return await response.json()
          } catch (error) {
            if (attempt === retries - 1) throw error
            await new Promise((resolve) => setTimeout(resolve, delay))
            delay *= 2
          }
        }
      }

      // Process all 5 recommendations with proper spacing between requests
      for (let i = 0; i < recommendations.length; i++) {
        const rec = recommendations[i]
        try {
          if (!rec.name || !rec.address) {
            // If recommendation is missing required fields, use default values with offset
            const offset = (i + 1) * 0.005
            recommendationsWithCoordinates.push({
              name: rec.name || "Unknown Place",
              description: rec.description || "No description available",
              address: rec.address || "No address available",
              recommendedTime: rec.recommendedTime || "1 hour",
              tips: rec.tips || "No tips available",
              coordinates: [coordinates[0] + offset, coordinates[1] + offset] as [number, number],
            })
            continue
          }

          // Add a delay between geocoding requests to avoid rate limits
          if (i > 0) {
            await new Promise((resolve) => setTimeout(resolve, 1000)) // Increased delay to 1 second
          }

          // Improved geocoding query with more context
          const query = `${rec.name}, ${rec.address}, ${location}`
          console.log(`Geocoding query for place ${i + 1}: ${query}`)

          try {
            // Use the retry function for geocoding
            const geocodingData = await geocodeWithRetry(query)

            if (geocodingData.features && geocodingData.features.length > 0) {
              const feature = geocodingData.features[0]
              const [lng, lat] = feature.center

              console.log(`Successfully geocoded "${rec.name}" to [${lng}, ${lat}]`)

              recommendationsWithCoordinates.push({
                ...rec,
                coordinates: [lng, lat] as [number, number],
                geocodingResult: {
                  placeName: feature.place_name,
                  relevance: feature.relevance,
                },
              })
            } else {
              // Try a more general search if the specific one failed
              await new Promise((resolve) => setTimeout(resolve, 1000))

              const fallbackQuery = `${rec.name}, ${location}`
              console.log(`Using fallback query: ${fallbackQuery}`)

              const fallbackData = await geocodeWithRetry(fallbackQuery)

              if (fallbackData.features && fallbackData.features.length > 0) {
                const [lng, lat] = fallbackData.features[0].center
                console.log(`Used fallback geocoding for "${rec.name}" to [${lng}, ${lat}]`)
                recommendationsWithCoordinates.push({
                  ...rec,
                  coordinates: [lng, lat] as [number, number],
                })
              } else {
                // If all geocoding attempts fail, use the main coordinates with a small offset
                const offset = (i + 1) * 0.005
                console.log(`Using offset coordinates for "${rec.name}"`)
                recommendationsWithCoordinates.push({
                  ...rec,
                  coordinates: [coordinates[0] + offset, coordinates[1] + offset] as [number, number],
                })
              }
            }
          } catch (geocodingError) {
            console.error(`Error geocoding "${rec.name}":`, geocodingError)
            // Use offset coordinates as fallback
            const offset = (i + 1) * 0.005
            recommendationsWithCoordinates.push({
              ...rec,
              coordinates: [coordinates[0] + offset, coordinates[1] + offset] as [number, number],
              geocodingError: String(geocodingError),
            })
          }
        } catch (error) {
          console.error(`Error processing recommendation "${rec.name}":`, error)
          // Fallback to main coordinates with offset
          const offset = (i + 1) * 0.005
          recommendationsWithCoordinates.push({
            ...rec,
            coordinates: [coordinates[0] + offset, coordinates[1] + offset] as [number, number],
            processingError: String(error),
          })
        }
      }

      // Log the final recommendations with coordinates for debugging
      console.log(
        "Final recommendations with coordinates:",
        recommendationsWithCoordinates.map((r) => ({
          name: r.name,
          coordinates: r.coordinates,
        })),
      )

      return NextResponse.json({ recommendations: recommendationsWithCoordinates })
    } catch (error) {
      console.error("Error processing recommendations:", error)
      return NextResponse.json({ error: "Failed to process recommendations: " + error.message }, { status: 500 })
    }
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "Internal server error: " + error.message }, { status: 500 })
  }
}
