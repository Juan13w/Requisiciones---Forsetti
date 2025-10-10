import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Footer } from '@/components/Footer'
import StyleLoader from '@/components/StyleLoader'
import './globals.css'
import '../styles/ComprasDashboard.css'
import '../styles/RequisitionDetails.css'
import '../styles/charts.css'

//VERSION 1 FINALIZADA

export const metadata: Metadata = {
  title: 'Sistema de requisiciones',
  description: 'Diseñado específicamente para empresas que necesitan un control eficiente de sus procesos de requisiciones.',
  generator: 'Sistema de requisiciones',
  icons: {
    icon: '/images/Logo.png',
    apple: '/images/Logo.png',
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body className="flex flex-col min-h-screen">
        <StyleLoader />
        <main className="flex-grow">
          {children}
        </main>
      </body>
    </html>
  )
}
