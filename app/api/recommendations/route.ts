import { type NextRequest, NextResponse } from "next/server"
import type { Recommendation } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    const { location, coordinates } = await request.json()

    if (!location || !coordinates) {
      return NextResponse.json({ error: "Se requiere ubicación y coordenadas" }, { status: 400 })
    }

    // Preparar el prompt para OpenAI - pedir explícitamente JSON
    const prompt = `
      Actúa como un guía turístico profesional para ${location}. 
      Proporciona exactamente 5 atracciones turísticas o lugares emblemáticos que sean imperdibles en esta zona.
      
      Para cada lugar, incluye:
      1. Nombre del lugar (sé específico y preciso con el nombre oficial)
      2. Una breve descripción (2-3 oraciones)
      3. Dirección o ubicación (sé lo más específico y preciso posible con la dirección completa)
      4. Tiempo recomendado para la visita
      5. Un consejo útil para los visitantes
      
      Formatea tu respuesta como un arreglo JSON con la siguiente estructura para cada lugar:
      {
        "name": "Nombre del lugar",
        "description": "Descripción breve",
        "address": "Dirección o ubicación",
        "recommendedTime": "ej. 1-2 horas",
        "tips": "Un consejo útil"
      }
      
      IMPORTANTE: Devuelve SOLO el arreglo JSON sin formato markdown, bloques de código o texto adicional.
    `

    // Llamar a la API de OpenAI
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
              "Eres un guía turístico profesional con amplio conocimiento de destinos turísticos globales. DEBES responder ÚNICAMENTE con JSON sin formato, sin marcas de formato ni explicaciones.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: "json_object" }, // Forzar formato de respuesta JSON
      }),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json()
      console.error("Error en la API de OpenAI:", errorData)
      return NextResponse.json({ error: "Error al obtener recomendaciones de la IA" }, { status: 500 })
    }

    const openaiData = await openaiResponse.json()

    // Verificar si tenemos una respuesta válida de OpenAI
    if (!openaiData || !openaiData.choices || !openaiData.choices[0] || !openaiData.choices[0].message) {
      console.error("Respuesta no válida de OpenAI:", openaiData)
      return NextResponse.json({ error: "Respuesta no válida de la IA" }, { status: 500 })
    }

    let recommendations: Recommendation[] = []

    try {
      // Analizar la respuesta de OpenAI con manejo mejorado de errores
      const content = openaiData.choices[0].message.content
      console.log("Respuesta cruda de OpenAI:", content)

      // Limpiar el contenido para manejar bloques de código markdown
      const jsonContent = content
        .replace(/```json\s*/g, "") // Eliminar \`\`\`json
        .replace(/```\s*$/g, "") // Eliminar cierre de \`\`\`
        .trim()

      // Si el contenido está envuelto en un objeto con un campo "recommendations", extraerlo
      try {
        const parsedContent = JSON.parse(jsonContent)
        if (parsedContent.recommendations && Array.isArray(parsedContent.recommendations)) {
          recommendations = parsedContent.recommendations
        } else if (Array.isArray(parsedContent)) {
          recommendations = parsedContent
        } else {
          // Buscar un arreglo en cualquier propiedad
          for (const key in parsedContent) {
            if (Array.isArray(parsedContent[key])) {
              recommendations = parsedContent[key]
              break
            }
          }
        }
      } catch (parseError) {
        console.error("Error al analizar el JSON limpio:", parseError)

        // Intentar extraer un arreglo JSON usando regex como último recurso
        const arrayMatch = jsonContent.match(/\[\s*\{[\s\S]*\}\s*\]/)
        if (arrayMatch) {
          recommendations = JSON.parse(arrayMatch[0])
        } else {
          throw new Error("No se pudo analizar la respuesta JSON de OpenAI")
        }
      }

      // Validar que las recomendaciones sean un arreglo
      if (!Array.isArray(recommendations)) {
        throw new Error("OpenAI no devolvió un arreglo de recomendaciones")
      }

      console.log("Recomendaciones analizadas:", recommendations)

      // Limitar a 5 recomendaciones
      recommendations = recommendations.slice(0, 5)

      // Geocodificar las 5 recomendaciones con manejo mejorado de límites de tasa
      const recommendationsWithCoordinates = []

      // Función para reintentar la geocodificación con retroceso exponencial
      const geocodeWithRetry = async (query: string, reintentos = 3, demora = 1000) => {
        for (let intento = 0; intento < reintentos; intento++) {
          try {
            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${
                process.env.NEXT_PUBLIC_MAPBOX_TOKEN
              }&limit=1&proximity=${coordinates[0]},${coordinates[1]}`,
              {
                headers: {
                  "Cache-Control": "max-age=3600", // Encabezados de caché
                },
              },
            )


            if (response.status === 429) {
              console.warn(`Límite de tasa alcanzado en el intento ${intento + 1}, esperando ${demora}ms antes de reintentar`)
              await new Promise((resolve) => setTimeout(resolve, demora))
              // Aumentar la demora para el próximo intento (retroceso exponencial)
              demora *= 2
              continue
            }

            if (!response.ok) {
              throw new Error(`Error en la API de geocodificación: ${response.status} ${response.statusText}`)
            }

            return await response.json()
          } catch (error) {
            if (intento === reintentos - 1) throw error
            await new Promise((resolve) => setTimeout(resolve, demora))
            demora *= 2
          }
        }
      }


      // Procesar las 5 recomendaciones con el espaciado adecuado entre solicitudes
      for (let i = 0; i < recommendations.length; i++) {
        const rec = recommendations[i]
        try {
          if (!rec.name || !rec.address) {
            // Si faltan campos requeridos, usar valores predeterminados con desplazamiento
            const offset = (i + 1) * 0.005
            recommendationsWithCoordinates.push({
              name: rec.name || "Lugar desconocido",
              description: rec.description || "No hay descripción disponible",
              address: rec.address || "Dirección no disponible",
              recommendedTime: rec.recommendedTime || "1 hora",
              tips: rec.tips || "No hay consejos disponibles",
              coordinates: [coordinates[0] + offset, coordinates[1] + offset] as [number, number],
            })
            continue
          }

          // Agregar un retraso entre solicitudes de geocodificación para evitar límites de tasa
          if (i > 0) {
            await new Promise((resolve) => setTimeout(resolve, 1000)) // Retraso aumentado a 1 segundo
          }

          // Consulta de geocodificación mejorada con más contexto
          const query = `${rec.name}, ${rec.address}, ${location}`
          console.log(`Consulta de geocodificación para el lugar ${i + 1}: ${query}`)

          try {
            // Usar la función de reintento para la geocodificación
            const geocodingData = await geocodeWithRetry(query)

            if (geocodingData.features && geocodingData.features.length > 0) {
              const feature = geocodingData.features[0]
              const [lng, lat] = feature.center

              console.log(`Geocodificación exitosa para "${rec.name}" en [${lng}, ${lat}]`)

              recommendationsWithCoordinates.push({
                ...rec,
                coordinates: [lng, lat] as [number, number],
                geocodingResult: {
                  placeName: feature.place_name,
                  relevance: feature.relevance,
                },
              })
            } else {
              // Intentar una búsqueda más general si la específica falla
              await new Promise((resolve) => setTimeout(resolve, 1000))

              const fallbackQuery = `${rec.name}, ${location}`
              console.log(`Usando consulta alternativa: ${fallbackQuery}`)

              const fallbackData = await geocodeWithRetry(fallbackQuery)

              if (fallbackData.features && fallbackData.features.length > 0) {
                const [lng, lat] = fallbackData.features[0].center
                console.log(`Geocodificación alternativa usada para "${rec.name}" en [${lng}, ${lat}]`)
                recommendationsWithCoordinates.push({
                  ...rec,
                  coordinates: [lng, lat] as [number, number],
                })
              } else {
                // Si todos los intentos de geocodificación fallan, usar las coordenadas principales con un pequeño desplazamiento
                const offset = (i + 1) * 0.005
                console.log(`Usando coordenadas con desplazamiento para "${rec.name}"`)
                recommendationsWithCoordinates.push({
                  ...rec,
                  coordinates: [coordinates[0] + offset, coordinates[1] + offset] as [number, number],
                })
              }
            }
          } catch (geocodingError) {
            console.error(`Error en la geocodificación de "${rec.name}":`, geocodingError)
            // Usar coordenadas con desplazamiento como respaldo
            const offset = (i + 1) * 0.005
            recommendationsWithCoordinates.push({
              ...rec,
              coordinates: [coordinates[0] + offset, coordinates[1] + offset] as [number, number],
              geocodingError: String(geocodingError),
            })
          }
        } catch (error) {
          console.error(`Error procesando la recomendación "${rec.name}":`, error)
          // Usar coordenadas principales con desplazamiento como respaldo
          const offset = (i + 1) * 0.005
          recommendationsWithCoordinates.push({
            ...rec,
            coordinates: [coordinates[0] + offset, coordinates[1] + offset] as [number, number],
            processingError: String(error),
          })
        }
      }

      // Registrar las recomendaciones finales con coordenadas para depuración
      console.log(
        "Recomendaciones finales con coordenadas:",
        recommendationsWithCoordinates.map((r) => ({
          nombre: r.name,
          coordenadas: r.coordinates,
        })),
      )

      return NextResponse.json({ recommendations: recommendationsWithCoordinates })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error("Error al procesar las recomendaciones:", error)
      return NextResponse.json({ error: "Error al procesar las recomendaciones: " + errorMessage }, { status: 500 })
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error("Error del servidor:", error)
    return NextResponse.json({ error: "Error interno del servidor: " + errorMessage }, { status: 500 })
  }
}
