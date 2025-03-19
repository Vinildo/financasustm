import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import { AppProvider } from "@/contexts/AppContext"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Tesouraria By VM",
  description: "Sistema de Gestão de Tesouraria",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt">
      <head>
        <style>
          {`
    @media print {
      /* Regras básicas para garantir que o conteúdo seja impresso */
      nav.bg-red-700 {
        display: none !important;
      }
    }
  `}
        </style>
        <script
          dangerouslySetInnerHTML={{
            __html: `
    // Script simplificado que não remove elementos essenciais
    window.addEventListener('beforeprint', function() {
      document.querySelectorAll('nav.bg-red-700').forEach(el => {
        el.style.display = 'none';
      });
    });
  `,
          }}
        />
      </head>
      <body className={inter.className}>
        <AppProvider>
          {children}
          <Toaster />
        </AppProvider>
      </body>
    </html>
  )
}



import './globals.css'