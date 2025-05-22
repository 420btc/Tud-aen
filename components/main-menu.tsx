"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X, MapPin, Compass, Globe as GlobeIcon, LogIn, UserPlus } from "lucide-react"
import { Button } from "./ui/button"
import { Hero } from "./ui/animated-hero"

export function MainMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => {
    const newState = !isMenuOpen;
    setIsMenuOpen(newState);
    if (typeof window !== 'undefined') {
      // Solo deshabilitar scroll en móvil
      if (window.innerWidth < 768) { // md breakpoint
        document.body.style.overflow = newState ? 'hidden' : 'auto';
      }
    }
  }

  const navItems = [
    { name: "Explorar", href: "/explore", icon: <Compass className="w-5 h-5 mr-2" /> },
    { name: "Destinos", href: "/destinations", icon: <GlobeIcon className="w-5 h-5 mr-2" /> },
    { name: "Rutas", href: "/routes", icon: <MapPin className="w-5 h-5 mr-2" /> },
  ]

  // Deshabilitar scroll cuando el menú móvil está abierto
  if (typeof window !== 'undefined') {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Barra de navegación */}
      <header className="bg-transparent fixed w-full z-50 h-16 flex items-center">
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm -z-10"></div>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-full">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2 z-10">
              <MapPin className="h-8 w-8 text-blue-400" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-300 to-white bg-clip-text text-transparent">YourDayIn</span>
            </Link>

            {/* Navegación para escritorio */}
            <nav className="hidden md:flex items-center space-x-2">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="font-medium text-white hover:bg-slate-700/50 transition-colors duration-200 flex items-center px-4 py-2 rounded-full bg-slate-800/60 backdrop-blur-sm"
                >
                  {item.icon}
                  <span className="ml-2">{item.name}</span>
                </Link>
              ))}
            </nav>

            {/* Botón de autenticación */}
            <div className="hidden md:flex items-center z-10">
              <Button 
                variant="ghost" 
                className="text-white hover:bg-slate-700/50 bg-slate-800/60 backdrop-blur-sm rounded-full px-4 h-9"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Iniciar sesión
              </Button>
            </div>

            {/* Botón de menú móvil */}
            <button
              className="md:hidden text-gray-300 hover:text-white focus:outline-none"
              onClick={toggleMenu}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Menú móvil - Versión móvil */}
          {isMenuOpen && (
            <div className="md:hidden fixed inset-0 bg-gray-900/95 backdrop-blur-md z-40 pt-16 overflow-y-auto">
              <div className="container mx-auto px-4 py-6">
                <nav className="flex flex-col space-y-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="font-medium text-white hover:bg-white/10 transition-colors duration-200 flex items-center p-4 rounded-lg text-lg"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.icon}
                      <span className="ml-3">{item.name}</span>
                    </Link>
                  ))}
                  <div className="pt-4 border-t border-gray-800 space-y-3 mt-4">
                    <Button variant="outline" className="w-full justify-start py-6 text-base" onClick={() => setIsMenuOpen(false)}>
                      <LogIn className="w-5 h-5 mr-2" />
                      Iniciar sesión
                    </Button>
                    <Button className="w-full justify-start py-6 text-base" onClick={() => setIsMenuOpen(false)}>
                      <UserPlus className="w-5 h-5 mr-2" />
                      Crear cuenta
                    </Button>
                  </div>
                </nav>
              </div>
            </div>
          )}
          
          {/* Menú móvil - Versión escritorio (igual al original) */}
          {isMenuOpen && (
            <div className="hidden md:block bg-gray-900/95 backdrop-blur-md p-4 rounded-lg mt-2 mb-4 border border-gray-800">
              <nav className="flex flex-col space-y-4">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="font-medium bg-gradient-to-r from-blue-400 to-white bg-clip-text text-transparent hover:from-blue-300 hover:to-gray-200 transition-colors duration-200 flex items-center p-2 rounded hover:bg-gray-800/50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                ))}
                <div className="pt-4 border-t border-gray-800 space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <LogIn className="w-5 h-5 mr-2" />
                    Iniciar sesión
                  </Button>
                  <Button className="w-full justify-start">
                    <UserPlus className="w-5 h-5 mr-2" />
                    Crear cuenta
                  </Button>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Contenido principal con el Hero */}
      <main className="flex-grow pt-12 relative z-10">
        <Hero />
      </main>


    </div>
  )
}
