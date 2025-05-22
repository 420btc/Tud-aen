"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

interface LoadingModalProps {
  isOpen: boolean
  logs: string[]
  progress: number
  onClose?: () => void
}

export function LoadingModal({ isOpen, logs, progress, onClose }: LoadingModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [showContent, setShowContent] = useState(false)

  // Handle mount/unmount and animations
  useEffect(() => {
    if (isOpen) {
      setIsMounted(true)
      setIsVisible(true)
      const timer = setTimeout(() => setShowContent(true), 50)
      return () => clearTimeout(timer)
    } else {
      setShowContent(false)
      setIsVisible(false)
      const timer = setTimeout(() => {
        setIsMounted(false)
        onClose?.()
      }, 500) // Match this with the exit animation duration
      return () => clearTimeout(timer)
    }
  }, [isOpen, onClose])

  if (!isOpen && !isMounted) return null

  return (
    <motion.div 
      className="fixed bottom-0 left-0 right-0 z-[9999]"
      initial={{ y: '100%' }}
      animate={{ y: isOpen ? 0 : '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    >
      <motion.div 
        className="w-full bg-gray-900/95 backdrop-blur-sm border-t border-gray-700/50 rounded-t-xl overflow-hidden shadow-2xl"
        initial={{ height: '40vh' }}
        animate={{ height: showContent ? '40vh' : '10px' }}
        transition={{ duration: 0.3 }}
      >
        {/* Draggable handle */}
        <div className="h-2 w-16 mx-auto bg-gray-700/50 rounded-full my-2 cursor-row-resize" />
        
        {/* Console header */}
        <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700/50 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 rounded-full bg-red-500"></div>
            <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
            <div className="h-3 w-3 rounded-full bg-green-500"></div>
            <span className="ml-2 text-sm font-mono text-gray-300">console</span>
          </div>
          <button 
            onClick={() => setIsMounted(false)}
            className="text-gray-400 hover:text-white p-1"
            aria-label="Cerrar consola"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {/* Console content */}
        <div className="h-[calc(100%-40px)] flex flex-col">
          {/* Logs container */}
          <div className="flex-1 overflow-y-auto p-4 font-mono text-sm text-green-400 bg-gray-900/50">
            {logs.length === 0 ? (
              <p className="text-gray-400 italic">$ Iniciando búsqueda de ubicación...</p>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <motion.div 
                    key={index} 
                    className="font-mono text-sm"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.1 }}
                  >
                    <span className="text-blue-400">$&gt;{' '}</span>
                    <span className={log.startsWith('✅') ? 'text-green-400' : 'text-gray-200'}>{log}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
          
          {/* Progress bar */}
          <div className="h-1.5 w-full bg-gray-800/50 overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-green-500 to-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
          
          {/* Status bar */}
          <div className="px-3 py-1.5 bg-gray-800/50 text-xs text-gray-400 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
              <span>{progress < 100 ? 'Procesando...' : 'Listo'}</span>
            </div>
            <span className="font-mono">{progress}%</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
