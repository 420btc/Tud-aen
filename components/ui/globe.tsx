"use client"

import createGlobe, { COBEOptions } from "cobe"
import { useCallback, useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

const GLOBE_CONFIG: COBEOptions = {
  width: 1000,
  height: 1000,
  onRender: () => {},
  devicePixelRatio: 1,
  phi: 0,
  theta: 0.3,
  dark: 1,  // Fondo oscuro para mejor contraste
  mapSamples: 16000,
  mapBrightness: 4.0,  // Aumentar brillo para mejor visibilidad
  baseColor: [0.2, 0.4, 0.8],  // Color base azul
  markerColor: [1, 0.9, 0.1],  // Amarillo para los marcadores
  glowColor: [0.1, 0.2, 0.8],  // Resplandor azul
  diffuse: 1.5,  // Aumentar difusión para mejor iluminación
  opacity: 1,  // Asegurar opacidad máxima
  markers: [
    { location: [14.5995, 120.9842], size: 0.03 },
    { location: [19.076, 72.8777], size: 0.1 },
    { location: [23.8103, 90.4125], size: 0.05 },
    { location: [30.0444, 31.2357], size: 0.07 },
    { location: [39.9042, 116.4074], size: 0.08 },
    { location: [-23.5505, -46.6333], size: 0.1 },
    { location: [19.4326, -99.1332], size: 0.1 },
    { location: [40.7128, -74.006], size: 0.1 },
    { location: [34.6937, 135.5022], size: 0.05 },
    { location: [41.0082, 28.9784], size: 0.06 },
  ],
}

export function Globe({
  className,
  config = GLOBE_CONFIG,
}: {
  className?: string
  config?: COBEOptions
}) {
  let phi = 0
  let width = 0
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pointerInteracting = useRef<number | null>(null)
  const pointerInteractionMovement = useRef(0)
  const [r, setR] = useState(0)
  const [canvasSize, setCanvasSize] = useState({ width: 1000, height: 1000 })

  const updatePointerInteraction = (value: number | null, clientX?: number) => {
    pointerInteracting.current = value
    if (canvasRef.current) {
      canvasRef.current.style.cursor = value !== null ? "grabbing" : "grab"
    }
    if (clientX !== undefined) {
      updateMovement(clientX)
    }
  }

  const updateMovement = (clientX: number) => {
    if (pointerInteracting.current !== null) {
      const delta = clientX - pointerInteracting.current
      pointerInteractionMovement.current = delta
      setR(delta / 200)
    }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    updatePointerInteraction(e.clientX, e.clientX)
    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
  }

  const handlePointerMove = (e: PointerEvent) => {
    if (pointerInteracting.current !== null) {
      updateMovement(e.clientX)
    }
  }

  const handlePointerUp = () => {
    updatePointerInteraction(null)
    document.removeEventListener('pointermove', handlePointerMove)
    document.removeEventListener('pointerup', handlePointerUp)
  }

  const onRender = useCallback(
    (state: Record<string, any>) => {
      if (!pointerInteracting.current) phi += 0.005
      state.phi = phi + r
      state.width = width * 2
      state.height = width * 2
    },
    [r],
  )

  const onResize = () => {
    if (canvasRef.current) {
      width = canvasRef.current.offsetWidth
    }
  }

  useEffect(() => {
    window.addEventListener("resize", onResize)
    onResize()

    const globe = createGlobe(canvasRef.current!, {
      ...config,
      width: width * 2,
      height: width * 2,
      onRender,
    })

    const canvas = canvasRef.current
    if (canvas) {
      canvas.style.cursor = 'grab'
      canvas.style.opacity = '1'
      
      // Add touch support
      const handleTouchStart = (e: TouchEvent) => {
        e.preventDefault()
        updatePointerInteraction(e.touches[0].clientX, e.touches[0].clientX)
      }
      
      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault()
        if (pointerInteracting.current !== null) {
          updateMovement(e.touches[0].clientX)
        }
      }
      
      const handleTouchEnd = () => {
        updatePointerInteraction(null)
      }
      
      canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
      canvas.addEventListener('touchend', handleTouchEnd)
      
      return () => {
        globe.destroy()
        canvas.removeEventListener('touchstart', handleTouchStart)
        canvas.removeEventListener('touchmove', handleTouchMove)
        canvas.removeEventListener('touchend', handleTouchEnd)
      }
    }
    
    return () => globe.destroy()
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        cursor: 'grab',
      }}
      className={cn(
        'touch-none',
        className
      )}
      onPointerDown={(e) => {
        if (pointerInteracting.current !== null) return false;
        pointerInteracting.current =
          e.clientX - pointerInteractionMovement.current;
        if (canvasRef.current) {
          canvasRef.current.style.cursor = 'grabbing';
        }
      }}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={(e) => {
          if (pointerInteracting.current !== null) return false;
          pointerInteracting.current =
            e.clientX - pointerInteractionMovement.current;
          if (canvasRef.current) {
            canvasRef.current.style.cursor = 'grabbing';
          }
        }}
        className={cn(
          'w-full h-full',
          pointerInteracting.current === null ? 'cursor-grab' : 'cursor-grabbing'
        )}
        width={canvasSize.width}
        height={canvasSize.height}
      />
    </div>
  )
}
