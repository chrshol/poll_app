import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Intern Wrapped',
  description: 'Stem og finn ut hvem kontoret ligner mest på!',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="no">
      <body className="min-h-screen bg-[#121212] text-white">{children}</body>
    </html>
  )
}
