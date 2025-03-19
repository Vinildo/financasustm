export type Pagamento = {
  id: string
  referencia: string
  valor: number
  dataVencimento: Date
  dataPagamento: Date | null
  estado: "pendente" | "pago" | "atrasado" | "cancelado"
  metodo: "transferência" | "cheque" | "débito direto" | "fundo de maneio" | "outro"
  departamento: string
  observacoes: string
  descricao: string
  tipo: "fatura" | "cotacao"
  reconciliado?: boolean
  transacaoBancariaId?: string
  historico?: HistoryEntry[]
  facturaRecebida?: boolean
  reciboRecebido?: boolean
  lembreteEnviado?: boolean
  fundoManeioId?: string // ID do movimento no fundo de maneio, se aplicável
  documentoRequerido?: "factura" | "vd" | "nenhum" // Tipo de documento requerido
  vdRecebido?: boolean // Status do VD
}

export type Fornecedor = {
  id: string
  nome: string
  pagamentos: Pagamento[]
}

export type HistoryEntry = {
  timestamp: Date
  user: string
  changes: string
}

