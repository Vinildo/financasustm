"use client"

import type { ReactNode } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Notificacoes } from "@/components/notificacoes"

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth()

  if (!user) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-red-700 text-white p-4 print:hidden">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <span className="text-2xl font-bold">Tesouraria By VM</span>
          <div className="flex items-center gap-4">
            <Notificacoes />
            <span>Bem-vindo, {user.username}</span>
            <Button variant="outline" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </nav>
      <main className="flex-grow bg-gray-100 print:bg-white">{children}</main>
    </div>
  )
}

