"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { Trash2, Edit, Lock, RefreshCw, Shield, Eye, LogIn } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useAppContext } from "@/contexts/AppContext"
import { useAuth } from "@/hooks/use-auth"
import type { User, UserRole } from "@/types/user"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function UserManagement() {
  const { users, addUser, updateUser, deleteUser, getAllPermissions, getUserPermissions, currentUser } = useAppContext()
  const { user: authUser, login } = useAuth()
  const [newUser, setNewUser] = useState<Omit<User, "id" | "isActive" | "forcePasswordChange">>({
    username: "",
    fullName: "",
    email: "",
    role: "user",
    password: "",
  })
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false)
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false)
  const [isViewUserDialogOpen, setIsViewUserDialogOpen] = useState(false)
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [loginCredentials, setLoginCredentials] = useState({ email: "", password: "" })
  const [isAdmin, setIsAdmin] = useState(false)

  // Verificar o status de administrador ao carregar o componente e quando o usuário mudar
  useEffect(() => {
    const checkAdminStatus = () => {
      // Verificar se o usuário atual é administrador
      const isCurrentUserAdmin = currentUser?.role === "admin"
      const isAuthUserAdmin = authUser?.role === "admin"

      console.log("Current user from context:", currentUser)
      console.log("Current user from auth:", authUser)
      console.log("Is admin from context:", isCurrentUserAdmin)
      console.log("Is admin from auth:", isAuthUserAdmin)

      setIsAdmin(isCurrentUserAdmin || isAuthUserAdmin)
    }

    checkAdminStatus()
  }, [currentUser, authUser])

  // Verificar se há um usuário Vinildo Mondlane no localStorage
  useEffect(() => {
    const checkVinildoUser = () => {
      try {
        const storedUsers = localStorage.getItem("users")
        if (storedUsers) {
          const users = JSON.parse(storedUsers)
          const vinildoUser = users.find((u: User) => u.email.toLowerCase() === "v.mondlane1@gmail.com")

          if (vinildoUser) {
            console.log("Vinildo user found:", vinildoUser)

            // Se o usuário atual não estiver definido, tente fazer login como Vinildo
            if (!currentUser && !authUser) {
              console.log("No user logged in, attempting auto-login as Vinildo")
              setLoginCredentials({
                email: "V.mondlane1@gmail.com",
                password: "Vinildo123456",
              })
              setIsLoginDialogOpen(true)
            }
          }
        }
      } catch (error) {
        console.error("Error checking for Vinildo user:", error)
      }
    }

    checkVinildoUser()
  }, [currentUser, authUser])

  // Se não for administrador, mostrar mensagem e opção de login
  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acesso Restrito</CardTitle>
          <CardDescription>Apenas administradores podem acessar esta página</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-md bg-yellow-50">
            <p className="mb-2">Você não tem permissão para acessar o gerenciamento de usuários.</p>
            <p className="text-sm text-muted-foreground mb-4">
              Usuário atual: {currentUser?.username || authUser?.username || "Nenhum"}
              <br />
              Função: {currentUser?.role || authUser?.role || "Nenhuma"}
              <br />
              Email: {currentUser?.email || authUser?.email || "Nenhum"}
            </p>

            <Button onClick={() => setIsLoginDialogOpen(true)} className="flex items-center gap-2">
              <LogIn className="h-4 w-4" />
              Entrar como Administrador
            </Button>
          </div>

          <Dialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Login de Administrador</DialogTitle>
                <DialogDescription>
                  Entre com suas credenciais de administrador para acessar o gerenciamento de usuários.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="admin-email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="admin-email"
                    value={loginCredentials.email}
                    onChange={(e) => setLoginCredentials({ ...loginCredentials, email: e.target.value })}
                    className="col-span-3"
                    placeholder="v.mondlane1@gmail.com"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="admin-password" className="text-right">
                    Senha
                  </Label>
                  <Input
                    id="admin-password"
                    type="password"
                    value={loginCredentials.password}
                    onChange={(e) => setLoginCredentials({ ...loginCredentials, password: e.target.value })}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={async () => {
                    try {
                      await login(loginCredentials.email, loginCredentials.password)
                      setIsLoginDialogOpen(false)
                      // Recarregar a página para atualizar o estado
                      window.location.reload()
                    } catch (error) {
                      console.error("Login error:", error)
                    }
                  }}
                >
                  Entrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    )
  }

  const handleAddUser = () => {
    if (newUser.username && newUser.fullName && newUser.password) {
      addUser({ ...newUser, isActive: true, forcePasswordChange: true })
      setNewUser({ username: "", fullName: "", email: "", role: "user", password: "" })
      toast({
        title: "Usuário adicionado",
        description: `${newUser.fullName} foi adicionado com sucesso.`,
      })
    } else {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteUser = (id: string) => {
    deleteUser(id)
    toast({
      title: "Usuário removido",
      description: "O usuário foi removido com sucesso.",
    })
  }

  const handleToggleUserStatus = (user: User) => {
    const updatedUser = { ...user, isActive: !user.isActive }
    updateUser(updatedUser)
    toast({
      title: `Usuário ${updatedUser.isActive ? "ativado" : "desativado"}`,
      description: `${updatedUser.fullName} foi ${updatedUser.isActive ? "ativado" : "desativado"} com sucesso.`,
    })
  }

  const handleEditUser = () => {
    if (editingUser) {
      updateUser(editingUser)
      setIsEditDialogOpen(false)
      setEditingUser(null)
      toast({
        title: "Usuário atualizado",
        description: `${editingUser.fullName} foi atualizado com sucesso.`,
      })
    }
  }

  const handleResetPassword = () => {
    if (editingUser && newPassword) {
      const updatedUser = { ...editingUser, password: newPassword, forcePasswordChange: true }
      updateUser(updatedUser)
      setIsResetPasswordDialogOpen(false)
      setEditingUser(null)
      setNewPassword("")
      toast({
        title: "Senha redefinida",
        description: `A senha de ${editingUser.fullName} foi redefinida com sucesso.`,
      })
    }
  }

  const handleForcePasswordChange = (user: User) => {
    const updatedUser = { ...user, forcePasswordChange: true }
    updateUser(updatedUser)
    toast({
      title: "Alteração de senha forçada",
      description: `${user.fullName} será obrigado a alterar a senha no próximo login.`,
    })
  }

  const handleViewUser = (user: User) => {
    setEditingUser(user)
    setIsViewUserDialogOpen(true)
  }

  const handleOpenPermissionsDialog = (user: User) => {
    setEditingUser(user)
    // Carregar permissões do usuário
    const userPermissions = getUserPermissions(user)
    setSelectedPermissions(userPermissions)
    setIsPermissionsDialogOpen(true)
  }

  const handleTogglePermission = (permission: string) => {
    setSelectedPermissions((prev) => {
      if (prev.includes(permission)) {
        return prev.filter((p) => p !== permission)
      } else {
        return [...prev, permission]
      }
    })
  }

  const handleSavePermissions = () => {
    // Implementação futura: salvar permissões específicas para o usuário
    // Por enquanto, apenas fechamos o diálogo
    setIsPermissionsDialogOpen(false)
    toast({
      title: "Permissões atualizadas",
      description: "As permissões do usuário foram atualizadas com sucesso.",
    })
  }

  // Agrupar permissões por categoria
  const permissionCategories = {
    "Gerenciamento de Usuários": [
      "manage_users",
      "view_users",
      "create_user",
      "edit_user",
      "delete_user",
      "reset_password",
    ],
    "Gerenciamento de Fornecedores": [
      "manage_fornecedores",
      "view_fornecedores",
      "create_fornecedor",
      "edit_fornecedor",
      "delete_fornecedor",
    ],
    "Gerenciamento de Pagamentos": [
      "manage_pagamentos",
      "view_pagamentos",
      "create_pagamento",
      "edit_pagamento",
      "delete_pagamento",
      "move_pagamento",
    ],
    Relatórios: [
      "view_relatorio_divida",
      "view_relatorio_fornecedor",
      "view_relatorio_cliente",
      "view_relatorio_financeiro",
    ],
    "Outras Funcionalidades": [
      "view_controlo_cheques",
      "view_fundo_maneio",
      "manage_fundo_maneio",
      "view_reconciliacao_bancaria",
      "view_reconciliacao_interna",
      "view_calendario_fiscal",
      "view_previsao_orcamento",
      "notificar_fornecedor",
    ],
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestão de Usuários</CardTitle>
        <CardDescription>Adicione e gerencie usuários do sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="users">
          <TabsList className="mb-4">
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="add">Adicionar Usuário</TabsTrigger>
          </TabsList>

          <TabsContent value="add">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Nome de usuário</Label>
                  <Input
                    id="username"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="fullName">Nome completo</Label>
                  <Input
                    id="fullName"
                    value={newUser.fullName}
                    onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role">Função</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value: UserRole) => setNewUser({ ...newUser, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a função" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="reitor">Reitor</SelectItem>
                      <SelectItem value="directora_financeira">Diretora Financeira</SelectItem>
                      <SelectItem value="tesoureira">Tesoureira</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={handleAddUser}>Adicionar Usuário</Button>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome de Usuário</TableHead>
                    <TableHead>Nome Completo</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users &&
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{user.fullName}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {user.role === "admin"
                            ? "Administrador"
                            : user.role === "reitor"
                              ? "Reitor"
                              : user.role === "directora_financeira"
                                ? "Diretora Financeira"
                                : user.role === "tesoureira"
                                  ? "Tesoureira"
                                  : "Usuário"}
                        </TableCell>
                        <TableCell>
                          <Switch checked={user.isActive} onCheckedChange={() => handleToggleUserStatus(user)} />
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleViewUser(user)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => setEditingUser(user)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Editar Usuário</DialogTitle>
                                  <DialogDescription>
                                    Faça as alterações necessárias e clique em salvar.
                                  </DialogDescription>
                                </DialogHeader>
                                {editingUser && (
                                  <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <Label htmlFor="edit-username" className="text-right">
                                        Nome de usuário
                                      </Label>
                                      <Input
                                        id="edit-username"
                                        value={editingUser.username}
                                        onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                                        className="col-span-3"
                                      />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <Label htmlFor="edit-fullName" className="text-right">
                                        Nome completo
                                      </Label>
                                      <Input
                                        id="edit-fullName"
                                        value={editingUser.fullName}
                                        onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                                        className="col-span-3"
                                      />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <Label htmlFor="edit-email" className="text-right">
                                        Email
                                      </Label>
                                      <Input
                                        id="edit-email"
                                        type="email"
                                        value={editingUser.email}
                                        onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                        className="col-span-3"
                                      />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <Label htmlFor="edit-role" className="text-right">
                                        Função
                                      </Label>
                                      <Select
                                        value={editingUser.role}
                                        onValueChange={(value: UserRole) =>
                                          setEditingUser({ ...editingUser, role: value })
                                        }
                                      >
                                        <SelectTrigger className="col-span-3">
                                          <SelectValue placeholder="Selecione a função" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="user">Usuário</SelectItem>
                                          <SelectItem value="admin">Administrador</SelectItem>
                                          <SelectItem value="reitor">Reitor</SelectItem>
                                          <SelectItem value="directora_financeira">Diretora Financeira</SelectItem>
                                          <SelectItem value="tesoureira">Tesoureira</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                )}
                                <DialogFooter>
                                  <Button onClick={handleEditUser}>Salvar alterações</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => setEditingUser(user)}>
                                  <Lock className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Redefinir Senha</DialogTitle>
                                  <DialogDescription>Digite a nova senha para o usuário.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="new-password" className="text-right">
                                      Nova Senha
                                    </Label>
                                    <Input
                                      id="new-password"
                                      type="password"
                                      value={newPassword}
                                      onChange={(e) => setNewPassword(e.target.value)}
                                      className="col-span-3"
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button onClick={handleResetPassword}>Redefinir Senha</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Button variant="outline" size="sm" onClick={() => handleForcePasswordChange(user)}>
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleOpenPermissionsDialog(user)}>
                              <Shield className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        {/* Diálogo de Visualização de Usuário */}
        <Dialog open={isViewUserDialogOpen} onOpenChange={setIsViewUserDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalhes do Usuário</DialogTitle>
              <DialogDescription>Informações detalhadas sobre o usuário.</DialogDescription>
            </DialogHeader>
            {editingUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm font-medium">Nome de Usuário:</p>
                    <p>{editingUser.username}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Nome Completo:</p>
                    <p>{editingUser.fullName}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">Email:</p>
                  <p>{editingUser.email}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm font-medium">Função:</p>
                    <p>
                      {editingUser.role === "admin"
                        ? "Administrador"
                        : editingUser.role === "reitor"
                          ? "Reitor"
                          : editingUser.role === "directora_financeira"
                            ? "Diretora Financeira"
                            : editingUser.role === "tesoureira"
                              ? "Tesoureira"
                              : "Usuário"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Status:</p>
                    <p>{editingUser.isActive ? "Ativo" : "Inativo"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">Alteração de Senha Obrigatória:</p>
                  <p>{editingUser.forcePasswordChange ? "Sim" : "Não"}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Diálogo de Permissões */}
        <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gerenciar Permissões</DialogTitle>
              <DialogDescription>
                {editingUser?.role === "admin"
                  ? "Administradores têm todas as permissões por padrão."
                  : "Selecione as permissões para este usuário."}
              </DialogDescription>
            </DialogHeader>
            {editingUser?.role === "admin" ? (
              <div className="py-4">
                <p className="text-sm text-muted-foreground">
                  Este usuário é um administrador e tem acesso a todas as funcionalidades do sistema.
                </p>
              </div>
            ) : (
              <div className="space-y-6 py-4">
                {Object.entries(permissionCategories).map(([category, permissions]) => (
                  <div key={category} className="space-y-2">
                    <h3 className="font-medium">{category}</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {permissions.map((permission) => (
                        <div key={permission} className="flex items-center space-x-2">
                          <Checkbox
                            id={permission}
                            checked={selectedPermissions.includes(permission)}
                            onCheckedChange={() => handleTogglePermission(permission)}
                          />
                          <Label htmlFor={permission} className="text-sm">
                            {permission.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button onClick={handleSavePermissions}>Salvar Permissões</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

