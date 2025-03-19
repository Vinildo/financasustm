"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { PrintLayout } from "@/components/print-layout"
import { Printer, Upload, FileDown, Search, X, RefreshCw, Plus, Calendar, Save } from "lucide-react"
import { format } from "date-fns"
import { pt } from "date-fns/locale"
import * as XLSX from "xlsx"
import { useAppContext } from "@/contexts/AppContext"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Modificar o tipo TransacaoBancaria para incluir informações de cheque e transferência
type TransacaoBancaria = {
  id: string
  data: Date
  descricao: string
  valor: number
  tipo: "credito" | "debito"
  reconciliado: boolean
  pagamentoId?: string
  chequeId?: string
  chequeNumero?: string
  metodo?: "cheque" | "transferencia" | "deposito" | "outro"
}

export function ReconciliacaoBancaria() {
  const { fornecedores, atualizarPagamento } = useAppContext()
  const [transacoes, setTransacoes] = useState<TransacaoBancaria[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [mesSelecionado, setMesSelecionado] = useState<Date>(startOfMonth(new Date()))
  const [bancoSelecionado, setBancoSelecionado] = useState<string>("bci")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [matchAutomatico, setMatchAutomatico] = useState(true)

  // Estados para o formulário de adição manual
  const [novaTransacao, setNovaTransacao] = useState<{
    data: Date | undefined
    descricao: string
    valor: string
    tipo: "credito" | "debito"
    metodo: "cheque" | "transferencia" | "deposito" | "outro"
    chequeNumero?: string
  }>({
    data: new Date(),
    descricao: "",
    valor: "",
    tipo: "debito",
    metodo: "outro",
  })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("importar")

  // Adicionar um useEffect para carregar cheques e sincronizar com transações
  // Adicionar após a declaração dos estados:

  useEffect(() => {
    // Carregar cheques do localStorage
    const chequesArmazenados = localStorage.getItem("cheques")
    if (chequesArmazenados) {
      try {
        const chequesParsed = JSON.parse(chequesArmazenados)
        // Converter as datas de string para objeto Date
        const chequesFormatados = chequesParsed.map((cheque: any) => ({
          ...cheque,
          dataEmissao: new Date(cheque.dataEmissao),
          dataCompensacao: cheque.dataCompensacao ? new Date(cheque.dataCompensacao) : null,
        }))

        // Sincronizar cheques compensados com transações
        const chequesCompensados = chequesFormatados.filter(
          (cheque: any) => cheque.estado === "compensado" && cheque.dataCompensacao,
        )

        // Adicionar cheques compensados como transações se ainda não existirem
        if (chequesCompensados.length > 0) {
          setTransacoes((prevTransacoes) => {
            const transacoesExistentes = new Set(
              prevTransacoes.map((t) => (t.chequeId ? t.chequeId : null)).filter(Boolean),
            )

            const novasTransacoesCheques = chequesCompensados
              .filter((cheque: any) => !transacoesExistentes.has(cheque.id))
              .map((cheque: any) => ({
                id: `cheque-${cheque.id}`,
                data: cheque.dataCompensacao,
                descricao: `Cheque nº ${cheque.numero} - ${cheque.beneficiario}`,
                valor: cheque.valor,
                tipo: "debito",
                reconciliado: Boolean(cheque.pagamentoId),
                pagamentoId: cheque.pagamentoId,
                chequeId: cheque.id,
                chequeNumero: cheque.numero,
                metodo: "cheque" as const,
              }))

            return [...prevTransacoes, ...novasTransacoesCheques]
          })
        }
      } catch (error) {
        console.error("Erro ao carregar cheques:", error)
      }
    }
  }, [])

  // Adicionar useEffect para carregar transações bancárias do localStorage
  // Adicionar após a declaração dos estados:

  useEffect(() => {
    // Carregar transações do localStorage
    const transacoesArmazenadas = localStorage.getItem("transacoesBancarias")
    if (transacoesArmazenadas) {
      try {
        const transacoesParsed = JSON.parse(transacoesArmazenadas)
        // Converter as datas de string para objeto Date
        const transacoesFormatadas = transacoesParsed.map((transacao: any) => ({
          ...transacao,
          data: new Date(transacao.data),
        }))
        setTransacoes(transacoesFormatadas)
      } catch (error) {
        console.error("Erro ao carregar transações bancárias:", error)
      }
    }
  }, [])

  // Modificar o useEffect para salvar transações no localStorage quando houver mudanças
  // Adicionar após o useEffect de carregamento:

  useEffect(() => {
    // Salvar transações no localStorage
    if (transacoes.length > 0) {
      localStorage.setItem("transacoesBancarias", JSON.stringify(transacoes))
    }
  }, [transacoes])

  // Obter todos os pagamentos de todos os fornecedores
  const todosPagamentos = fornecedores.flatMap((fornecedor) =>
    fornecedor.pagamentos.map((pagamento) => ({
      ...pagamento,
      fornecedorId: fornecedor.id,
      fornecedorNome: fornecedor.nome,
    })),
  )

  // Filtrar transações com base na pesquisa e intervalo de datas
  const transacoesFiltradas = transacoes.filter((transacao) => {
    const matchesSearch = transacao.descricao.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesMonth = transacao.data >= startOfMonth(mesSelecionado) && transacao.data <= endOfMonth(mesSelecionado)
    return matchesSearch && matchesMonth
  })

  // Modificar a função reconciliarAutomaticamente para considerar cheques e transferências
  // Substituir a função existente por:

  const reconciliarAutomaticamente = (transacoesParaReconciliar: TransacaoBancaria[]) => {
    const pagamentosNaoReconciliados = todosPagamentos.filter((p) => p.estado !== "pago" && p.tipo === "fatura")

    const transacoesAtualizadas = [...transacoesParaReconciliar]

    // Para cada transação de débito, tente encontrar um pagamento correspondente
    transacoesAtualizadas.forEach((transacao, index) => {
      if (transacao.tipo === "debito" && !transacao.reconciliado) {
        let pagamentoCorrespondente

        // Se for um cheque, procurar pelo número do cheque nas observações
        if (transacao.metodo === "cheque" && transacao.chequeNumero) {
          pagamentoCorrespondente = pagamentosNaoReconciliados.find(
            (pagamento) =>
              pagamento.metodo === "cheque" && pagamento.observacoes?.includes(`Cheque nº ${transacao.chequeNumero}`),
          )
        }

        // Se for uma transferência, procurar por referências na descrição
        else if (
          transacao.descricao.toLowerCase().includes("transf") ||
          transacao.descricao.toLowerCase().includes("transfer")
        ) {
          // Procurar pagamentos por transferência com valor correspondente
          pagamentoCorrespondente = pagamentosNaoReconciliados.find(
            (pagamento) => pagamento.metodo === "transferencia" && Math.abs(pagamento.valor - transacao.valor) < 0.01,
          )
        }

        // Se não encontrou por método específico, procurar por valor
        if (!pagamentoCorrespondente) {
          pagamentoCorrespondente = pagamentosNaoReconciliados.find(
            (pagamento) =>
              Math.abs(pagamento.valor - transacao.valor) < 0.01 &&
              !pagamentosNaoReconciliados.some((p) => transacoesAtualizadas.some((t) => t.pagamentoId === p.id)),
          )
        }

        if (pagamentoCorrespondente) {
          transacoesAtualizadas[index] = {
            ...transacao,
            reconciliado: true,
            pagamentoId: pagamentoCorrespondente.id,
            metodo: (pagamentoCorrespondente.metodo as any) || transacao.metodo,
          }

          // Atualizar o pagamento como pago
          atualizarPagamento(pagamentoCorrespondente.fornecedorId, {
            ...pagamentoCorrespondente,
            estado: "pago",
            dataPagamento: transacao.data,
            observacoes: transacao.chequeNumero
              ? `${pagamentoCorrespondente.observacoes || ""} | Reconciliado com cheque nº ${transacao.chequeNumero}`
              : `${pagamentoCorrespondente.observacoes || ""} | Reconciliado com extrato bancário`,
          })

          // Se for um cheque, atualizar o estado do cheque no localStorage
          if (transacao.chequeId) {
            atualizarEstadoCheque(transacao.chequeId, "compensado", transacao.data)
          }
        }
      }
    })

    setTransacoes(transacoesAtualizadas)

    // Mostrar resumo da reconciliação
    const reconciliacoesRealizadas = transacoesAtualizadas.filter(
      (t) => t.reconciliado && !transacoesParaReconciliar.find((tr) => tr.id === t.id)?.reconciliado,
    ).length

    if (reconciliacoesRealizadas > 0) {
      toast({
        title: "Reconciliação automática",
        description: `${reconciliacoesRealizadas} transações foram reconciliadas automaticamente.`,
      })
    }
  }

  // Adicionar função para atualizar o estado de um cheque
  // Adicionar após a função reconciliarAutomaticamente:

  const atualizarEstadoCheque = (
    chequeId: string,
    estado: "pendente" | "compensado" | "cancelado",
    dataCompensacao?: Date,
  ) => {
    const chequesArmazenados = localStorage.getItem("cheques")
    if (chequesArmazenados) {
      try {
        const chequesParsed = JSON.parse(chequesArmazenados)
        const chequesAtualizados = chequesParsed.map((cheque: any) => {
          if (cheque.id === chequeId) {
            return {
              ...cheque,
              estado: estado,
              dataCompensacao: dataCompensacao ? dataCompensacao : cheque.dataCompensacao,
            }
          }
          return cheque
        })

        localStorage.setItem("cheques", JSON.stringify(chequesAtualizados))

        toast({
          title: "Cheque atualizado",
          description: `O estado do cheque foi atualizado para ${estado}.`,
        })
      } catch (error) {
        console.error("Erro ao atualizar cheque:", error)
      }
    }
  }

  // Reconciliar manualmente uma transação com um pagamento
  const reconciliarManualmente = (transacaoId: string, pagamentoId: string, fornecedorId: string) => {
    const transacao = transacoes.find((t) => t.id === transacaoId)
    if (!transacao) return

    const transacoesAtualizadas = transacoes.map((t) =>
      t.id === transacaoId
        ? {
            ...t,
            reconciliado: true,
            pagamentoId,
          }
        : t,
    )

    setTransacoes(transacoesAtualizadas)

    // Encontrar o pagamento e atualizá-lo
    const pagamento = todosPagamentos.find((p) => p.id === pagamentoId)
    if (pagamento) {
      // Determinar o método de pagamento com base na transação
      let metodo = pagamento.metodo
      let observacoes = pagamento.observacoes || ""

      if (transacao.metodo === "cheque" && transacao.chequeNumero) {
        metodo = "cheque"
        observacoes = `${observacoes ? observacoes + " | " : ""}Reconciliado com cheque nº ${transacao.chequeNumero}`

        // Se for um cheque, atualizar o estado do cheque
        if (transacao.chequeId) {
          atualizarEstadoCheque(transacao.chequeId, "compensado", transacao.data)
        }
      } else if (transacao.metodo === "transferencia") {
        metodo = "transferencia"
        observacoes = `${observacoes ? observacoes + " | " : ""}Reconciliado com transferência bancária`
      } else {
        observacoes = `${observacoes ? observacoes + " | " : ""}Reconciliado com extrato bancário`
      }

      atualizarPagamento(fornecedorId, {
        ...pagamento,
        estado: "pago",
        dataPagamento: transacao.data,
        metodo,
        observacoes,
      })

      toast({
        title: "Reconciliação realizada",
        description: `Transação reconciliada com o pagamento ${pagamento.referencia}.`,
      })
    }
  }

  // Remover reconciliação
  const removerReconciliacao = (transacaoId: string) => {
    const transacao = transacoes.find((t) => t.id === transacaoId)
    if (!transacao || !transacao.pagamentoId) return

    // Encontrar o pagamento e fornecedor
    const pagamento = todosPagamentos.find((p) => p.id === transacao.pagamentoId)
    if (!pagamento) return

    const fornecedorId = pagamento.fornecedorId

    // Atualizar a transação
    const transacoesAtualizadas = transacoes.map((t) =>
      t.id === transacaoId
        ? {
            ...t,
            reconciliado: false,
            pagamentoId: undefined,
          }
        : t,
    )

    setTransacoes(transacoesAtualizadas)

    // Atualizar o pagamento de volta para pendente
    atualizarPagamento(fornecedorId, {
      ...pagamento,
      estado: "pendente",
      dataPagamento: null,
    })

    toast({
      title: "Reconciliação removida",
      description: `A reconciliação da transação foi removida.`,
    })
  }

  // Modificar a função processarArquivoExcel para melhorar a detecção de cheques e transferências
  // Dentro da função processarArquivoExcel, modificar a parte de mapeamento:

  // Processar o arquivo Excel
  const processarArquivoExcel = async (file: File) => {
    setIsProcessing(true)
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      // Mapear os dados do Excel para o formato de transações
      const novasTransacoes: TransacaoBancaria[] = jsonData
        .map((row: any, index) => {
          // Adaptar para diferentes formatos de bancos
          let data, descricao, valor, tipo, metodo

          if (bancoSelecionado === "bci") {
            data = new Date(row["Data"] || row["DATA"] || row["data"])
            descricao = row["Descrição"] || row["DESCRIÇÃO"] || row["descricao"] || ""
            valor = Number.parseFloat(row["Valor"] || row["VALOR"] || row["valor"] || 0)
            tipo = valor >= 0 ? "credito" : "debito"
            valor = Math.abs(valor)
          } else if (bancoSelecionado === "bim") {
            data = new Date(row["Data Mov."] || row["DATA"] || row["Data"])
            descricao = row["Descrição"] || row["Descricao"] || ""
            const credito = Number.parseFloat(row["Crédito"] || row["Credito"] || 0)
            const debito = Number.parseFloat(row["Débito"] || row["Debito"] || 0)
            tipo = credito > 0 ? "credito" : "debito"
            valor = credito > 0 ? credito : debito
          } else {
            // Formato genérico
            data = new Date(row["Data"] || row["Date"] || "")
            descricao = row["Descrição"] || row["Description"] || ""
            valor = Number.parseFloat(row["Valor"] || row["Amount"] || 0)
            tipo = valor >= 0 ? "credito" : "debito"
            valor = Math.abs(valor)
          }

          // Detectar o método de pagamento com base na descrição
          if (descricao.toLowerCase().includes("cheque") || descricao.toLowerCase().includes("ch ")) {
            metodo = "cheque"

            // Tentar extrair o número do cheque da descrição
            const chequeMatch =
              descricao.match(/cheque\s+n[º°]?\s*(\d+)/i) ||
              descricao.match(/ch\s+n[º°]?\s*(\d+)/i) ||
              descricao.match(/ch\s*(\d+)/i)

            if (chequeMatch && chequeMatch[1]) {
              const chequeNumero = chequeMatch[1]

              // Verificar se existe um cheque com este número
              const chequesArmazenados = localStorage.getItem("cheques")
              if (chequesArmazenados) {
                try {
                  const chequesParsed = JSON.parse(chequesArmazenados)
                  const chequeEncontrado = chequesParsed.find((c: any) => c.numero === chequeNumero)

                  if (chequeEncontrado) {
                    return {
                      id: `trans-${index}-${Date.now()}`,
                      data: data,
                      descricao: descricao,
                      valor: valor,
                      tipo: tipo,
                      reconciliado: Boolean(chequeEncontrado.pagamentoId),
                      pagamentoId: chequeEncontrado.pagamentoId,
                      chequeId: chequeEncontrado.id,
                      chequeNumero: chequeNumero,
                      metodo: "cheque" as const,
                    }
                  }
                } catch (error) {
                  console.error("Erro ao processar cheques:", error)
                }
              }
            }
          } else if (
            descricao.toLowerCase().includes("transf") ||
            descricao.toLowerCase().includes("transfer") ||
            descricao.toLowerCase().includes("trf")
          ) {
            metodo = "transferencia"
          } else if (descricao.toLowerCase().includes("depósito") || descricao.toLowerCase().includes("deposito")) {
            metodo = "deposito"
          } else {
            metodo = "outro"
          }

          return {
            id: `trans-${index}-${Date.now()}`,
            data: data,
            descricao: descricao,
            valor: valor,
            tipo: tipo,
            reconciliado: false,
            metodo: metodo as any,
          }
        })
        .filter((t: TransacaoBancaria) => !isNaN(t.data.getTime()) && t.valor > 0)

      setTransacoes(novasTransacoes)

      if (matchAutomatico) {
        reconciliarAutomaticamente(novasTransacoes)
      }

      toast({
        title: "Extrato carregado",
        description: `${novasTransacoes.length} transações foram importadas com sucesso.`,
      })
    } catch (error) {
      console.error("Erro ao processar o arquivo:", error)
      toast({
        title: "Erro",
        description: "Não foi possível processar o arquivo. Verifique o formato e tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      processarArquivoExcel(file)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      transacoesFiltradas.map((transacao) => {
        const pagamentoCorrespondente = todosPagamentos.find((p) => p.id === transacao.pagamentoId)
        return {
          Data: format(transacao.data, "dd/MM/yyyy", { locale: pt }),
          Descrição: transacao.descricao,
          Valor: transacao.valor.toFixed(2),
          Tipo: transacao.tipo === "credito" ? "Crédito" : "Débito",
          Reconciliado: transacao.reconciliado ? "Sim" : "Não",
          "Pagamento Ref.": pagamentoCorrespondente?.referencia || "",
          Fornecedor: pagamentoCorrespondente
            ? fornecedores.find((f) => f.id === pagamentoCorrespondente.fornecedorId)?.nome || ""
            : "",
        }
      }),
    )

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Reconciliação")

    // Gerar arquivo Excel e iniciar download
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" })
    const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    const url = window.URL.createObjectURL(data)
    const link = document.createElement("a")
    link.href = url
    link.download = "reconciliacao-bancaria.xlsx"
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const handleMesAnterior = () => {
    setMesSelecionado((mesAtual) => subMonths(mesAtual, 1))
  }

  const handleProximoMes = () => {
    setMesSelecionado((mesAtual) => addMonths(mesAtual, 1))
  }

  // Função para adicionar uma transação manualmente
  const adicionarTransacaoManual = () => {
    if (!novaTransacao.data || !novaTransacao.descricao || !novaTransacao.valor) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      })
      return
    }

    const valorNumerico = Number.parseFloat(novaTransacao.valor.replace(",", "."))

    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      toast({
        title: "Erro",
        description: "Por favor, insira um valor válido maior que zero.",
        variant: "destructive",
      })
      return
    }

    const novaTransacaoObj: TransacaoBancaria = {
      id: `manual-${Date.now()}`,
      data: novaTransacao.data,
      descricao: novaTransacao.descricao,
      valor: valorNumerico,
      tipo: novaTransacao.tipo,
      reconciliado: false,
      metodo: novaTransacao.metodo,
      chequeNumero: novaTransacao.metodo === "cheque" ? novaTransacao.chequeNumero : undefined,
    }

    setTransacoes((prev) => [...prev, novaTransacaoObj])

    // Resetar o formulário
    setNovaTransacao({
      data: new Date(),
      descricao: "",
      valor: "",
      tipo: "debito",
      metodo: "outro",
    })

    setDialogOpen(false)

    toast({
      title: "Transação adicionada",
      description: "A transação foi adicionada com sucesso.",
    })

    // Se match automático estiver ativado, tentar reconciliar
    if (matchAutomatico) {
      reconciliarAutomaticamente([novaTransacaoObj])
    }
  }

  // Função para excluir uma transação
  const excluirTransacao = (transacaoId: string) => {
    const transacao = transacoes.find((t) => t.id === transacaoId)

    if (transacao?.reconciliado) {
      // Se estiver reconciliada, primeiro remover a reconciliação
      removerReconciliacao(transacaoId)
    }

    // Remover a transação
    setTransacoes((prev) => prev.filter((t) => t.id !== transacaoId))

    toast({
      title: "Transação excluída",
      description: "A transação foi excluída com sucesso.",
    })
  }

  return (
    <PrintLayout title="Reconciliação Bancária">
      <Card className="w-full">
        <CardHeader className="bg-gray-100">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <CardTitle>Reconciliação Bancária</CardTitle>
              <CardDescription>Reconcilie os pagamentos com o extrato bancário</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handlePrint} className="print:hidden bg-gray-200 text-gray-800 hover:bg-gray-300">
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
              <Button onClick={handleExportExcel} className="print:hidden bg-gray-200 text-gray-800 hover:bg-gray-300">
                <FileDown className="mr-2 h-4 w-4" />
                Exportar Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="importar">Importar Extrato</TabsTrigger>
                <TabsTrigger value="manual">Adicionar Manualmente</TabsTrigger>
              </TabsList>
              <TabsContent value="importar" className="space-y-4 pt-4">
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="w-full sm:w-auto">
                    <Label htmlFor="banco" className="mb-2 block">
                      Banco
                    </Label>
                    <Select value={bancoSelecionado} onValueChange={setBancoSelecionado}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Selecionar banco" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bci">BCI</SelectItem>
                        <SelectItem value="bim">BIM</SelectItem>
                        <SelectItem value="standard">Standard Bank</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full sm:w-auto">
                    <Label htmlFor="match-automatico" className="mb-2 block">
                      Match Automático
                    </Label>
                    <Select
                      value={matchAutomatico ? "sim" : "nao"}
                      onValueChange={(v) => setMatchAutomatico(v === "sim")}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Match automático" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sim">Sim</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full sm:w-auto">
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      ref={fileInputRef}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                      className="w-full sm:w-auto"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {isProcessing ? "Processando..." : "Carregar Extrato"}
                    </Button>
                  </div>
                  <Button
                    onClick={() => reconciliarAutomaticamente(transacoes)}
                    disabled={transacoes.length === 0}
                    className="w-full sm:w-auto"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reconciliar Automaticamente
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="manual" className="space-y-4 pt-4">
                <div className="flex justify-end">
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar Transação
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Adicionar Transação Bancária</DialogTitle>
                        <DialogDescription>
                          Preencha os detalhes da transação bancária para adicionar manualmente.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="data" className="text-right">
                            Data
                          </Label>
                          <div className="col-span-3">
                            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                  <Calendar className="mr-2 h-4 w-4" />
                                  {novaTransacao.data
                                    ? format(novaTransacao.data, "dd/MM/yyyy", { locale: pt })
                                    : "Selecione uma data"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <CalendarComponent
                                  mode="single"
                                  selected={novaTransacao.data}
                                  onSelect={(date) => {
                                    setNovaTransacao({ ...novaTransacao, data: date })
                                    setDatePickerOpen(false)
                                  }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="tipo" className="text-right">
                            Tipo
                          </Label>
                          <div className="col-span-3">
                            <Select
                              value={novaTransacao.tipo}
                              onValueChange={(value: "credito" | "debito") =>
                                setNovaTransacao({ ...novaTransacao, tipo: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="credito">Crédito</SelectItem>
                                <SelectItem value="debito">Débito</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="metodo" className="text-right">
                            Método
                          </Label>
                          <div className="col-span-3">
                            <Select
                              value={novaTransacao.metodo}
                              onValueChange={(value: "cheque" | "transferencia" | "deposito" | "outro") =>
                                setNovaTransacao({ ...novaTransacao, metodo: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o método" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cheque">Cheque</SelectItem>
                                <SelectItem value="transferencia">Transferência</SelectItem>
                                <SelectItem value="deposito">Depósito</SelectItem>
                                <SelectItem value="outro">Outro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {novaTransacao.metodo === "cheque" && (
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="chequeNumero" className="text-right">
                              Nº Cheque
                            </Label>
                            <Input
                              id="chequeNumero"
                              value={novaTransacao.chequeNumero || ""}
                              onChange={(e) => setNovaTransacao({ ...novaTransacao, chequeNumero: e.target.value })}
                              className="col-span-3"
                            />
                          </div>
                        )}
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="descricao" className="text-right">
                            Descrição
                          </Label>
                          <Input
                            id="descricao"
                            value={novaTransacao.descricao}
                            onChange={(e) => setNovaTransacao({ ...novaTransacao, descricao: e.target.value })}
                            className="col-span-3"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="valor" className="text-right">
                            Valor (MT)
                          </Label>
                          <Input
                            id="valor"
                            value={novaTransacao.valor}
                            onChange={(e) => setNovaTransacao({ ...novaTransacao, valor: e.target.value })}
                            className="col-span-3"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" onClick={adicionarTransacaoManual}>
                          <Save className="mr-2 h-4 w-4" />
                          Salvar
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar transações..."
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
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="font-semibold">Data</TableHead>
                    <TableHead className="font-semibold">Descrição</TableHead>
                    <TableHead className="font-semibold text-right">Valor</TableHead>
                    <TableHead className="font-semibold">Tipo</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Pagamento Correspondente</TableHead>
                    <TableHead className="font-semibold text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transacoesFiltradas.length > 0 ? (
                    transacoesFiltradas.map((transacao, index) => {
                      const pagamentoCorrespondente = todosPagamentos.find((p) => p.id === transacao.pagamentoId)
                      return (
                        <TableRow key={transacao.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <TableCell>{format(transacao.data, "dd/MM/yyyy", { locale: pt })}</TableCell>
                          <TableCell className="max-w-xs truncate">{transacao.descricao}</TableCell>
                          <TableCell className="text-right">{transacao.valor.toFixed(2)} MT</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                transacao.tipo === "credito"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                              }
                            >
                              {transacao.tipo === "credito" ? "Crédito" : "Débito"}
                            </Badge>
                            {transacao.metodo && (
                              <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">
                                {transacao.metodo.charAt(0).toUpperCase() + transacao.metodo.slice(1)}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                transacao.reconciliado
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-yellow-50 text-yellow-700 border-yellow-200"
                              }
                            >
                              {transacao.reconciliado ? "Reconciliado" : "Pendente"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {pagamentoCorrespondente ? (
                              <div>
                                <div className="font-medium">{pagamentoCorrespondente.referencia}</div>
                                <div className="text-sm text-gray-500">
                                  {fornecedores.find((f) => f.id === pagamentoCorrespondente.fornecedorId)?.nome}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {transacao.reconciliado ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removerReconciliacao(transacao.id)}
                                  className="text-red-600"
                                >
                                  <X className="mr-1 h-4 w-4" />
                                  Remover
                                </Button>
                              ) : (
                                <Select
                                  onValueChange={(value) => {
                                    const [pagamentoId, fornecedorId] = value.split("|")
                                    reconciliarManualmente(transacao.id, pagamentoId, fornecedorId)
                                  }}
                                >
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Reconciliar com..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {todosPagamentos
                                      .filter((p) => p.estado !== "pago" && p.tipo === "fatura")
                                      .map((pagamento) => (
                                        <SelectItem
                                          key={pagamento.id}
                                          value={`${pagamento.id}|${pagamento.fornecedorId}`}
                                        >
                                          {pagamento.referencia} - {pagamento.valor.toFixed(2)} MT
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => excluirTransacao(transacao.id)}
                                className="text-red-600"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4">
                        {transacoes.length === 0
                          ? "Nenhum extrato bancário carregado. Carregue um arquivo Excel ou adicione transações manualmente para começar."
                          : "Nenhuma transação encontrada com os filtros atuais."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Total de Transações</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{transacoes.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Reconciliadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{transacoes.filter((t) => t.reconciliado).length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Pendentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{transacoes.filter((t) => !t.reconciliado).length}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </PrintLayout>
  )
}

