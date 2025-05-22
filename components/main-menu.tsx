"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X, MapPin, Compass, Globe, LogIn, UserPlus } from "lucide-react"
import { Button } from "./ui/button"
import { Hero } from "./ui/animated-hero"

export function MainMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => {
    const newState = !isMenuOpen;
    setIsMenuOpen(newState);
    if (typeof window !== 'undefined') {
      document.body.style.overflow = newState ? 'hidden' : 'auto';
    }
  }

  const navItems = [
    { name: "Explorar", href: "/explore", icon: <Compass className="w-5 h-5 mr-2" /> },
    { name: "Destinos", href: "/destinations", icon: <Globe className="w-5 h-5 mr-2" /> },
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
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Barra de navegación */}
      <header className="bg-black/90 backdrop-blur-sm border-b border-gray-800 fixed w-full z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <MapPin className="h-8 w-8 text-blue-400" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-white bg-clip-text text-transparent">YourDayIn</span>
            </Link>

            {/* Navegación para escritorio */}
            <nav className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="font-medium bg-gradient-to-r from-blue-400 to-white bg-clip-text text-transparent hover:from-blue-300 hover:to-gray-200 transition-colors duration-200 flex items-center"
                >
                  {item.icon}
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Botones de autenticación */}
            <div className="hidden md:flex items-center space-x-4">
              <Button variant="ghost" className="text-white hover:bg-gray-800">
                <LogIn className="w-5 h-5 mr-2" />
                Iniciar sesión
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <UserPlus className="w-5 h-5 mr-2" />
                Registrarse
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

          {/* Menú móvil */}
          {isMenuOpen && (
            <div className="md:hidden bg-gray-900/95 backdrop-blur-md p-4 rounded-lg mt-2 mb-4 border border-gray-800">
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
      <main className="flex-grow pt-16">
        <Hero />
      </main>


    </div>
  )
}
