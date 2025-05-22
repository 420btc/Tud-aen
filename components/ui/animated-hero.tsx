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
    <div className="w-full relative bg-black min-h-screen overflow-hidden">
      {/* Fondo con globo terráqueo */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 w-full h-full">
          <Globe className="absolute inset-0 w-full h-full opacity-90" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/70 to-black/90"></div>
      </div>
      
      {/* Contenido */}
      <div className="container mx-auto relative z-10 h-full">
        <div className="flex gap-8 py-20 lg:py-40 items-center justify-center flex-col">
          <div className="flex gap-4 flex-col">
            <h1 className="text-5xl md:text-7xl max-w-2xl tracking-tighter text-center font-regular bg-gradient-to-r from-blue-400 to-white bg-clip-text text-transparent">
              Explora lugares
              <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-1">
                &nbsp;
                {titles.map((title, index) => (
                  <motion.span
                    key={index}
                    className="absolute font-semibold bg-gradient-to-r from-blue-400 to-white bg-clip-text text-transparent"
                    initial={{ opacity: 0, y: "-100" }}
                    transition={{ type: "spring", stiffness: 50 }}
                    animate={
                      titleNumber === index
                        ? {
                            y: 0,
                            opacity: 1,
                          }
                        : {
                            y: titleNumber > index ? -150 : 150,
                            opacity: 0,
                          }
                    }
                  >
                    {title}
                  </motion.span>
                ))}
              </span>
            </h1>

            <p className="text-lg md:text-xl leading-relaxed tracking-tight bg-gradient-to-r from-blue-300 to-white/90 bg-clip-text text-transparent max-w-2xl text-center">
              Explora los 5 mejores lugares para visitar y descubre la belleza de la naturaleza o la cultura dejandote llevar por el Agente IA especializado
              en la mejor ruta.
            </p>
          </div>
          <div className="flex flex-row gap-3">
            <Button 
              size="lg" 
              className="gap-4 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSearchClick}
            >
              Explorar Ahora <MapPin className="w-4 h-4" />
            </Button>
            <Button 
              size="lg" 
              className="gap-4 bg-red-600 hover:bg-red-700 text-white"
            >
              Registrarse <MoveRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Hero };
