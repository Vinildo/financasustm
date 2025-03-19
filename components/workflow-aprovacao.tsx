"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { pt } from "date-fns/locale"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { useAppContext } from "@/contexts/AppContext"
import { useAuth } from "@/hooks/use-auth"
import { CheckCircle, XCircle, AlertCircle, Clock, FileText, Bell, BellOff } from "lucide-react"
import type { ApprovalWorkflow, ApprovalStatus, ApprovalStep } from "@/types/workflow"
import type { Pagamento } from "@/types/fornecedor"

export function WorkflowAprovacao() {
  const { user } = useAuth()
  const { fornecedores, atualizarPagamento } = useAppContext()
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([])
  const [activeTab, setActiveTab] = useState("pendentes")
  const [selectedWorkflow, setSelectedWorkflow] = useState<ApprovalWorkflow | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)
  const [approvalComment, setApprovalComment] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [isStatusChangeDialogOpen, setIsStatusChangeDialogOpen] = useState(false)
  const [workflowToChangeStatus, setWorkflowToChangeStatus] = useState<ApprovalWorkflow | null>(null)

  // Determinar o nível de aprovação do usuário atual
  const getUserApprovalLevel = () => {
    if (!user) return null

    // Usar diretamente o role do usuário
    switch (user.role) {
      case "tesoureira":
        return "treasurer"
      case "directora_financeira":
        return "financial_director"
      case "reitor":
        return "rector"
      case "admin":
        return "financial_director" // Admins podem aprovar como diretores financeiros por padrão
      default:
        return null
    }
  }

  const userLevel = getUserApprovalLevel()

  useEffect(() => {
    // Carregar workflows do localStorage
    const storedWorkflows = localStorage.getItem("approvalWorkflows")
    if (storedWorkflows) {
      try {
        const parsedWorkflows = JSON.parse(storedWorkflows, (key, value) => {
          if (key === "dataCriacao" || key === "dataVencimento" || key === "approvedAt") {
            return new Date(value)
          }
          return value
        })
        setWorkflows(parsedWorkflows)
      } catch (error) {
        console.error("Erro ao carregar workflows:", error)
        setWorkflows([])
      }
    }
  }, [])

  useEffect(() => {
    // Salvar workflows no localStorage quando houver alterações
    if (workflows.length > 0) {
      localStorage.setItem("approvalWorkflows", JSON.stringify(workflows))
    }
  }, [workflows])

  // Filtrar workflows com base na aba ativa e no termo de pesquisa
  const filteredWorkflows = workflows.filter((workflow) => {
    const matchesSearch =
      workflow.referencia.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workflow.fornecedorNome.toLowerCase().includes(searchTerm.toLowerCase())

    if (activeTab === "pendentes") {
      return (
        matchesSearch &&
        workflow.status !== "approved" &&
        workflow.status !== "rejected" &&
        (userLevel === workflow.currentLevel || userLevel === "rector")
      )
    } else if (activeTab === "aprovados") {
      return matchesSearch && workflow.status === "approved"
    } else if (activeTab === "rejeitados") {
      return matchesSearch && workflow.status === "rejected"
    } else if (activeTab === "todos") {
      return matchesSearch
    }
    return false
  })

  const handleApprove = () => {
    if (!selectedWorkflow || !user) return

    const newStep: ApprovalStep = {
      id: Date.now().toString(),
      level: userLevel as any,
      status: "approved",
      approvedBy: user.username,
      approvedAt: new Date(),
      comments: approvalComment,
    }

    let newStatus: ApprovalStatus = "waiting_next_level"
    let newCurrentLevel = selectedWorkflow.currentLevel

    // Determinar o próximo nível de aprovação
    if (userLevel === "treasurer") {
      // Tesoureira é o nível final para fundo de maneio
      if (selectedWorkflow.tipo === "petty_cash") {
        newStatus = "approved"
      }
    } else if (userLevel === "financial_director") {
      if (selectedWorkflow.tipo === "bank_operation") {
        // Diretora Financeira passa para o Reitor
        newCurrentLevel = "rector"
      } else {
        // Para outros tipos, Diretora Financeira é o nível final
        newStatus = "approved"
      }
    } else if (userLevel === "rector") {
      // Reitor é sempre o nível final
      newStatus = "approved"
    }

    // Atualizar o workflow
    const updatedWorkflow = {
      ...selectedWorkflow,
      status: newStatus,
      currentLevel: newCurrentLevel,
      steps: [...selectedWorkflow.steps, newStep],
    }

    setWorkflows((prev) => prev.map((wf) => (wf.id === updatedWorkflow.id ? updatedWorkflow : wf)))

    // Se o workflow foi completamente aprovado, perguntar se deseja alterar o status do pagamento
    if (newStatus === "approved") {
      setWorkflowToChangeStatus(updatedWorkflow)
      setIsApprovalDialogOpen(false)
      setIsStatusChangeDialogOpen(true)
      return
    } else if (newStatus === "waiting_next_level" && updatedWorkflow.notificationsEnabled) {
      // Notificar próximo nível
      const nextLevelRole =
        newCurrentLevel === "financial_director"
          ? "directora_financeira"
          : newCurrentLevel === "rector"
            ? "reitor"
            : "tesoureira"

      sendNotification(
        "Aprovação Pendente",
        `Um pagamento aguarda sua aprovação: ${selectedWorkflow.referencia} para ${selectedWorkflow.fornecedorNome}.`,
        nextLevelRole,
        "approval",
      )
    }

    setIsApprovalDialogOpen(false)
    setApprovalComment("")
    toast({
      title: "Aprovação realizada",
      description: "O pagamento foi aprovado com sucesso.",
    })
  }

  const handleChangePaymentStatus = (changeStatus: boolean) => {
    if (!workflowToChangeStatus) return

    if (changeStatus) {
      const pagamento = fornecedores
        .find((f) => f.id === workflowToChangeStatus.fornecedorId)
        ?.pagamentos.find((p) => p.id === workflowToChangeStatus.paymentId)

      if (pagamento) {
        const pagamentoAtualizado: Pagamento = {
          ...pagamento,
          estado: "pago",
          dataPagamento: new Date(),
          observacoes: `${pagamento.observacoes ? pagamento.observacoes + " | " : ""}Aprovado por workflow em ${format(
            new Date(),
            "dd/MM/yyyy",
            { locale: pt },
          )}`,
        }

        atualizarPagamento(workflowToChangeStatus.fornecedorId, pagamentoAtualizado)

        // Enviar notificação se estiver habilitado
        if (workflowToChangeStatus.notificationsEnabled) {
          // Notificar o criador do workflow
          sendNotification(
            "Pagamento Aprovado e Marcado como Pago",
            `O pagamento ${workflowToChangeStatus.referencia} para ${workflowToChangeStatus.fornecedorNome} foi aprovado e marcado como pago.`,
            "all",
            "info",
          )
        }

        toast({
          title: "Status alterado",
          description: "O pagamento foi marcado como pago com sucesso.",
        })
      }
    } else {
      // Enviar notificação se estiver habilitado
      if (workflowToChangeStatus.notificationsEnabled) {
        sendNotification(
          "Pagamento Aprovado",
          `O pagamento ${workflowToChangeStatus.referencia} para ${workflowToChangeStatus.fornecedorNome} foi aprovado, mas o status não foi alterado.`,
          "all",
          "info",
        )
      }

      toast({
        title: "Aprovação concluída",
        description: "O pagamento foi aprovado, mas o status não foi alterado.",
      })
    }

    setIsStatusChangeDialogOpen(false)
    setWorkflowToChangeStatus(null)
  }

  const handleReject = () => {
    if (!selectedWorkflow || !user) return

    const newStep: ApprovalStep = {
      id: Date.now().toString(),
      level: userLevel as any,
      status: "rejected",
      approvedBy: user.username,
      approvedAt: new Date(),
      comments: approvalComment,
    }

    // Atualizar o workflow
    const updatedWorkflow = {
      ...selectedWorkflow,
      status: "rejected",
      steps: [...selectedWorkflow.steps, newStep],
    }

    setWorkflows((prev) => prev.map((wf) => (wf.id === updatedWorkflow.id ? updatedWorkflow : wf)))

    // Enviar notificação se estiver habilitado
    if (updatedWorkflow.notificationsEnabled) {
      sendNotification(
        "Pagamento Rejeitado",
        `O pagamento ${selectedWorkflow.referencia} para ${selectedWorkflow.fornecedorNome} foi rejeitado.`,
        "all",
        "warning",
      )
    }

    setIsApprovalDialogOpen(false)
    setApprovalComment("")
    toast({
      title: "Pagamento rejeitado",
      description: "O pagamento foi rejeitado com sucesso.",
    })
  }

  const sendNotification = (
    title: string,
    message: string,
    targetRole?: string,
    type: "approval" | "info" | "warning" = "info",
  ) => {
    // Simular o envio de notificação
    console.log(`Notificação: ${title} - ${message}${targetRole ? ` para ${targetRole}` : ""}`)

    // Em um sistema real, aqui você enviaria notificações por email, SMS ou push
    // Armazenar a notificação no localStorage para simular um sistema de notificações
    const storedNotifications = localStorage.getItem("notifications") || "[]"
    let notifications = []

    try {
      notifications = JSON.parse(storedNotifications)
    } catch (error) {
      console.error("Erro ao carregar notificações:", error)
    }

    notifications.push({
      id: Date.now().toString(),
      title,
      message,
      targetRole,
      timestamp: new Date(),
      read: false,
      priority: type === "approval" ? "high" : "normal",
      type,
    })

    localStorage.setItem("notifications", JSON.stringify(notifications))

    // Remover o flag de toast mostrado para garantir que novos toasts apareçam
    if (type === "approval") {
      localStorage.removeItem("notificationToastShown")
    }

    toast({
      title: "Notificação enviada",
      description: `${title}: ${message}`,
    })
  }

  const toggleNotifications = (workflow: ApprovalWorkflow) => {
    const updatedWorkflow = {
      ...workflow,
      notificationsEnabled: !workflow.notificationsEnabled,
    }

    setWorkflows((prev) => prev.map((wf) => (wf.id === updatedWorkflow.id ? updatedWorkflow : wf)))

    toast({
      title: `Notificações ${updatedWorkflow.notificationsEnabled ? "ativadas" : "desativadas"}`,
      description: `As notificações para este pagamento foram ${
        updatedWorkflow.notificationsEnabled ? "ativadas" : "desativadas"
      }.`,
    })
  }

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Pendente
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" /> Aprovado
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
            <XCircle className="h-3 w-3" /> Rejeitado
          </Badge>
        )
      case "waiting_next_level":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Aguardando Próximo Nível
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getLevelName = (level: string) => {
    switch (level) {
      case "treasurer":
        return "Tesoureira"
      case "financial_director":
        return "Diretora Financeira"
      case "rector":
        return "Reitor"
      default:
        return level
    }
  }

  const getTypeName = (type: string) => {
    switch (type) {
      case "bank_operation":
        return "Operação Bancária"
      case "petty_cash":
        return "Fundo de Maneio"
      case "other":
        return "Outro"
      default:
        return type
    }
  }

  // Verificar se o usuário atual pode aprovar o workflow selecionado
  const canApprove = (workflow: ApprovalWorkflow) => {
    if (!userLevel) return false

    // Verificar se o nível atual do workflow corresponde ao nível do usuário
    if (workflow.currentLevel === userLevel) return true

    // Caso especial: Reitor pode aprovar qualquer workflow de operação bancária
    if (userLevel === "rector" && workflow.tipo === "bank_operation") return true

    return false
  }

  return (
    <Card>
      <CardHeader className="bg-red-700 text-white">
        <CardTitle>Workflow de Aprovação</CardTitle>
        <CardDescription className="text-red-100">
          Gerencie as aprovações de pagamentos conforme o fluxo definido
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <Input
              placeholder="Pesquisar por referência ou fornecedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64"
            />
            {userLevel && (
              <div className="bg-blue-50 p-2 rounded-md border border-blue-200 text-blue-700 text-sm">
                Seu nível de aprovação: <strong>{getLevelName(userLevel)}</strong>
              </div>
            )}
          </div>

          <Tabs defaultValue="pendentes" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="pendentes" className="relative">
                Pendentes
                {filteredWorkflows.filter(
                  (w) =>
                    w.status !== "approved" &&
                    w.status !== "rejected" &&
                    (userLevel === w.currentLevel || userLevel === "rector"),
                ).length > 0 && (
                  <Badge className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-red-500 text-white text-xs">
                    {
                      filteredWorkflows.filter(
                        (w) =>
                          w.status !== "approved" &&
                          w.status !== "rejected" &&
                          (userLevel === w.currentLevel || userLevel === "rector"),
                      ).length
                    }
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="aprovados">Aprovados</TabsTrigger>
              <TabsTrigger value="rejeitados">Rejeitados</TabsTrigger>
              <TabsTrigger value="todos">Todos</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {filteredWorkflows.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhum workflow de aprovação encontrado nesta categoria.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referência</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nível Atual</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Criação</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWorkflows.map((workflow) => (
                      <TableRow
                        key={workflow.id}
                        className={
                          workflow.status !== "approved" &&
                          workflow.status !== "rejected" &&
                          (userLevel === workflow.currentLevel || userLevel === "rector")
                            ? "bg-red-50"
                            : ""
                        }
                      >
                        <TableCell className="font-medium">{workflow.referencia}</TableCell>
                        <TableCell>{workflow.fornecedorNome}</TableCell>
                        <TableCell>{workflow.valor.toFixed(2)} MZN</TableCell>
                        <TableCell>{getTypeName(workflow.tipo)}</TableCell>
                        <TableCell>{getLevelName(workflow.currentLevel)}</TableCell>
                        <TableCell>{getStatusBadge(workflow.status)}</TableCell>
                        <TableCell>{format(workflow.dataCriacao, "dd/MM/yyyy", { locale: pt })}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedWorkflow(workflow)
                                setIsDetailsOpen(true)
                              }}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            {workflow.status !== "approved" &&
                              workflow.status !== "rejected" &&
                              canApprove(workflow) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                  onClick={() => {
                                    setSelectedWorkflow(workflow)
                                    setIsApprovalDialogOpen(true)
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleNotifications(workflow)}
                              className={
                                workflow.notificationsEnabled
                                  ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                              }
                            >
                              {workflow.notificationsEnabled ? (
                                <Bell className="h-4 w-4" />
                              ) : (
                                <BellOff className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Diálogo de Detalhes */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Workflow de Aprovação</DialogTitle>
              <DialogDescription>
                Informações detalhadas sobre o processo de aprovação deste pagamento.
              </DialogDescription>
            </DialogHeader>
            {selectedWorkflow && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-sm text-gray-500">Referência</h3>
                    <p>{selectedWorkflow.referencia}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-500">Fornecedor</h3>
                    <p>{selectedWorkflow.fornecedorNome}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-500">Valor</h3>
                    <p>{selectedWorkflow.valor.toFixed(2)} MZN</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-500">Método</h3>
                    <p>{selectedWorkflow.metodo}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-500">Tipo</h3>
                    <p>{getTypeName(selectedWorkflow.tipo)}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-500">Status</h3>
                    <p>{getStatusBadge(selectedWorkflow.status)}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-500">Data de Criação</h3>
                    <p>{format(selectedWorkflow.dataCriacao, "dd/MM/yyyy", { locale: pt })}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-500">Data de Vencimento</h3>
                    <p>{format(selectedWorkflow.dataVencimento, "dd/MM/yyyy", { locale: pt })}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-500">Criado Por</h3>
                    <p>{selectedWorkflow.createdBy}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-500">Nível Atual</h3>
                    <p>{getLevelName(selectedWorkflow.currentLevel)}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-gray-500 mb-2">Descrição</h3>
                  <p className="bg-gray-50 p-3 rounded-md border border-gray-200">{selectedWorkflow.descricao}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-gray-500 mb-2">Histórico de Aprovações</h3>
                  <div className="space-y-3">
                    {selectedWorkflow.steps.map((step) => (
                      <div
                        key={step.id}
                        className={`p-3 rounded-md border ${
                          step.status === "approved"
                            ? "bg-green-50 border-green-200"
                            : step.status === "rejected"
                              ? "bg-red-50 border-red-200"
                              : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex justify-between">
                          <span className="font-medium">
                            {getLevelName(step.level)} - {step.status === "approved" ? "Aprovado" : "Rejeitado"}
                          </span>
                          <span className="text-sm text-gray-500">
                            {step.approvedAt ? format(step.approvedAt, "dd/MM/yyyy HH:mm", { locale: pt }) : ""}
                          </span>
                        </div>
                        <div className="text-sm mt-1">
                          <span className="text-gray-500">Por:</span> {step.approvedBy}
                        </div>
                        {step.comments && (
                          <div className="mt-2 text-sm">
                            <span className="text-gray-500">Comentários:</span> {step.comments}
                          </div>
                        )}
                      </div>
                    ))}

                    {selectedWorkflow.steps.length === 0 && (
                      <div className="text-center py-4 text-gray-500">Nenhuma etapa de aprovação registrada.</div>
                    )}
                  </div>
                </div>

                {selectedWorkflow.status !== "approved" &&
                  selectedWorkflow.status !== "rejected" &&
                  canApprove(selectedWorkflow) && (
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsDetailsOpen(false)
                          setIsApprovalDialogOpen(true)
                        }}
                      >
                        Aprovar/Rejeitar
                      </Button>
                    </div>
                  )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Diálogo de Aprovação */}
        <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aprovar ou Rejeitar Pagamento</DialogTitle>
              <DialogDescription>
                Revise os detalhes do pagamento e decida se deseja aprová-lo ou rejeitá-lo.
              </DialogDescription>
            </DialogHeader>
            {selectedWorkflow && (
              <div className="space-y-4 py-4">
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <h3 className="font-semibold text-sm text-gray-500">Referência</h3>
                      <p>{selectedWorkflow.referencia}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-gray-500">Fornecedor</h3>
                      <p>{selectedWorkflow.fornecedorNome}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-gray-500">Valor</h3>
                      <p>{selectedWorkflow.valor.toFixed(2)} MZN</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-gray-500">Tipo</h3>
                      <p>{getTypeName(selectedWorkflow.tipo)}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="approval-comment">Comentários (opcional)</Label>
                  <Textarea
                    id="approval-comment"
                    placeholder="Adicione comentários sobre sua decisão..."
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                  />
                </div>

                <div className="flex justify-between">
                  <Button variant="destructive" onClick={handleReject}>
                    <XCircle className="mr-2 h-4 w-4" />
                    Rejeitar
                  </Button>
                  <Button variant="default" onClick={handleApprove}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Aprovar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Diálogo para alterar status do pagamento */}
        <Dialog open={isStatusChangeDialogOpen} onOpenChange={setIsStatusChangeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar Status do Pagamento</DialogTitle>
              <DialogDescription>
                O pagamento foi aprovado com sucesso. Deseja alterar o status para "Pago"?
              </DialogDescription>
            </DialogHeader>
            {workflowToChangeStatus && (
              <div className="space-y-4 py-4">
                <div className="bg-green-50 p-4 rounded-md border border-green-200">
                  <div className="flex items-center gap-2 text-green-700 mb-2">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Pagamento Aprovado</span>
                  </div>
                  <p>
                    O pagamento <strong>{workflowToChangeStatus.referencia}</strong> para{" "}
                    <strong>{workflowToChangeStatus.fornecedorNome}</strong> foi aprovado com sucesso.
                  </p>
                </div>

                <p className="text-gray-600">
                  Alterar o status do pagamento para "Pago" irá atualizar o registro no sistema e refletir nas
                  estatísticas financeiras. Esta ação não pode ser desfeita.
                </p>
              </div>
            )}
            <DialogFooter className="flex justify-between">
              <Button variant="outline" onClick={() => handleChangePaymentStatus(false)}>
                Não, Manter Status Atual
              </Button>
              <Button variant="default" onClick={() => handleChangePaymentStatus(true)}>
                Sim, Marcar como Pago
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

