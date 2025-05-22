"use client"

import type React from "react"

import { useState } from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface SearchBarProps {
  onSearch: (location: string) => void
  isLoading: boolean
}

export function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [searchValue, setSearchValue] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchValue.trim()) {
      onSearch(searchValue.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center w-full max-w-md space-x-2">
      <div className="relative flex-1">
        <Input
          type="text"
          placeholder="Busca un lugar (ej. Barcelona, España)"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pr-10 rounded-2xl bg-black/30 backdrop-blur-sm text-white font-bold w-full placeholder:text-white/80 focus:outline-none focus:ring-0 transition-all duration-200 ease-in-out"
          style={{
            border: '2px solid transparent',
            backgroundImage: 'linear-gradient(90deg, rgba(0,0,0,0.3), rgba(0,0,0,0.3)), linear-gradient(90deg, #60a5fa, #ffffff)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
          }}
        />
      </div>
      <Button type="submit" disabled={isLoading || !searchValue.trim()} className="bg-blue-600 hover:bg-blue-700">
        {isLoading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <>
            <Search className="mr-2 h-4 w-4" />
            Buscar
          </>
        )}
      </Button>
    </form>
  )
}
