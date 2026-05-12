import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'APEX — Your Competitive Edge',
  description: 'Personalized AI assistant for video niche domination',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="scanline" />
        {children}
      </body>
    </html>
  )
}
