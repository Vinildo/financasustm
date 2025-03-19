export type ApprovalStatus = "pending" | "approved" | "rejected" | "waiting_next_level"

export type ApprovalType = "bank_operation" | "petty_cash" | "other"

export type ApprovalLevel = "treasurer" | "financial_director" | "rector"

export interface ApprovalStep {
  id: string
  level: ApprovalLevel
  status: ApprovalStatus
  approvedBy?: string
  approvedAt?: Date
  comments?: string
}

export interface ApprovalWorkflow {
  id: string
  paymentId: string
  fornecedorId: string
  fornecedorNome: string
  referencia: string
  valor: number
  tipo: ApprovalType
  metodo: string
  descricao: string
  dataCriacao: Date
  dataVencimento: Date
  createdBy: string
  currentLevel: ApprovalLevel
  status: ApprovalStatus
  steps: ApprovalStep[]
  notificationsEnabled: boolean
  documentos?: string[]
}

