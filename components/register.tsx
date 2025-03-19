"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { useAppContext } from "@/contexts/AppContext"

interface RegisterProps {
  onRegisterComplete: () => void
}

export function Register({ onRegisterComplete }: RegisterProps) {
  const { addUser, users } = useAppContext()
  // Adicionar estado para o email
  const [username, setUsername] = useState("")
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("") // Adicionado estado para email
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const handleRegister = () => {
    if (users.length > 0) {
      toast({
        title: "Erro",
        description: "O administrador já foi registrado.",
        variant: "destructive",
      })
      return
    }

    // Modificar a validação para incluir o email
    if (!username || !fullName || !email || !password || !confirmPassword) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      })
      return
    }

    if (password !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      })
      return
    }

    // Adicionar o email ao criar o usuário
    addUser({
      username,
      fullName,
      email, // Adicionado email
      password,
      role: "admin",
      isActive: true,
      forcePasswordChange: false,
    })

    toast({
      title: "Sucesso",
      description: "Administrador registrado com sucesso. Você pode fazer login agora.",
    })

    onRegisterComplete()
  }

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Registro do Administrador</CardTitle>
        <CardDescription>Crie a conta de administrador para acessar o sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Nome de usuário</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Seu nome de usuário"
            />
          </div>
          {/* Adicionar o campo de email no formulário (após o campo de nome completo) */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome completo"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Seu email"
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
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirme sua senha"
            />
          </div>
          <Button className="w-full" onClick={handleRegister}>
            Registrar Administrador
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

