"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MoveRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Globe } from "./globe";
import Link from "next/link";

function Hero() {
  const router = useRouter();
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => [
      "increíbles", 
      "únicos", 
      "espectaculares", 
      "fascinantes", 
      "inolvidables",
      "mágicos",
      "escondidos",
      "imperdibles",
      "sorprendentes",
      "exóticos",
      "tradicionales",
      "auténticos",
      "pintorescos",
      "encantadores",
      "misteriosos",
      "históricos",
      "culturales",
      "gastronómicos",
      "naturales",
      "vírgenes"
    ],
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  const handleSearchClick = () => {
    router.push('/game');
  };

  return (
    <div className="relative w-full min-h-screen">
      {/* Globe background - Fixed to viewport */}
      <div className="fixed top-0 left-0 w-screen h-screen -z-10">
        <Globe className="w-full h-full" />
      </div>
      
      {/* Content container */}
      <div className="relative w-full max-w-6xl mx-auto px-4 py-24 z-10 min-h-screen flex flex-col justify-center">
        <div className="relative z-10 w-full text-center">
          <div className="space-y-8">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-tight">
              <span className="block bg-gradient-to-r from-blue-300 to-white bg-clip-text text-transparent pb-4">
                Explora lugares
              </span>
              <span className="relative flex w-full justify-center h-24 md:h-32 items-center px-4">
                {titles.map((title, index) => (
                  <motion.span
                    key={index}
                    className="absolute font-bold bg-gradient-to-r from-blue-300 to-white bg-clip-text text-transparent text-4xl md:text-6xl lg:text-7xl leading-tight whitespace-nowrap px-4 pb-4"
                    initial={{ opacity: 0, y: "-100%" }}
                    transition={{ type: "spring", stiffness: 50, damping: 15 }}
                    animate={{
                      y: titleNumber === index ? 0 : (titleNumber > index ? "-100%" : "100%"),
                      opacity: titleNumber === index ? 1 : 0
                    }}
                  >
                    {title}
                  </motion.span>
                ))}
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-200 max-w-3xl mx-auto leading-relaxed pt-4">
              Encuentra los destinos más increíbles y planifica tu próxima aventura.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center mt-8 px-4 sm:px-0">
              <Link href="/game" className="relative group w-full sm:w-auto">
                <div className="absolute -inset-0.5 sm:-inset-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full blur opacity-50 sm:opacity-70 group-hover:opacity-90 transition-all duration-300 group-hover:-inset-1 sm:group-hover:-inset-2"></div>
                <Button 
                  size="lg" 
                  className="relative w-full sm:w-auto bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:from-blue-600 hover:to-blue-800 px-6 sm:px-10 py-4 sm:py-6 text-base sm:text-lg font-semibold transition-all duration-300 transform group-hover:scale-105 rounded-full shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
                >
                  Explorar Ahora
                </Button>
              </Link>
              <Button 
                size="lg" 
                className="w-full sm:w-auto bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700 px-6 sm:px-10 py-4 sm:py-6 text-base sm:text-lg font-semibold transition-all duration-300 transform hover:scale-105 rounded-full shadow-lg hover:shadow-xl hover:shadow-red-500/20"
              >
                Registrarse
              </Button>
            </div>
            
            <p className="text-sm text-gray-400 mt-6 max-w-2xl mx-auto leading-relaxed pb-8">
              Explora los mejores lugares para visitar y descubre la belleza de la naturaleza y la cultura 
              con nuestro Agente IA especializado en rutas personalizadas.
            </p>
          </div>
        </div>
      </div>
      

    </div>
  );
}

export { Hero };
