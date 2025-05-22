import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'YourDayIn',
  description: 'TuDíaEn... es una aplicación que te ayuda a planificar tu día en cualquier lugar.',
  generator: 'freire',
  icons: {
    icon: '/myfavi.png',
    shortcut: '/myfavi.png',
    apple: '/myfavi.png',
  },
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
