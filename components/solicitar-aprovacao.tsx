"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { Switch } from "@/components/ui/switch"
import type { ApprovalWorkflow, ApprovalType, ApprovalLevel } from "@/types/workflow"

interface SolicitarAprovacaoProps {
  pagamentoId: string
  fornecedorId: string
  fornecedorNome: string
  referencia: string
  valor: number
  metodo: string
  descricao: string
  dataVencimento: Date
  isOpen: boolean
  onClose: () => void
}

export function SolicitarAprovacao({
  pagamentoId,
  fornecedorId,
  fornecedorNome,
  referencia,
  valor,
  metodo,
  descricao,
  dataVencimento,
  isOpen,
  onClose,
}: SolicitarAprovacaoProps) {
  const { user } = useAuth()
  const [tipo, setTipo] = useState<ApprovalType>("bank_operation")
  const [descricaoAdicional, setDescricaoAdicional] = useState("")
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)

  // Determinar o nível inicial de aprovação com base no tipo e método
  const determineInitialLevel = (): ApprovalLevel => {
    if (tipo === "petty_cash") {
      return "treasurer" // Fundo de maneio começa com a tesoureira
    } else if (tipo === "bank_operation") {
      return "financial_director" // Operações bancárias começam com a diretora financeira
    }
    return "financial_director" // Padrão para outros tipos
  }

  const handleSubmit = () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para solicitar aprovações.",
        variant: "destructive",
      })
      return
    }

    const initialLevel = determineInitialLevel()

    const newWorkflow: ApprovalWorkflow = {
      id: Date.now().toString(),
      paymentId: pagamentoId,
      fornecedorId,
      fornecedorNome,
      referencia,
      valor,
      tipo,
      metodo,
      descricao: descricao + (descricaoAdicional ? `\n\nInformações adicionais: ${descricaoAdicional}` : ""),
      dataCriacao: new Date(),
      dataVencimento,
      createdBy: user.username,
      currentLevel: initialLevel,
      status: "pending",
      steps: [],
      notificationsEnabled,
    }

    // Salvar o novo workflow no localStorage
    const storedWorkflows = localStorage.getItem("approvalWorkflows")
    let workflows: ApprovalWorkflow[] = []

    if (storedWorkflows) {
      try {
        workflows = JSON.parse(storedWorkflows)
      } catch (error) {
        console.error("Erro ao carregar workflows:", error)
      }
    }

    workflows.push(newWorkflow)
    localStorage.setItem("approvalWorkflows", JSON.stringify(workflows))

    // Enviar notificação se estiver habilitado
    if (notificationsEnabled) {
      // Simular o envio de notificação
      const targetUser =
        initialLevel === "treasurer"
          ? "Tesoureira"
          : initialLevel === "financial_director"
            ? "Diretora Financeira"
            : "Reitor"

      console.log(`Notificação enviada para ${targetUser}: Novo pagamento aguardando aprovação - ${referencia}`)

      toast({
        title: "Notificação enviada",
        description: `Uma notificação foi enviada para ${targetUser}.`,
      })
    }

    toast({
      title: "Solicitação enviada",
      description: "A solicitação de aprovação foi enviada com sucesso.",
    })

    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Solicitar Aprovação de Pagamento</DialogTitle>
          <DialogDescription>Preencha os detalhes para solicitar a aprovação deste pagamento.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <h3 className="font-semibold text-sm text-gray-500">Referência</h3>
                <p>{referencia}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-500">Fornecedor</h3>
                <p>{fornecedorNome}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-500">Valor</h3>
                <p>{valor.toFixed(2)} MZN</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-500">Método</h3>
                <p>{metodo}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tipo">Tipo de Aprovação</Label>
            <Select value={tipo} onValueChange={(value) => setTipo(value as ApprovalType)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_operation">Operação Bancária</SelectItem>
                <SelectItem value="petty_cash">Fundo de Maneio</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {tipo === "bank_operation"
                ? "Operações bancárias requerem aprovação da Diretora Financeira e do Reitor."
                : tipo === "petty_cash"
                  ? "Pagamentos do fundo de maneio requerem apenas aprovação da Tesoureira."
                  : "Outros tipos de pagamento requerem aprovação da Diretora Financeira."}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="descricao-adicional">Informações Adicionais (opcional)</Label>
            <Textarea
              id="descricao-adicional"
              placeholder="Adicione informações relevantes para a aprovação..."
              value={descricaoAdicional}
              onChange={(e) => setDescricaoAdicional(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="notifications" checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
            <Label htmlFor="notifications">Enviar notificações automáticas</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>Enviar Solicitação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

