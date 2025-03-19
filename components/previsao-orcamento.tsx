"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { PrintLayout } from "@/components/print-layout"
import { Printer, FileDown, Plus, Edit, Trash2, BarChart3, ChevronLeft, ChevronRight } from "lucide-react"
import { format, startOfMonth, endOfMonth, addMonths, subMonths, getYear, getMonth } from "date-fns"
import { pt } from "date-fns/locale"
import * as XLSX from "xlsx"
import { useAppContext } from "@/contexts/AppContext"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"

// Tipos para orçamento
type ItemOrcamento = {
  id: string
  departamento: string
  valorPrevisto: number
  descricao: string
}

type Orcamento = {
  id: string
  ano: number
  mes: number
  itens: ItemOrcamento[]
}

export function PrevisaoOrcamento() {
  const { fornecedores } = useAppContext()
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [mesSelecionado, setMesSelecionado] = useState<Date>(startOfMonth(new Date()))
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [novoItem, setNovoItem] = useState<Partial<ItemOrcamento>>({})
  const [itemEditando, setItemEditando] = useState<ItemOrcamento | null>(null)
  const [activeTab, setActiveTab] = useState("orcamento")

  // Carregar dados do localStorage ao iniciar
  useEffect(() => {
    const dadosSalvos = localStorage.getItem("orcamentos")
    if (dadosSalvos) {
      setOrcamentos(JSON.parse(dadosSalvos))
    }
  }, [])

  // Salvar dados no localStorage sempre que houver mudanças
  useEffect(() => {
    localStorage.setItem("orcamentos", JSON.stringify(orcamentos))
  }, [orcamentos])

  // Obter o orçamento do mês atual
  const orcamentoAtual = orcamentos.find(
    (o) => o.ano === getYear(mesSelecionado) && o.mes === getMonth(mesSelecionado) + 1,
  )

  // Obter todos os pagamentos do mês atual
  const pagamentosDoMes = fornecedores.flatMap((fornecedor) =>
    fornecedor.pagamentos.filter((pagamento) => {
      const dataPagamento = pagamento.dataPagamento
        ? new Date(pagamento.dataPagamento)
        : new Date(pagamento.dataVencimento)
      return (
        dataPagamento >= startOfMonth(mesSelecionado) &&
        dataPagamento <= endOfMonth(mesSelecionado) &&
        pagamento.tipo === "fatura"
      )
    }),
  )

  // Calcular valores realizados por departamento
  const valoresRealizados = pagamentosDoMes.reduce(
    (acc, pagamento) => {
      const departamento = pagamento.departamento
      if (!acc[departamento]) {
        acc[departamento] = 0
      }
      acc[departamento] += pagamento.valor
      return acc
    },
    {} as Record<string, number>,
  )

  // Preparar dados para o gráfico
  const dadosGrafico =
    orcamentoAtual?.itens.map((item) => ({
      departamento: item.departamento,
      previsto: item.valorPrevisto,
      realizado: valoresRealizados[item.departamento] || 0,
      percentual: valoresRealizados[item.departamento]
        ? Math.round((valoresRealizados[item.departamento] / item.valorPrevisto) * 100)
        : 0,
    })) || []

  // Calcular totais
  const totalPrevisto = orcamentoAtual?.itens.reduce((acc, item) => acc + item.valorPrevisto, 0) || 0
  const totalRealizado = Object.values(valoresRealizados).reduce((acc, valor) => acc + valor, 0)
  const percentualTotal = totalPrevisto > 0 ? Math.round((totalRealizado / totalPrevisto) * 100) : 0

  const handleMesAnterior = () => {
    setMesSelecionado((mesAtual) => subMonths(mesAtual, 1))
  }

  const handleProximoMes = () => {
    setMesSelecionado((mesAtual) => addMonths(mesAtual, 1))
  }

  const handleAddItem = () => {
    if (!novoItem.departamento || !novoItem.valorPrevisto) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      })
      return
    }

    const ano = getYear(mesSelecionado)
    const mes = getMonth(mesSelecionado) + 1

    // Verificar se já existe um orçamento para este mês
    const orcamentoExistente = orcamentos.find((o) => o.ano === ano && o.mes === mes)

    if (orcamentoExistente) {
      // Adicionar item ao orçamento existente
      const novosOrcamentos = orcamentos.map((o) => {
        if (o.id === orcamentoExistente!.id) {
          return {
            ...o,
            itens: [
              ...o.itens,
              {
                id: Date.now().toString(),
                departamento: novoItem.departamento!,
                valorPrevisto: novoItem.valorPrevisto!,
                descricao: novoItem.descricao || "",
              },
            ],
          }
        }
        return o
      })
      setOrcamentos(novosOrcamentos)
    } else {
      // Criar novo orçamento para este mês
      const novoOrcamento: Orcamento = {
        id: Date.now().toString(),
        ano,
        mes,
        itens: [
          {
            id: Date.now().toString(),
            departamento: novoItem.departamento!,
            valorPrevisto: novoItem.valorPrevisto!,
            descricao: novoItem.descricao || "",
          },
        ],
      }
      setOrcamentos([...orcamentos, novoOrcamento])
    }

    setNovoItem({})
    setIsAddDialogOpen(false)
    toast({
      title: "Item adicionado",
      description: "O item foi adicionado ao orçamento com sucesso.",
    })
  }

  const handleEditItem = () => {
    if (!itemEditando || !itemEditando.departamento || !itemEditando.valorPrevisto) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      })
      return
    }

    const novosOrcamentos = orcamentos.map((o) => {
      if (o.ano === getYear(mesSelecionado) && o.mes === getMonth(mesSelecionado) + 1) {
        return {
          ...o,
          itens: o.itens.map((item) => (item.id === itemEditando.id ? itemEditando : item)),
        }
      }
      return o
    })

    setOrcamentos(novosOrcamentos)
    setItemEditando(null)
    setIsEditDialogOpen(false)
    toast({
      title: "Item atualizado",
      description: "O item foi atualizado com sucesso.",
    })
  }

  const handleDeleteItem = (itemId: string) => {
    const novosOrcamentos = orcamentos.map((o) => {
      if (o.ano === getYear(mesSelecionado) && o.mes === getMonth(mesSelecionado) + 1) {
        return {
          ...o,
          itens: o.itens.filter((item) => item.id !== itemId),
        }
      }
      return o
    })

    // Remover orçamentos vazios
    const orcamentosFiltrados = novosOrcamentos.filter((o) => o.itens.length > 0)

    setOrcamentos(orcamentosFiltrados)
    toast({
      title: "Item removido",
      description: "O item foi removido do orçamento com sucesso.",
    })
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExportExcel = () => {
    if (!orcamentoAtual) {
      toast({
        title: "Erro",
        description: "Não há orçamento para exportar neste mês.",
        variant: "destructive",
      })
      return
    }

    const dadosExport = orcamentoAtual.itens.map((item) => ({
      Departamento: item.departamento,
      "Valor Previsto": item.valorPrevisto.toFixed(2),
      "Valor Realizado": (valoresRealizados[item.departamento] || 0).toFixed(2),
      "% Execução": valoresRealizados[item.departamento]
        ? Math.round((valoresRealizados[item.departamento] / item.valorPrevisto) * 100) + "%"
        : "0%",
      Descrição: item.descricao,
    }))

    // Adicionar linha de total
    dadosExport.push({
      Departamento: "TOTAL",
      "Valor Previsto": totalPrevisto.toFixed(2),
      "Valor Realizado": totalRealizado.toFixed(2),
      "% Execução": percentualTotal + "%",
      Descrição: "",
    })

    const ws = XLSX.utils.json_to_sheet(dadosExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Orçamento")

    // Gerar arquivo Excel e iniciar download
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" })
    const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    const url = window.URL.createObjectURL(data)
    const link = document.createElement("a")
    link.href = url
    link.download = `orcamento-${format(mesSelecionado, "yyyy-MM")}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <PrintLayout title="Previsão e Orçamento">
      <Card className="w-full">
        <CardHeader className="bg-gray-100">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <CardTitle>Previsão e Orçamento</CardTitle>
              <CardDescription>Gerencie o orçamento mensal e acompanhe a execução</CardDescription>
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
            <div className="flex flex-col sm:flex-row justify-between gap-4">
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
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Item ao Orçamento</DialogTitle>
                      <DialogDescription>
                        Adicione um novo item ao orçamento de {format(mesSelecionado, "MMMM yyyy", { locale: pt })}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="departamento" className="text-right">
                          Departamento
                        </Label>
                        <Input
                          id="departamento"
                          value={novoItem.departamento || ""}
                          onChange={(e) => setNovoItem({ ...novoItem, departamento: e.target.value })}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="valorPrevisto" className="text-right">
                          Valor Previsto
                        </Label>
                        <Input
                          id="valorPrevisto"
                          type="number"
                          value={novoItem.valorPrevisto || ""}
                          onChange={(e) => setNovoItem({ ...novoItem, valorPrevisto: Number(e.target.value) })}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="descricao" className="text-right">
                          Descrição
                        </Label>
                        <Input
                          id="descricao"
                          value={novoItem.descricao || ""}
                          onChange={(e) => setNovoItem({ ...novoItem, descricao: e.target.value })}
                          className="col-span-3"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleAddItem}>Adicionar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Editar Item do Orçamento</DialogTitle>
                      <DialogDescription>
                        Edite o item do orçamento de {format(mesSelecionado, "MMMM yyyy", { locale: pt })}
                      </DialogDescription>
                    </DialogHeader>
                    {itemEditando && (
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="edit-departamento" className="text-right">
                            Departamento
                          </Label>
                          <Input
                            id="edit-departamento"
                            value={itemEditando.departamento}
                            onChange={(e) => setItemEditando({ ...itemEditando, departamento: e.target.value })}
                            className="col-span-3"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="edit-valorPrevisto" className="text-right">
                            Valor Previsto
                          </Label>
                          <Input
                            id="edit-valorPrevisto"
                            type="number"
                            value={itemEditando.valorPrevisto}
                            onChange={(e) =>
                              setItemEditando({ ...itemEditando, valorPrevisto: Number(e.target.value) })
                            }
                            className="col-span-3"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="edit-descricao" className="text-right">
                            Descrição
                          </Label>
                          <Input
                            id="edit-descricao"
                            value={itemEditando.descricao}
                            onChange={(e) => setItemEditando({ ...itemEditando, descricao: e.target.value })}
                            className="col-span-3"
                          />
                        </div>
                      </div>
                    )}
                    <DialogFooter>
                      <Button onClick={handleEditItem}>Salvar Alterações</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="orcamento">Orçamento</TabsTrigger>
                <TabsTrigger value="grafico">Gráfico</TabsTrigger>
              </TabsList>
              <TabsContent value="orcamento" className="pt-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-100">
                        <TableHead className="font-semibold">Departamento</TableHead>
                        <TableHead className="font-semibold text-right">Valor Previsto</TableHead>
                        <TableHead className="font-semibold text-right">Valor Realizado</TableHead>
                        <TableHead className="font-semibold text-right">% Execução</TableHead>
                        <TableHead className="font-semibold">Progresso</TableHead>
                        <TableHead className="font-semibold">Descrição</TableHead>
                        <TableHead className="font-semibold text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orcamentoAtual && orcamentoAtual.itens.length > 0 ? (
                        <>
                          {orcamentoAtual.itens.map((item, index) => {
                            const valorRealizado = valoresRealizados[item.departamento] || 0
                            const percentual =
                              item.valorPrevisto > 0 ? Math.round((valorRealizado / item.valorPrevisto) * 100) : 0

                            return (
                              <TableRow key={item.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                <TableCell className="font-medium">{item.departamento}</TableCell>
                                <TableCell className="text-right">
                                  {item.valorPrevisto.toLocaleString("pt-MZ", { style: "currency", currency: "MZN" })}
                                </TableCell>
                                <TableCell className="text-right">
                                  {valorRealizado.toLocaleString("pt-MZ", { style: "currency", currency: "MZN" })}
                                </TableCell>
                                <TableCell className="text-right">
                                  <span
                                    className={
                                      percentual > 100
                                        ? "text-red-600 font-semibold"
                                        : percentual > 90
                                          ? "text-yellow-600 font-semibold"
                                          : "text-green-600 font-semibold"
                                    }
                                  >
                                    {percentual}%
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Progress
                                    value={percentual > 100 ? 100 : percentual}
                                    className={
                                      percentual > 100
                                        ? "bg-red-200"
                                        : percentual > 90
                                          ? "bg-yellow-200"
                                          : "bg-green-200"
                                    }
                                    indicatorClassName={
                                      percentual > 100
                                        ? "bg-red-600"
                                        : percentual > 90
                                          ? "bg-yellow-600"
                                          : "bg-green-600"
                                    }
                                  />
                                </TableCell>
                                <TableCell>{item.descricao}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setItemEditando(item)
                                        setIsEditDialogOpen(true)
                                      }}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleDeleteItem(item.id)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                          <TableRow className="bg-gray-100 font-bold">
                            <TableCell>TOTAL</TableCell>
                            <TableCell className="text-right">
                              {totalPrevisto.toLocaleString("pt-MZ", { style: "currency", currency: "MZN" })}
                            </TableCell>
                            <TableCell className="text-right">
                              {totalRealizado.toLocaleString("pt-MZ", { style: "currency", currency: "MZN" })}
                            </TableCell>
                            <TableCell className="text-right">
                              <span
                                className={
                                  percentualTotal > 100
                                    ? "text-red-600"
                                    : percentualTotal > 90
                                      ? "text-yellow-600"
                                      : "text-green-600"
                                }
                              >
                                {percentualTotal}%
                              </span>
                            </TableCell>
                            <TableCell>
                              <Progress
                                value={percentualTotal > 100 ? 100 : percentualTotal}
                                className={
                                  percentualTotal > 100
                                    ? "bg-red-200"
                                    : percentualTotal > 90
                                      ? "bg-yellow-200"
                                      : "bg-green-200"
                                }
                                indicatorClassName={
                                  percentualTotal > 100
                                    ? "bg-red-600"
                                    : percentualTotal > 90
                                      ? "bg-yellow-600"
                                      : "bg-green-600"
                                }
                              />
                            </TableCell>
                            <TableCell colSpan={2}></TableCell>
                          </TableRow>
                        </>
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4">
                            Nenhum item de orçamento encontrado para este mês. Clique em "Adicionar Item" para começar.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              <TabsContent value="grafico" className="pt-4">
                {dadosGrafico.length > 0 ? (
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dadosGrafico} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="departamento" />
                        <YAxis />
                        <Tooltip formatter={(value) => `${Number(value).toLocaleString("pt-MZ")} MT`} />
                        <Legend />
                        <Bar dataKey="previsto" name="Valor Previsto" fill="#8884d8" />
                        <Bar dataKey="realizado" name="Valor Realizado" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">Sem dados para exibir</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Não há dados de orçamento para este mês. Adicione itens ao orçamento para visualizar o gráfico.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </PrintLayout>
  )
}

