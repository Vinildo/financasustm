// Modificar o tipo UserRole para incluir as novas categorias
export type UserRole = "user" | "admin" | "reitor" | "directora_financeira" | "tesoureira"

export interface User {
  id: string
  username: string
  fullName: string
  email: string
  role: UserRole
  password: string
  isActive: boolean
  forcePasswordChange: boolean
  customPermissions?: string[] // Permissões personalizadas para o usuário
}

