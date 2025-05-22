"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MoveRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Globe } from "./globe";

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
    <section className="relative w-full overflow-hidden bg-black">
      {/* Globe container with overlay content */}
      <div className="relative w-full flex items-center justify-center" style={{ height: '50vh', minHeight: '600px' }}>
        {/* Globe background */}
        <div className="absolute inset-0 w-full h-full">
          <Globe className="absolute inset-0 w-full h-full opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/80"></div>
        </div>
        
        {/* Content overlay */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 text-center">
          <div className="space-y-6">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight">
              <span className="block bg-gradient-to-r from-blue-300 to-white bg-clip-text text-transparent">
                Explora lugares
              </span>
              <span className="relative flex w-full justify-center overflow-hidden h-24 md:h-32 items-center">
                {titles.map((title, index) => (
                  <motion.span
                    key={index}
                    className="absolute font-bold bg-gradient-to-r from-blue-300 to-white bg-clip-text text-transparent text-4xl md:text-6xl lg:text-7xl"
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
            
            <p className="text-xl md:text-2xl text-gray-200 max-w-3xl mx-auto">
              Encuentra los destinos más increíbles y planifica tu próxima aventura.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <Button 
                size="lg" 
                className="gap-3 bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-6 transform transition-all hover:scale-105"
                onClick={handleSearchClick}
              >
                Explorar Ahora <MapPin className="w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="gap-3 text-white hover:bg-white/10 text-lg px-8 py-6 border-white/30 transform transition-all hover:scale-105"
              >
                Ver ofertas <MoveRight className="w-5 h-5" />
              </Button>
            </div>
            
            <p className="text-sm text-gray-400 mt-8 max-w-2xl mx-auto">
              Explora los mejores lugares para visitar y descubre la belleza de la naturaleza y la cultura 
              con nuestro Agente IA especializado en rutas personalizadas.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export { Hero };
