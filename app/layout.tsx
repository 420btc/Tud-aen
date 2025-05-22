import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TuDíaEn...',
  description: 'TuDíaEn... es una aplicación que te ayuda a planificar tu día en cualquier lugar.',
  generator: 'freire',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
