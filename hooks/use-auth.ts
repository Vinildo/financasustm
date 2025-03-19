"use client"

import { useState, useEffect } from "react"
import { toast } from "@/components/ui/use-toast"

interface User {
  id: string
  username: string
  email: string
  role: "user" | "admin"
  password: string
  fullName: string
  isActive: boolean
  forcePasswordChange: boolean
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [hasAdmin, setHasAdmin] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true)
      try {
        const storedUser = localStorage.getItem("user")
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser)
          console.log("Loaded user from localStorage:", parsedUser)
          setUser(parsedUser)
        }

        let users = JSON.parse(localStorage.getItem("users") || "[]")
        console.log("Stored users:", users)

        // If no users are stored, initialize with default users
        if (users.length === 0) {
          users = getDefaultUsers()
          localStorage.setItem("users", JSON.stringify(users))
          console.log("Initialized default users:", users)
        }

        // Ensure Vinildo Mondlane is always an admin
        const vinildoIndex = users.findIndex((u: User) => u.email.toLowerCase() === "v.mondlane1@gmail.com")

        if (vinildoIndex >= 0) {
          // Make sure Vinildo is an admin
          if (users[vinildoIndex].role !== "admin") {
            users[vinildoIndex].role = "admin"
            localStorage.setItem("users", JSON.stringify(users))
            console.log("Updated Vinildo to admin role")
          }
        } else {
          // Add Vinildo if not present
          const vinildoUser = {
            id: "4",
            username: "Vinildo Mondlane",
            email: "V.mondlane1@gmail.com",
            fullName: "Vinildo Mondlane",
            role: "admin",
            password: "Vinildo123456",
            isActive: true,
            forcePasswordChange: false,
          }
          users.push(vinildoUser)
          localStorage.setItem("users", JSON.stringify(users))
          console.log("Added Vinildo Mondlane as admin")
        }

        const adminExists = users.some((u: User) => u.role === "admin")
        setHasAdmin(adminExists)
        localStorage.setItem("adminExists", adminExists.toString())

        console.log("Initial auth state:", { storedUser, adminExists, users })
      } catch (error) {
        console.error("Error during initialization:", error)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (usernameOrEmail: string, password: string) => {
    setIsLoading(true)
    try {
      // Get users from localStorage or use default array if empty
      const usersString = localStorage.getItem("users")
      console.log("Raw users string from localStorage:", usersString)

      let users = []
      if (usersString) {
        try {
          users = JSON.parse(usersString)
        } catch (e) {
          console.error("Error parsing users from localStorage:", e)
          users = getDefaultUsers()
          localStorage.setItem("users", JSON.stringify(users))
        }
      } else {
        users = getDefaultUsers()
        localStorage.setItem("users", JSON.stringify(users))
      }

      console.log("Login attempt:", { usernameOrEmail, password })
      console.log("Available users:", users)

      // Find user with case-insensitive username or email match
      const foundUser = users.find(
        (u: User) =>
          (u.username.toLowerCase() === usernameOrEmail.toLowerCase() ||
            (u.email && u.email.toLowerCase() === usernameOrEmail.toLowerCase())) &&
          u.password === password,
      )

      if (foundUser) {
        if (!foundUser.isActive) {
          toast({
            title: "Conta desativada",
            description: "Esta conta de usuário está desativada. Contacte o administrador.",
            variant: "destructive",
          })
          throw new Error("Conta desativada")
        }

        console.log("User found:", foundUser)

        // Special case for Vinildo Mondlane - always ensure admin role
        if (foundUser.email.toLowerCase() === "v.mondlane1@gmail.com" && foundUser.role !== "admin") {
          foundUser.role = "admin"

          // Update the user in the users array
          const userIndex = users.findIndex((u: User) => u.id === foundUser.id)
          if (userIndex >= 0) {
            users[userIndex] = foundUser
            localStorage.setItem("users", JSON.stringify(users))
            console.log("Updated Vinildo's role to admin during login")
          }
        }

        const { password: _, ...userWithoutPassword } = foundUser

        // Set the user in state and localStorage
        setUser(userWithoutPassword)
        localStorage.setItem("user", JSON.stringify(userWithoutPassword))

        // Also set as currentUser in localStorage for AppContext
        localStorage.setItem("currentUser", JSON.stringify(userWithoutPassword))

        toast({
          title: "Login bem-sucedido",
          description: `Bem-vindo, ${foundUser.fullName}!`,
        })

        return userWithoutPassword
      } else {
        console.log("User not found or password incorrect")
        throw new Error("Credenciais inválidas")
      }
    } catch (error) {
      console.error("Login error:", error)
      toast({
        title: "Erro no login",
        description: "Nome de usuário, email ou senha incorretos. Por favor, tente novamente.",
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("user")
    localStorage.removeItem("currentUser") // Also remove from AppContext storage
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    })
  }

  const register = async (username: string, password: string) => {
    setIsLoading(true)
    try {
      const users = JSON.parse(localStorage.getItem("users") || "[]")
      if (users.some((u: User) => u.role === "admin")) {
        throw new Error("Administrador já existe")
      }

      const newAdmin: User = {
        id: Date.now().toString(),
        username,
        password,
        role: "admin",
        fullName: "Admin User",
        isActive: true,
        forcePasswordChange: false,
        email: "admin@example.com",
      }

      users.push(newAdmin)
      localStorage.setItem("users", JSON.stringify(users))
      setHasAdmin(true)
      localStorage.setItem("adminExists", "true")

      console.log("New admin registered:", newAdmin)
      console.log("Updated users:", users)

      const { password: _, ...adminWithoutPassword } = newAdmin
      setUser(adminWithoutPassword)
      localStorage.setItem("user", JSON.stringify(adminWithoutPassword))
      localStorage.setItem("currentUser", JSON.stringify(adminWithoutPassword))

      toast({
        title: "Registro bem-sucedido",
        description: "Conta de administrador criada com sucesso.",
      })
      return adminWithoutPassword
    } catch (error) {
      console.error("Registration error:", error)
      toast({
        title: "Erro no registro",
        description: "Não foi possível criar a conta. Por favor, tente novamente.",
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const hasPermission = (permission: string) => {
    if (!user) return false
    if (user.role === "admin") return true

    const userPermissions = [
      "view_pagamentos",
      "view_relatorio_divida",
      "view_relatorio_fornecedor",
      "view_controlo_cheques",
      "view_fundo_maneio",
    ]

    return userPermissions.includes(permission)
  }

  const resetPassword = async (usernameOrEmail: string, newPassword: string) => {
    setIsLoading(true)
    try {
      const users = JSON.parse(localStorage.getItem("users") || "[]")
      console.log("Usuários armazenados:", users)
      console.log("Tentando redefinir senha para:", usernameOrEmail)

      const userIndex = users.findIndex(
        (u: User) =>
          u.username.toLowerCase() === usernameOrEmail.toLowerCase() ||
          (u.email && u.email.toLowerCase() === usernameOrEmail.toLowerCase()),
      )

      if (userIndex === -1) {
        console.log("Usuário não encontrado:", usernameOrEmail)
        throw new Error("Usuário não encontrado")
      }

      users[userIndex].password = newPassword
      users[userIndex].forcePasswordChange = false

      localStorage.setItem("users", JSON.stringify(users))
      console.log("Senha redefinida com sucesso para:", usernameOrEmail)

      toast({
        title: "Senha redefinida",
        description: "Sua senha foi redefinida com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao redefinir senha:", error)
      toast({
        title: "Erro ao redefinir senha",
        description:
          error instanceof Error ? error.message : "Não foi possível redefinir a senha. Por favor, tente novamente.",
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const getDefaultUsers = () => {
    return [
      {
        id: "1",
        username: "admin",
        email: "admin@example.com",
        fullName: "Admin User",
        role: "admin",
        password: "admin123",
        isActive: true,
        forcePasswordChange: false,
      },
      {
        id: "2",
        username: "user",
        email: "user@example.com",
        fullName: "Regular User",
        role: "user",
        password: "user123",
        isActive: true,
        forcePasswordChange: false,
      },
      {
        id: "3",
        username: "Benigna Magaia",
        email: "benigna@example.com",
        fullName: "Benigna Magaia",
        role: "user",
        password: "01",
        isActive: true,
        forcePasswordChange: false,
      },
      {
        id: "4",
        username: "Vinildo Mondlane",
        email: "V.mondlane1@gmail.com",
        fullName: "Vinildo Mondlane",
        role: "admin",
        password: "Vinildo123456",
        isActive: true,
        forcePasswordChange: false,
      },
    ]
  }

  return {
    user,
    login,
    logout,
    register,
    hasAdmin,
    isLoading,
    hasPermission,
    resetPassword,
    isAdmin: () => user?.role === "admin",
  }
}

