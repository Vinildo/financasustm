"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserCircle, ShieldCheck, Key } from "lucide-react"
import { Login } from "@/components/login"
import { AdminRegister } from "@/components/admin-register"
import { ResetPassword } from "@/components/reset-password"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"

export function InitialAccessPage() {
  const [selectedRole, setSelectedRole] = useState<"user" | "admin" | "reset" | null>(null)
  const { user, login, register, hasAdmin, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && !isLoading) {
      router.push("/dashboard")
    }
  }, [user, isLoading, router])

  const handleLogin = async (username: string, password: string) => {
    try {
      console.log("Tentando login em InitialAccessPage:", { username, password })
      const loggedInUser = await login(username, password)
      if (loggedInUser) {
        console.log("Login bem-sucedido:", loggedInUser)
        router.push("/dashboard")
      }
    } catch (error) {
      console.error("Erro no login em InitialAccessPage:", error)
    }
  }

  const handleRegister = async (username: string, password: string) => {
    try {
      const registeredUser = await register(username, password)
      if (registeredUser) {
        console.log("Registro bem-sucedido:", registeredUser)
        router.push("/dashboard")
      }
    } catch (error) {
      console.error("Erro no registro em InitialAccessPage:", error)
    }
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>
  }

  if (user) {
    return null
  }

  if (selectedRole === "admin" && !hasAdmin) {
    return <AdminRegister onRegister={handleRegister} />
  }

  if (selectedRole === "user" || selectedRole === "admin") {
    return <Login role={selectedRole} onLogin={handleLogin} onBack={() => setSelectedRole(null)} />
  }

  if (selectedRole === "reset") {
    return <ResetPassword onBack={() => setSelectedRole(null)} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center text-red-700">Bem-vindo à Tesouraria By VM</CardTitle>
          <CardDescription className="text-center text-gray-600">
            Escolha seu tipo de acesso para continuar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full h-16 text-lg justify-start space-x-4"
            variant="outline"
            onClick={() => setSelectedRole("user")}
          >
            <UserCircle size={24} />
            <span>Acesso de Usuário Padrão</span>
          </Button>
          <Button
            className="w-full h-16 text-lg justify-start space-x-4"
            variant="outline"
            onClick={() => setSelectedRole("admin")}
          >
            <ShieldCheck size={24} />
            <span>{hasAdmin ? "Acesso de Administrador" : "Registrar Administrador"}</span>
          </Button>
          <Button
            className="w-full h-16 text-lg justify-start space-x-4"
            variant="outline"
            onClick={() => setSelectedRole("reset")}
          >
            <Key size={24} />
            <span>Redefinir Senha</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

