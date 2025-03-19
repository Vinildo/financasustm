"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { pt } from "date-fns/locale"
import { Bell, Check, AlertTriangle } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/components/ui/use-toast"

interface Notification {
  id: string
  title: string
  message: string
  targetRole?: string
  timestamp: Date
  read: boolean
  priority?: "high" | "normal"
  type?: "approval" | "info" | "warning"
}

export function Notificacoes() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [hasHighPriority, setHasHighPriority] = useState(false)

  // Carregar notificações do localStorage
  useEffect(() => {
    const loadNotifications = () => {
      const storedNotifications = localStorage.getItem("notifications")
      if (storedNotifications) {
        try {
          const parsedNotifications = JSON.parse(storedNotifications, (key, value) => {
            if (key === "timestamp") {
              return new Date(value)
            }
            return value
          })

          // Filtrar notificações relevantes para o usuário atual
          const userRole = user?.role
          const filteredNotifications = parsedNotifications.filter((notification: Notification) => {
            return !notification.targetRole || notification.targetRole === "all" || notification.targetRole === userRole
          })

          // Verificar se há notificações de alta prioridade
          const highPriorityExists = filteredNotifications.some(
            (n: Notification) => !n.read && (n.priority === "high" || n.type === "approval"),
          )
          setHasHighPriority(highPriorityExists)

          setNotifications(filteredNotifications)
          setUnreadCount(filteredNotifications.filter((n: Notification) => !n.read).length)

          // Mostrar toast para notificações de alta prioridade para diretora financeira e reitor
          if (
            highPriorityExists &&
            (userRole === "directora_financeira" || userRole === "reitor") &&
            !localStorage.getItem("notificationToastShown")
          ) {
            toast({
              title: "Aprovações Pendentes",
              description: "Você tem aprovações pendentes que requerem sua atenção.",
              variant: "destructive",
            })
            // Evitar mostrar o toast repetidamente
            localStorage.setItem("notificationToastShown", "true")
            // Limpar após 1 hora
            setTimeout(() => {
              localStorage.removeItem("notificationToastShown")
            }, 3600000)
          }
        } catch (error) {
          console.error("Erro ao carregar notificações:", error)
        }
      }
    }

    loadNotifications()

    // Verificar notificações a cada 30 segundos
    const interval = setInterval(loadNotifications, 30000)

    return () => clearInterval(interval)
  }, [user])

  const markAsRead = (id: string) => {
    const storedNotifications = localStorage.getItem("notifications")
    if (storedNotifications) {
      try {
        const parsedNotifications = JSON.parse(storedNotifications)
        const updatedNotifications = parsedNotifications.map((notification: Notification) => {
          if (notification.id === id) {
            return { ...notification, read: true }
          }
          return notification
        })

        localStorage.setItem("notifications", JSON.stringify(updatedNotifications))

        // Atualizar estado local
        setNotifications((prev) =>
          prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))

        // Verificar se ainda há notificações de alta prioridade
        const highPriorityExists = updatedNotifications.some(
          (n: Notification) =>
            !n.read &&
            (n.priority === "high" || n.type === "approval") &&
            (!n.targetRole || n.targetRole === "all" || n.targetRole === user?.role),
        )
        setHasHighPriority(highPriorityExists)
      } catch (error) {
        console.error("Erro ao marcar notificação como lida:", error)
      }
    }
  }

  const markAllAsRead = () => {
    const storedNotifications = localStorage.getItem("notifications")
    if (storedNotifications) {
      try {
        const parsedNotifications = JSON.parse(storedNotifications)
        const updatedNotifications = parsedNotifications.map((notification: Notification) => {
          return { ...notification, read: true }
        })

        localStorage.setItem("notifications", JSON.stringify(updatedNotifications))

        // Atualizar estado local
        setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))
        setUnreadCount(0)
        setHasHighPriority(false)
      } catch (error) {
        console.error("Erro ao marcar todas notificações como lidas:", error)
      }
    }
  }

  // Função para determinar a cor do badge com base no tipo e prioridade
  const getBadgeClass = () => {
    if (hasHighPriority) {
      return "bg-red-500 text-white animate-pulse"
    }
    return "bg-red-500 text-white"
  }

  // Função para determinar a cor de fundo da notificação
  const getNotificationBgClass = (notification: Notification) => {
    if (notification.read) return "bg-white"
    if (notification.priority === "high" || notification.type === "approval") return "bg-red-50"
    return "bg-blue-50"
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className={`relative ${hasHighPriority ? "border-red-500" : ""}`}>
          {hasHighPriority ? <AlertTriangle className="h-5 w-5 text-red-500" /> : <Bell className="h-5 w-5" />}
          {unreadCount > 0 && (
            <Badge className={`absolute -top-2 -right-2 px-1.5 py-0.5 ${getBadgeClass()}`} variant="destructive">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-medium">Notificações</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">Nenhuma notificação disponível.</div>
          ) : (
            notifications
              .sort((a, b) => {
                // Primeiro ordenar por não lidas
                if (!a.read && b.read) return -1
                if (a.read && !b.read) return 1

                // Depois por prioridade
                const aPriority = a.priority === "high" || a.type === "approval"
                const bPriority = b.priority === "high" || b.type === "approval"
                if (aPriority && !bPriority) return -1
                if (!aPriority && bPriority) return 1

                // Finalmente por data
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
              })
              .map((notification) => (
                <div key={notification.id} className={`p-4 border-b ${getNotificationBgClass(notification)}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4
                        className={`font-medium text-sm ${notification.priority === "high" || notification.type === "approval" ? "text-red-700" : ""}`}
                      >
                        {notification.title}
                        {(notification.priority === "high" || notification.type === "approval") &&
                          !notification.read && (
                            <span className="ml-2 text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded">Urgente</span>
                          )}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {format(notification.timestamp, "dd/MM/yyyy HH:mm", { locale: pt })}
                      </p>
                    </div>
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

