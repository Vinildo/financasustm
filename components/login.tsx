"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface LoginProps {
  role: "user" | "admin"
  onLogin: (username: string, password: string) => Promise<void>
  onBack: () => void
}

export function Login({ role, onLogin, onBack }: LoginProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username || !password) {
      toast({
        title: "Erro de login",
        description: "Por favor, preencha o nome de usuário e a senha.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      console.log("Tentativa de login com:", { username, password })
      await onLogin(username, password)
    } catch (err) {
      console.error("Erro durante o login:", err)
      // Error handling is done in the parent component
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Button variant="ghost" className="absolute left-4 top-4" onClick={onBack}>
            <ArrowLeft size={24} />
          </Button>
          <CardTitle className="text-2xl font-bold text-center text-red-700">
            {role === "admin" ? "Login de Administrador" : "Login de Usuário"}
          </CardTitle>
          <CardDescription className="text-center text-gray-600">
            Digite suas credenciais para acessar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nome de usuário ou Email</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Seu nome de usuário ou email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                required
              />
            </div>
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

