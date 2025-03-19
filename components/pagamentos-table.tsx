"use client"

import { DialogTrigger } from "@/components/ui/dialog"

import { useState } from "react"
import {
  Check,
  CreditCard,
  Download,
  FileText,
  MoreHorizontal,
  Plus,
  Search,
  Trash,
  Printer,
  Bell,
  Edit,
  ChevronLeft,
  ChevronRight,
  History,
  Wallet,
} from "lucide-react"
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns"
import { pt } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { toast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { PrintLayout } from "@/components/print-layout"
import { useAppContext } from "@/contexts/AppContext"
import type { Pagamento } from "@/types/fornecedor"
import { DetalhesPagamento } from "@/components/detalhes-pagamento"
import { NotificarFornecedor } from "@/components/notificar-fornecedor"
import { useAuth } from "@/hooks/use-auth"
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PaymentHistory } from "@/components/payment-history"
import { LembreteDocumentos } from "@/components/lembrete-documentos"

export function PagamentosTable() {
  const { user } = useAuth()
  const {
    fornecedores,
    adicionarPagamento,
    atualizarPagamento,
    removerPagamento,
    isAdmin,
    hasPermission,
    adicionarFornecedor,
    adicionarMovimentoFundoManeio,
  } = useAppContext()
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false)
  const [isFundoManeioDialogOpen, setIsFundoManeioDialogOpen] = useState(false)
  const [newPagamento, setNewPagamento] = useState<Partial<Pagamento>>({
    estado: "pendente",
    metodo: "transferência",
    tipo: "fatura",
    documentoRequerido: "factura", // Valor padrão
  })
  const [fornecedorNome, setFornecedorNome] = useState("")
  const [pagamentoSelecionado, setPagamentoSelecionado] = useState<
    (Pagamento & { fornecedorNome: string; fornecedorId: string }) | null
  >(null)
  const [pagamentoParaNotificar, setPagamentoParaNotificar] = useState<(Pagamento & { fornecedorNome: string }) | null>(
    null,
  )
  const [mesSelecionado, setMesSelecionado] = useState<Date>(startOfMonth(new Date()))
  const [pagamentoParaDocumentos, setPagamentoParaDocumentos] = useState<
    (Pagamento & { fornecedorNome: string; fornecedorId: string }) | null
  >(null)
  const [pagamentoParaFundoManeio, setPagamentoParaFundoManeio] = useState<
    (Pagamento & { fornecedorNome: string; fornecedorId: string }) | null
  >(null)
  const [descricaoFundoManeio, setDescricaoFundoManeio] = useState("")

  const [isEmitirChequeDialogOpen, setIsEmitirChequeDialogOpen] = useState(false)
  const [pagamentoParaCheque, setPagamentoParaCheque] = useState<
    (Pagamento & { fornecedorNome: string; fornecedorId: string }) | null
  >(null)
  const [novoCheque, setNovoCheque] = useState<{ numero: string; dataEmissao: Date | undefined }>({
    numero: "",
    dataEmissao: new Date(),
  })

  const todosOsPagamentos = fornecedores.flatMap((fornecedor) =>
    fornecedor.pagamentos.map((pagamento) => ({
      ...pagamento,
      fornecedorId: fornecedor.id,
      fornecedorNome: fornecedor.nome,
    })),
  )

  const pagamentosDoMes = todosOsPagamentos.filter((pagamento) => {
    const dataPagamento = pagamento.dataPagamento
      ? new Date(pagamento.dataPagamento)
      : new Date(pagamento.dataVencimento)
    return dataPagamento >= startOfMonth(mesSelecionado) && dataPagamento <= endOfMonth(mesSelecionado)
  })

  const filteredPagamentos = pagamentosDoMes.filter(
    (pagamento) =>
      pagamento.referencia.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pagamento.fornecedorNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pagamento.departamento.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleAddPagamento = () => {
    if (!fornecedorNome) {
      toast({
        title: "Erro",
        description: "Por favor, insira o nome do fornecedor.",
        variant: "destructive",
      })
      return
    }

    if (
      !newPagamento.referencia ||
      !newPagamento.valor ||
      !newPagamento.dataVencimento ||
      !newPagamento.estado ||
      !newPagamento.metodo ||
      !newPagamento.departamento
    ) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      })
      return
    }

    let fornecedor = fornecedores.find((f) => f.nome.toLowerCase() === fornecedorNome.toLowerCase())
    if (!fornecedor) {
      fornecedor = {
        id: Date.now().toString(),
        nome: fornecedorNome,
        pagamentos: [],
      }
      adicionarFornecedor(fornecedor)
    }

    const novoPagamento: Pagamento = {
      id: Date.now().toString(),
      referencia: newPagamento.referencia,
      valor: newPagamento.valor,
      dataVencimento: newPagamento.dataVencimento,
      dataPagamento: newPagamento.dataPagamento || null,
      estado: newPagamento.estado as "pendente" | "pago" | "atrasado" | "cancelado",
      metodo: newPagamento.metodo as "transferência" | "cheque" | "débito direto" | "fundo de maneio" | "outro",
      departamento: newPagamento.departamento,
      observacoes: newPagamento.observacoes || "",
      descricao: newPagamento.descricao || "",
      tipo: newPagamento.tipo as "fatura" | "cotacao",
      documentoRequerido: newPagamento.documentoRequerido as "factura" | "vd" | "nenhum",
    }

    adicionarPagamento(fornecedor.id, novoPagamento)
    setNewPagamento({
      estado: "pendente",
      metodo: "transferência",
      tipo: "fatura",
      documentoRequerido: "factura",
    })
    setFornecedorNome("")
    setIsAddDialogOpen(false)
    toast({
      title: "Pagamento adicionado",
      description: "O novo pagamento foi adicionado com sucesso.",
    })
  }

  // Modificar a função handleEditPagamento para sincronizar com fundo de maneio e outros métodos de pagamento

  const handleEditPagamento = () => {
    if (pagamentoSelecionado) {
      const oldFornecedor = fornecedores.find((f) => f.id === pagamentoSelecionado.fornecedorId)
      let newFornecedor = fornecedores.find(
        (f) => f.nome.toLowerCase() === pagamentoSelecionado.fornecedorNome.toLowerCase(),
      )

      if (!newFornecedor) {
        newFornecedor = {
          id: Date.now().toString(),
          nome: pagamentoSelecionado.fornecedorNome,
          pagamentos: [],
        }
        adicionarFornecedor(newFornecedor)
      }

      // Certifique-se de que o usuário atual está definido
      if (!user) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para editar pagamentos.",
          variant: "destructive",
        })
        return
      }

      // Verificar se o método de pagamento foi alterado para fundo de maneio
      const pagamentoOriginal = oldFornecedor?.pagamentos.find((p) => p.id === pagamentoSelecionado.id)

      // Se o pagamento foi alterado para "fundo de maneio" e está marcado como pago
      if (
        pagamentoSelecionado.metodo === "fundo de maneio" &&
        pagamentoSelecionado.estado === "pago" &&
        (!pagamentoOriginal?.metodo ||
          pagamentoOriginal.metodo !== "fundo de maneio" ||
          !pagamentoOriginal.fundoManeioId)
      ) {
        // Criar um movimento no fundo de maneio
        const descricao = `Pagamento a ${pagamentoSelecionado.fornecedorNome} - Ref: ${pagamentoSelecionado.referencia}`

        const movimentoId = adicionarMovimentoFundoManeio({
          data: pagamentoSelecionado.dataPagamento || new Date(),
          tipo: "saida",
          valor: pagamentoSelecionado.valor,
          descricao: descricao,
          pagamentoId: pagamentoSelecionado.id,
          pagamentoReferencia: pagamentoSelecionado.referencia,
          fornecedorNome: pagamentoSelecionado.fornecedorNome,
        })

        if (movimentoId) {
          // Atualizar o pagamento com a referência ao movimento do fundo de maneio
          pagamentoSelecionado.fundoManeioId = movimentoId
        } else {
          toast({
            title: "Aviso",
            description: "Não foi possível adicionar o movimento ao fundo de maneio. Verifique se há saldo suficiente.",
            variant: "warning",
          })
          // Continuar com a edição mesmo sem criar o movimento no fundo de maneio
        }
      }

      // Se o método foi alterado de "fundo de maneio" para outro, remover a referência no fundo de maneio
      if (
        pagamentoOriginal?.metodo === "fundo de maneio" &&
        pagamentoSelecionado.metodo !== "fundo de maneio" &&
        pagamentoOriginal.fundoManeioId
      ) {
        // Remover o movimento do fundo de maneio ou marcá-lo como não relacionado ao pagamento
        removerReferenciaFundoManeio(pagamentoOriginal.fundoManeioId)

        // Remover a referência ao fundo de maneio no pagamento
        pagamentoSelecionado.fundoManeioId = undefined
      }

      // Verificar se o método de pagamento foi alterado para cheque
      if (
        pagamentoSelecionado.metodo === "cheque" &&
        pagamentoSelecionado.estado === "pago" &&
        (!pagamentoOriginal?.metodo || pagamentoOriginal.metodo !== "cheque")
      ) {
        // Verificar se já existe um cheque para este pagamento
        const chequeExistente = verificarChequeExistente(pagamentoSelecionado.id)

        if (!chequeExistente) {
          // Mostrar mensagem informando que é necessário emitir um cheque
          toast({
            title: "Ação necessária",
            description:
              "Este pagamento foi marcado como pago por cheque. Use a opção 'Emitir Cheque' para registrar os detalhes do cheque.",
          })
        }
      }

      // Verificar se o método foi alterado de "cheque" para outro
      if (pagamentoOriginal?.metodo === "cheque" && pagamentoSelecionado.metodo !== "cheque") {
        // Remover a referência ao pagamento no cheque
        removerReferenciaChequePagamento(pagamentoSelecionado.id)
      }

      if (oldFornecedor?.id !== newFornecedor.id) {
        removerPagamento(oldFornecedor!.id, pagamentoSelecionado.id)
        adicionarPagamento(newFornecedor.id, {
          ...pagamentoSelecionado,
          fornecedorId: newFornecedor.id,
        })
      } else {
        atualizarPagamento(newFornecedor.id, pagamentoSelecionado)
      }

      setIsEditDialogOpen(false)
      setPagamentoSelecionado(null)
      toast({
        title: "Pagamento atualizado",
        description: "O pagamento foi atualizado com sucesso.",
      })
    }
  }

  // Adicionar estas novas funções auxiliares após handleEditPagamento

  // Função para remover referência no fundo de maneio
  const removerReferenciaFundoManeio = (fundoManeioId: string) => {
    const fundosManeio = JSON.parse(localStorage.getItem("fundosManeio") || "[]", (key, value) => {
      if (key === "mes" || key === "data") {
        return new Date(value)
      }
      return value
    })

    let atualizado = false

    // Procurar o movimento e remover a referência ao pagamento
    for (const fundo of fundosManeio) {
      const movimentoIndex = fundo.movimentos.findIndex((m: any) => m.id === fundoManeioId)
      if (movimentoIndex !== -1) {
        // Remover apenas as referências ao pagamento, mantendo o movimento
        fundo.movimentos[movimentoIndex].pagamentoId = undefined
        fundo.movimentos[movimentoIndex].pagamentoReferencia = undefined
        atualizado = true
        break
      }
    }

    if (atualizado) {
      localStorage.setItem("fundosManeio", JSON.stringify(fundosManeio))
    }
  }

  // Função para verificar se já existe um cheque para o pagamento
  const verificarChequeExistente = (pagamentoId: string) => {
    const cheques = JSON.parse(localStorage.getItem("cheques") || "[]")
    return cheques.some((cheque: any) => cheque.pagamentoId === pagamentoId)
  }

  // Função para remover referência ao pagamento no cheque
  const removerReferenciaChequePagamento = (pagamentoId: string) => {
    const cheques = JSON.parse(localStorage.getItem("cheques") || "[]")

    let atualizado = false

    // Procurar o cheque e remover a referência ao pagamento
    for (const cheque of cheques) {
      if (cheque.pagamentoId === pagamentoId) {
        cheque.pagamentoId = undefined
        cheque.pagamentoReferencia = undefined
        atualizado = true
      }
    }

    if (atualizado) {
      localStorage.setItem("cheques", JSON.stringify(cheques))
    }
  }

  const handleDeletePagamento = (fornecedorId: string, pagamentoId: string) => {
    if (user?.username === "Vinildo Mondlane" || user?.username === "Benigna Magaia" || isAdmin()) {
      removerPagamento(fornecedorId, pagamentoId)
      toast({
        title: "Pagamento eliminado",
        description: "O pagamento foi removido com sucesso.",
      })
    } else {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para eliminar pagamentos.",
        variant: "destructive",
      })
    }
  }

  // Adicionar sincronização com o calendário fiscal ao marcar pagamento como pago
  // Modifique a função handleMarkAsPaid:

  const handleMarkAsPaid = (fornecedorId: string, pagamentoId: string) => {
    const pagamento = todosOsPagamentos.find((p) => p.id === pagamentoId)
    if (pagamento) {
      const documentoRequerido = pagamento.documentoRequerido || "factura"

      const pagamentoAtualizado = {
        ...pagamento,
        estado: "pago",
        dataPagamento: new Date(),
      }

      // Inicializar os campos de documentos com base no tipo requerido
      if (documentoRequerido === "factura") {
        pagamentoAtualizado.facturaRecebida = false
        pagamentoAtualizado.reciboRecebido = false
      } else if (documentoRequerido === "vd") {
        pagamentoAtualizado.vdRecebido = false
      }

      atualizarPagamento(fornecedorId, pagamentoAtualizado)

      // Atualizar evento correspondente no calendário fiscal
      atualizarEventoCalendarioFiscal(pagamentoId)

      // Mostrar o lembrete de documentos apenas se for necessário algum documento
      if (documentoRequerido !== "nenhum") {
        setPagamentoParaDocumentos({
          ...pagamentoAtualizado,
          fornecedorId,
          fornecedorNome: pagamento.fornecedorNome,
        })
      }

      toast({
        title: "Pagamento atualizado",
        description: "O pagamento foi marcado como pago.",
      })
    }
  }

  // Adicionar esta nova função após handleMarkAsPaid:

  // Função para atualizar evento no calendário fiscal
  const atualizarEventoCalendarioFiscal = (pagamentoId: string) => {
    // Carregar eventos do calendário fiscal
    const eventosFiscaisString = localStorage.getItem("eventosFiscais")
    if (!eventosFiscaisString) return

    try {
      const eventosFiscais = JSON.parse(eventosFiscaisString, (key, value) => {
        if (key === "data") {
          return new Date(value)
        }
        return value
      })

      // Atualizar eventos relacionados ao pagamento
      const eventosAtualizados = eventosFiscais.map((evento) => {
        if (evento.pagamentoId === pagamentoId) {
          return { ...evento, concluido: true }
        }
        return evento
      })

      // Salvar eventos atualizados
      localStorage.setItem("eventosFiscais", JSON.stringify(eventosAtualizados))
    } catch (error) {
      console.error("Erro ao atualizar evento no calendário fiscal:", error)
    }
  }

  // Adicionar uma nova função para verificar o status do workflow antes de marcar como pago

  // Adicionar a seguinte função após a função handleMarkAsPaid:

  const verificarWorkflowAprovacao = (pagamento: any) => {
    // Verificar se existe um workflow de aprovação para este pagamento
    const storedWorkflows = localStorage.getItem("approvalWorkflows")
    if (!storedWorkflows) return false

    try {
      const workflows = JSON.parse(storedWorkflows, (key, value) => {
        if (key === "dataCriacao" || key === "dataVencimento" || key === "approvedAt") {
          return new Date(value)
        }
        return value
      })

      // Verificar se existe um workflow para este pagamento
      const workflowExistente = workflows.find((w: any) => w.paymentId === pagamento.id)

      // Se existe um workflow e ele está aprovado, retornar true
      if (workflowExistente && workflowExistente.status === "approved") {
        return true
      }

      return false
    } catch (error) {
      console.error("Erro ao verificar workflow:", error)
      return false
    }
  }

  const handlePagarComFundoManeio = () => {
    if (!pagamentoParaFundoManeio) {
      toast({
        title: "Erro",
        description: "Pagamento não selecionado.",
        variant: "destructive",
      })
      return
    }

    // Usar uma descrição padrão se não for fornecida
    const descricaoEfetiva =
      descricaoFundoManeio ||
      `Pagamento a ${pagamentoParaFundoManeio.fornecedorNome} - Ref: ${pagamentoParaFundoManeio.referencia}`

    // Criar um movimento de saída no fundo de maneio
    const movimentoId = adicionarMovimentoFundoManeio({
      data: new Date(),
      tipo: "saida",
      valor: pagamentoParaFundoManeio.valor,
      descricao: descricaoEfetiva,
      pagamentoId: pagamentoParaFundoManeio.id,
      pagamentoReferencia: pagamentoParaFundoManeio.referencia,
      fornecedorNome: pagamentoParaFundoManeio.fornecedorNome,
    })

    if (!movimentoId) {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o movimento ao fundo de maneio. Verifique se há saldo suficiente.",
        variant: "destructive",
      })
      return
    }

    // Atualizar o pagamento
    const pagamentoAtualizado = {
      ...pagamentoParaFundoManeio,
      estado: "pago",
      dataPagamento: new Date(),
      metodo: "fundo de maneio",
      fundoManeioId: movimentoId,
      observacoes: `${pagamentoParaFundoManeio.observacoes ? pagamentoParaFundoManeio.observacoes + " | " : ""}Pago com Fundo de Maneio em ${format(new Date(), "dd/MM/yyyy", { locale: pt })}`,
    }

    atualizarPagamento(pagamentoParaFundoManeio.fornecedorId, pagamentoAtualizado)

    setIsFundoManeioDialogOpen(false)
    setPagamentoParaFundoManeio(null)
    setDescricaoFundoManeio("")

    toast({
      title: "Pagamento realizado",
      description: "O pagamento foi realizado com sucesso utilizando o fundo de maneio.",
    })
  }

  const handleExportPDF = (pagamento: Pagamento) => {
    console.log("Exportando para PDF:", pagamento)
    toast({
      title: "PDF exportado",
      description: `O PDF do pagamento ${pagamento.referencia} foi gerado.`,
    })
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "pendente":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Pendente
          </Badge>
        )
      case "pago":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Pago
          </Badge>
        )
      case "atrasado":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Atrasado
          </Badge>
        )
      case "cancelado":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            Cancelado
          </Badge>
        )
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
  }

  const getMetodoBadge = (metodo: string) => {
    switch (metodo) {
      case "fundo de maneio":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Fundo de Maneio
          </Badge>
        )
      default:
        return metodo
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleMesAnterior = () => {
    setMesSelecionado((mesAtual) => subMonths(mesAtual, 1))
  }

  const handleProximoMes = () => {
    setMesSelecionado((mesAtual) => addMonths(mesAtual, 1))
  }

  const handleEmitirCheque = (pagamento: any) => {
    setPagamentoParaCheque(pagamento)
    setNovoCheque({
      numero: "",
      dataEmissao: new Date(),
    })
    setIsEmitirChequeDialogOpen(true)
  }

  const handleSalvarCheque = () => {
    if (!pagamentoParaCheque || !novoCheque.numero || !novoCheque.dataEmissao) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      })
      return
    }

    // Atualizar o pagamento para indicar que está sendo pago por cheque
    atualizarPagamento(pagamentoParaCheque.fornecedorId, {
      ...pagamentoParaCheque,
      metodo: "cheque",
      observacoes: `${pagamentoParaCheque.observacoes ? pagamentoParaCheque.observacoes + " | " : ""}Cheque nº ${novoCheque.numero} emitido em ${format(novoCheque.dataEmissao, "dd/MM/yyyy", { locale: pt })}`,
    })

    // Adicionar o cheque ao controle de cheques
    const chequeToAdd = {
      id: Date.now().toString(),
      numero: novoCheque.numero,
      valor: pagamentoParaCheque.valor,
      beneficiario: pagamentoParaCheque.fornecedorNome,
      dataEmissao: novoCheque.dataEmissao,
      dataCompensacao: null,
      estado: "pendente",
      pagamentoId: pagamentoParaCheque.id,
      pagamentoReferencia: pagamentoParaCheque.referencia,
      fornecedorNome: pagamentoParaCheque.fornecedorNome,
    }

    // Carregar cheques existentes do localStorage
    const chequesExistentes = JSON.parse(localStorage.getItem("cheques") || "[]")

    // Adicionar o novo cheque
    const chequeAtualizados = [...chequesExistentes, chequeToAdd]

    // Salvar no localStorage
    localStorage.setItem("cheques", JSON.stringify(chequeAtualizados))

    // Fechar o diálogo
    setIsEmitirChequeDialogOpen(false)
    setPagamentoParaCheque(null)

    toast({
      title: "Cheque emitido",
      description: "O cheque foi emitido e adicionado ao controle de cheques.",
    })
  }

  // Modificar a função de marcar pagamento como pago para sincronizar com reconciliação bancária
  // Procurar a função que marca pagamentos como pagos e modificá-la para:

  const marcarComoPago = (pagamento: Pagamento, fornecedorId: string) => {
    // Verificar se o pagamento requer aprovação
    const requerAprovacao =
      pagamento.valor > 10000 || pagamento.metodo === "transferência" || pagamento.metodo === "cheque"

    if (requerAprovacao) {
      // Verificar se já existe um workflow aprovado
      const workflowAprovado = verificarWorkflowAprovacao(pagamento)

      if (!workflowAprovado) {
        // Perguntar ao usuário se deseja criar um workflow de aprovação
        if (confirm("Este pagamento requer aprovação. Deseja criar um workflow de aprovação?")) {
          // Redirecionar para a página de workflow
          window.location.href = "/dashboard/workflow"
          return
        } else {
          // Se o usuário não quiser criar um workflow, verificar se tem permissão para prosseguir
          if (!hasPermission("approve_bank_operations")) {
            toast({
              title: "Acesso negado",
              description: "Você não tem permissão para marcar este pagamento como pago sem aprovação.",
              variant: "destructive",
            })
            return
          }
        }
      }
    }

    const pagamentoAtualizado = {
      ...pagamento,
      estado: "pago",
      dataPagamento: new Date(),
    }

    atualizarPagamento(fornecedorId, pagamentoAtualizado)

    // Se o pagamento for por cheque ou transferência, adicionar à reconciliação bancária
    if (pagamentoAtualizado.metodo === "cheque" || pagamentoAtualizado.metodo === "transferencia") {
      adicionarTransacaoBancaria(pagamentoAtualizado, fornecedorId)
    }

    toast({
      title: "Pagamento atualizado",
      description: `O pagamento ${pagamento.referencia} foi marcado como pago.`,
    })
  }

  // Adicionar função para criar uma transação bancária a partir de um pagamento
  // Adicionar após a função marcarComoPago:

  const adicionarTransacaoBancaria = (pagamento: Pagamento, fornecedorId: string) => {
    const fornecedor = fornecedores.find((f) => f.id === fornecedorId)
    if (!fornecedor) return

    // Verificar se já existe uma transação para este pagamento
    const transacoesArmazenadas = localStorage.getItem("transacoesBancarias")

    let descricao = ""
    const metodo = pagamento.metodo || "outro"
    let chequeId = undefined
    let chequeNumero = undefined

    // Extrair número do cheque das observações, se for um pagamento por cheque
    if (pagamento.metodo === "cheque" && pagamento.observacoes) {
      const chequeMatch =
        pagamento.observacoes.match(/cheque\s+n[º°]?\s*(\d+)/i) ||
        pagamento.observacoes.match(/ch\s+n[º°]?\s*(\d+)/i) ||
        pagamento.observacoes.match(/ch\s*(\d+)/i)

      if (chequeMatch && chequeMatch[1]) {
        chequeNumero = chequeMatch[1]

        // Verificar se existe um cheque com este número
        const chequesArmazenados = localStorage.getItem("cheques")
        if (chequesArmazenados) {
          try {
            const chequesParsed = JSON.parse(chequesArmazenados)
            const chequeEncontrado = chequesParsed.find((c: any) => c.numero === chequeNumero)

            if (chequeEncontrado) {
              chequeId = chequeEncontrado.id
            }
          } catch (error) {
            console.error("Erro ao processar cheques:", error)
          }
        }
      }

      descricao = `Pagamento por cheque - ${fornecedor.nome} - ${pagamento.referencia}`
    } else if (pagamento.metodo === "transferencia") {
      descricao = `Transferência bancária - ${fornecedor.nome} - ${pagamento.referencia}`
    } else {
      descricao = `Pagamento - ${fornecedor.nome} - ${pagamento.referencia}`
    }

    const novaTransacao = {
      id: `pag-${pagamento.id}`,
      data: pagamento.dataPagamento || new Date(),
      descricao: descricao,
      valor: pagamento.valor,
      tipo: "debito",
      reconciliado: true,
      pagamentoId: pagamento.id,
      chequeId: chequeId,
      chequeNumero: chequeNumero,
      metodo: metodo,
    }

    if (transacoesArmazenadas) {
      try {
        const transacoesParsed = JSON.parse(transacoesArmazenadas)

        // Verificar se já existe uma transação para este pagamento
        const transacaoExistente = transacoesParsed.find((t: any) => t.pagamentoId === pagamento.id)
        if (transacaoExistente) {
          // Atualizar a transação existente
          const transacoesAtualizadas = transacoesParsed.map((t: any) =>
            t.pagamentoId === pagamento.id ? novaTransacao : t,
          )
          localStorage.setItem("transacoesBancarias", JSON.stringify(transacoesAtualizadas))
        } else {
          // Adicionar nova transação
          const transacoesAtualizadas = [...transacoesParsed, novaTransacao]
          localStorage.setItem("transacoesBancarias", JSON.stringify(transacoesAtualizadas))
        }
      } catch (error) {
        console.error("Erro ao processar transações bancárias:", error)

        // Se houver erro, criar nova lista
        localStorage.setItem("transacoesBancarias", JSON.stringify([novaTransacao]))
      }
    } else {
      // Não existe lista de transações, criar nova
      localStorage.setItem("transacoesBancarias", JSON.stringify([novaTransacao]))
    }
  }

  return (
    <PrintLayout title="Relatório de Pagamentos">
      <div className="space-y-4">
        {isAdmin() && (
          <Alert>
            <AlertTitle>Modo Administrador Ativo</AlertTitle>
            <AlertDescription>
              Você está operando em nome de VMONDLANE. Todas as ações serão registradas.
            </AlertDescription>
          </Alert>
        )}
        <CardHeader className="bg-gray-100">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Relatório de Pagamentos</CardTitle>
              <CardDescription>Gerencie os pagamentos do sistema</CardDescription>
            </div>
            <div className="space-x-2">
              <Button onClick={handlePrint} className="print:hidden bg-gray-200 text-gray-800 hover:bg-gray-300">
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
            </div>
          </div>
        </CardHeader>
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar pagamentos..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={handleMesAnterior}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-semibold">{format(mesSelecionado, "MMMM yyyy", { locale: pt })}</span>
            <Button onClick={handleProximoMes}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gray-200 text-gray-800 hover:bg-gray-300 w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Pagamento
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Pagamento</DialogTitle>
                  <DialogDescription>Preencha os detalhes do pagamento a ser adicionado ao sistema.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="fornecedor" className="text-right">
                      Fornecedor
                    </Label>
                    <Input
                      id="fornecedor"
                      value={fornecedorNome}
                      onChange={(e) => setFornecedorNome(e.target.value)}
                      className="col-span-3"
                      placeholder="Digite o nome do fornecedor"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="referencia" className="text-right">
                      Referência
                    </Label>
                    <Input
                      id="referencia"
                      value={newPagamento.referencia || ""}
                      onChange={(e) => setNewPagamento({ ...newPagamento, referencia: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="valor" className="text-right">
                      Valor (MT)
                    </Label>
                    <Input
                      id="valor"
                      type="number"
                      step="0.01"
                      value={newPagamento.valor || ""}
                      onChange={(e) => setNewPagamento({ ...newPagamento, valor: Number(e.target.value) })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="dataVencimento" className="text-right">
                      Data de Vencimento
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="col-span-3 justify-start text-left font-normal">
                          {newPagamento.dataVencimento ? (
                            format(newPagamento.dataVencimento, "dd/MM/yyyy", { locale: pt })
                          ) : (
                            <span>Selecionar data</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={newPagamento.dataVencimento}
                          onSelect={(date) => setNewPagamento({ ...newPagamento, dataVencimento: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="estado" className="text-right">
                      Estado
                    </Label>
                    <Select
                      value={newPagamento.estado}
                      onValueChange={(value) => setNewPagamento({ ...newPagamento, estado: value as any })}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Selecionar estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                        <SelectItem value="atrasado">Atrasado</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="metodo" className="text-right">
                      Método
                    </Label>
                    <Select
                      value={newPagamento.metodo}
                      onValueChange={(value) => setNewPagamento({ ...newPagamento, metodo: value as any })}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Selecionar método" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="transferência">Transferência</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="débito direto">Débito Direto</SelectItem>
                        <SelectItem value="fundo de maneio">Fundo de Maneio</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="tipo" className="text-right">
                      Tipo
                    </Label>
                    <Select
                      value={newPagamento.tipo}
                      onValueChange={(value) =>
                        setNewPagamento({ ...newPagamento, tipo: value as "fatura" | "cotacao" })
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Selecionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fatura">Fatura</SelectItem>
                        <SelectItem value="cotacao">Cotação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="documentoRequerido" className="text-right">
                      Documento Requerido
                    </Label>
                    <Select
                      value={newPagamento.documentoRequerido || "factura"}
                      onValueChange={(value) => setNewPagamento({ ...newPagamento, documentoRequerido: value as any })}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Selecionar documento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="factura">Factura/Recibo</SelectItem>
                        <SelectItem value="vd">VD (Voucher de Despesa)</SelectItem>
                        <SelectItem value="nenhum">Nenhum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="departamento" className="text-right">
                      Departamento
                    </Label>
                    <Input
                      id="departamento"
                      value={newPagamento.departamento || ""}
                      onChange={(e) => setNewPagamento({ ...newPagamento, departamento: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="descricao" className="text-right">
                      Descrição
                    </Label>
                    <Input
                      id="descricao"
                      value={newPagamento.descricao || ""}
                      onChange={(e) => setNewPagamento({ ...newPagamento, descricao: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="observacoes" className="text-right">
                      Observações
                    </Label>
                    <Input
                      id="observacoes"
                      value={newPagamento.observacoes || ""}
                      onChange={(e) => setNewPagamento({ ...newPagamento, observacoes: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddPagamento}>Adicionar Pagamento</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button onClick={handlePrint} className="print:hidden">
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="font-semibold">Referência</TableHead>
                <TableHead className="font-semibold">Fornecedor</TableHead>
                <TableHead className="font-semibold text-right">Valor</TableHead>
                <TableHead className="font-semibold">Vencimento</TableHead>
                <TableHead className="font-semibold">Estado</TableHead>
                <TableHead className="font-semibold">Método</TableHead>
                <TableHead className="font-semibold">Departamento</TableHead>
                <TableHead className="font-semibold text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPagamentos.map((pagamento, index) => (
                <TableRow key={pagamento.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <TableCell className="font-medium">{pagamento.referencia}</TableCell>
                  <TableCell>{pagamento.fornecedorNome}</TableCell>
                  <TableCell className="text-right">{pagamento.valor.toFixed(2)} MZN</TableCell>
                  <TableCell>{format(pagamento.dataVencimento, "dd/MM/yyyy", { locale: pt })}</TableCell>
                  <TableCell>{getEstadoBadge(pagamento.estado)}</TableCell>
                  <TableCell>{getMetodoBadge(pagamento.metodo)}</TableCell>
                  <TableCell>{pagamento.departamento}</TableCell>
                  <TableCell className="text-right">
                    <TooltipProvider>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setPagamentoSelecionado(pagamento)}>
                            <FileText className="mr-2 h-4 w-4" />
                            Visualizar detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setPagamentoSelecionado(pagamento)
                              setIsEditDialogOpen(true)
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setPagamentoSelecionado(pagamento)
                              setIsHistoryDialogOpen(true)
                            }}
                          >
                            <History className="mr-2 h-4 w-4" />
                            Ver histórico de edições
                          </DropdownMenuItem>
                          {isAdmin() && pagamento.estado === "pendente" && (
                            <DropdownMenuItem onClick={() => setPagamentoParaNotificar(pagamento)}>
                              <Bell className="mr-2 h-4 w-4" />
                              Notificar Fornecedor
                            </DropdownMenuItem>
                          )}
                          {isAdmin() && pagamento.estado !== "pago" && pagamento.estado !== "cancelado" && (
                            <DropdownMenuItem onClick={() => marcarComoPago(pagamento, pagamento.fornecedorId)}>
                              <Check className="mr-2 h-4 w-4" />
                              Marcar como pago
                            </DropdownMenuItem>
                          )}
                          {(pagamento.estado === "pendente" || pagamento.estado === "atrasado") && (
                            <>
                              <DropdownMenuItem onClick={() => handleEmitirCheque(pagamento)}>
                                <CreditCard className="mr-2 h-4 w-4" />
                                Emitir Cheque
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setPagamentoParaFundoManeio(pagamento)
                                  setIsFundoManeioDialogOpen(true)
                                }}
                              >
                                <Wallet className="mr-2 h-4 w-4" />
                                Pagar com Fundo de Maneio
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem onClick={() => handleExportPDF(pagamento)}>
                            <Download className="mr-2 h-4 w-4" />
                            Exportar PDF
                          </DropdownMenuItem>
                          {pagamento.estado === "pago" && (
                            <DropdownMenuItem onClick={() => setPagamentoParaDocumentos(pagamento)}>
                              <FileText className="mr-2 h-4 w-4" />
                              Documentos Fiscais
                            </DropdownMenuItem>
                          )}
                          {(user?.username === "Vinildo Mondlane" ||
                            user?.username === "Benigna Magaia" ||
                            isAdmin()) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDeletePagamento(pagamento.fornecedorId, pagamento.id)}
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {pagamentoSelecionado && (
          <DetalhesPagamento
            pagamento={pagamentoSelecionado}
            isOpen={!!pagamentoSelecionado}
            onClose={() => setPagamentoSelecionado(null)}
          />
        )}
        {pagamentoParaNotificar && (
          <NotificarFornecedor
            fornecedorNome={pagamentoParaNotificar.fornecedorNome}
            referenciaPagamento={pagamentoParaNotificar.referencia}
            dataVencimento={new Date(pagamentoParaNotificar.dataVencimento)}
            valor={pagamentoParaNotificar.valor}
            isOpen={!!pagamentoParaNotificar}
            onClose={() => setPagamentoParaNotificar(null)}
          />
        )}
        {pagamentoParaDocumentos && (
          <LembreteDocumentos
            pagamento={pagamentoParaDocumentos}
            isOpen={!!pagamentoParaDocumentos}
            onClose={() => setPagamentoParaDocumentos(null)}
          />
        )}

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Editar Pagamento</DialogTitle>
              <DialogDescription>Atualize os detalhes do pagamento.</DialogDescription>
            </DialogHeader>
            {pagamentoSelecionado && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-fornecedor">Fornecedor</Label>
                    <Input
                      id="edit-fornecedor"
                      value={pagamentoSelecionado.fornecedorNome}
                      onChange={(e) =>
                        setPagamentoSelecionado({ ...pagamentoSelecionado, fornecedorNome: e.target.value })
                      }
                      placeholder="Digite o nome do fornecedor"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-referencia">Referência</Label>
                    <Input
                      id="edit-referencia"
                      value={pagamentoSelecionado.referencia}
                      onChange={(e) => setPagamentoSelecionado({ ...pagamentoSelecionado, referencia: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-valor">Valor (MT)</Label>
                    <Input
                      id="edit-valor"
                      type="number"
                      step="0.01"
                      value={pagamentoSelecionado.valor}
                      onChange={(e) =>
                        setPagamentoSelecionado({ ...pagamentoSelecionado, valor: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-dataVencimento">Data de Vencimento</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          {format(new Date(pagamentoSelecionado.dataVencimento), "dd/MM/yyyy", { locale: pt })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={new Date(pagamentoSelecionado.dataVencimento)}
                          onSelect={(date) =>
                            setPagamentoSelecionado({ ...pagamentoSelecionado, dataVencimento: date || new Date() })
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-estado">Estado</Label>
                    <Select
                      value={pagamentoSelecionado.estado}
                      onValueChange={(value) =>
                        setPagamentoSelecionado({ ...pagamentoSelecionado, estado: value as any })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                        <SelectItem value="atrasado">Atrasado</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-metodo">Método</Label>
                    <Select
                      value={pagamentoSelecionado.metodo}
                      onValueChange={(value) =>
                        setPagamentoSelecionado({ ...pagamentoSelecionado, metodo: value as any })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="transferência">Transferência</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="débito direto">Débito Direto</SelectItem>
                        <SelectItem value="fundo de maneio">Fundo de Maneio</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-documentoRequerido">Documento Requerido</Label>
                  <Select
                    value={pagamentoSelecionado.documentoRequerido || "factura"}
                    onValueChange={(value) =>
                      setPagamentoSelecionado({ ...pagamentoSelecionado, documentoRequerido: value as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar documento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="factura">Factura/Recibo</SelectItem>
                      <SelectItem value="vd">VD (Voucher de Despesa)</SelectItem>
                      <SelectItem value="nenhum">Nenhum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-departamento">Departamento</Label>
                  <Input
                    id="edit-departamento"
                    value={pagamentoSelecionado.departamento}
                    onChange={(e) => setPagamentoSelecionado({ ...pagamentoSelecionado, departamento: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-descricao">Descrição</Label>
                  <Input
                    id="edit-descricao"
                    value={pagamentoSelecionado.descricao}
                    onChange={(e) => setPagamentoSelecionado({ ...pagamentoSelecionado, descricao: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-observacoes">Observações</Label>
                  <Input
                    id="edit-observacoes"
                    value={pagamentoSelecionado.observacoes}
                    onChange={(e) => setPagamentoSelecionado({ ...pagamentoSelecionado, observacoes: e.target.value })}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditPagamento}>Salvar Alterações</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Diálogo para pagamento com fundo de maneio */}
        <Dialog open={isFundoManeioDialogOpen} onOpenChange={setIsFundoManeioDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-xl">Pagar com Fundo de Maneio</DialogTitle>
              <DialogDescription>Este pagamento será realizado utilizando o fundo de maneio.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Detalhes do Pagamento</h3>
                <div className="space-y-1">
                  <p className="font-medium">{pagamentoParaFundoManeio?.referencia}</p>
                  <p className="text-sm text-gray-500">Fornecedor: {pagamentoParaFundoManeio?.fornecedorNome}</p>
                  <p className="text-sm text-gray-500">
                    Valor:{" "}
                    {pagamentoParaFundoManeio?.valor.toLocaleString("pt-MZ", { style: "currency", currency: "MZN" })}
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="descricao-fundo" className="text-sm font-medium mb-2 block">
                  Descrição (opcional)
                </Label>
                <Input
                  id="descricao-fundo"
                  value={descricaoFundoManeio}
                  onChange={(e) => setDescricaoFundoManeio(e.target.value)}
                  className="w-full"
                  placeholder="Descrição para o movimento no fundo de maneio"
                />
                <p className="mt-2 text-sm text-gray-500 italic">
                  Se não for fornecida uma descrição, será usada uma descrição padrão com os dados do pagamento.
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsFundoManeioDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handlePagarComFundoManeio}>Confirmar Pagamento</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {pagamentoSelecionado && (
          <PaymentHistory
            history={pagamentoSelecionado.historico || []}
            isOpen={isHistoryDialogOpen}
            onClose={() => setIsHistoryDialogOpen(false)}
          />
        )}
        {pagamentoParaCheque && (
          <Dialog open={isEmitirChequeDialogOpen} onOpenChange={setIsEmitirChequeDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Emitir Cheque</DialogTitle>
                <DialogDescription>
                  Preencha os detalhes do cheque para o pagamento {pagamentoParaCheque.referencia}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="pagamento-info" className="text-right">
                    Pagamento
                  </Label>
                  <div className="col-span-3">
                    <p className="font-medium">{pagamentoParaCheque.referencia}</p>
                    <p className="text-sm text-gray-500">{pagamentoParaCheque.fornecedorNome}</p>
                    <p className="text-sm text-gray-500">
                      {pagamentoParaCheque.valor.toLocaleString("pt-MZ", { style: "currency", currency: "MZN" })}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="numero-cheque" className="text-right">
                    Número do Cheque
                  </Label>
                  <Input
                    id="numero-cheque"
                    value={novoCheque.numero}
                    onChange={(e) => setNovoCheque({ ...novoCheque, numero: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="data-emissao" className="text-right">
                    Data de Emissão
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="col-span-3 justify-start text-left font-normal">
                        {novoCheque.dataEmissao ? (
                          format(novoCheque.dataEmissao, "dd/MM/yyyy", { locale: pt })
                        ) : (
                          <span>Selecionar data</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={novoCheque.dataEmissao}
                        onSelect={(date) => setNovoCheque({ ...novoCheque, dataEmissao: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEmitirChequeDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSalvarCheque}>Emitir Cheque</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </PrintLayout>
  )
}

