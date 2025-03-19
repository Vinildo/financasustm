"use client"

import { useState, useEffect, useMemo } from "react"
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from "date-fns"
import { pt } from "date-fns/locale"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { PrintLayout } from "@/components/print-layout"
import { Printer, FileDown, Info } from "lucide-react"
import { useAppContext } from "@/contexts/AppContext"
import { useAuth } from "@/hooks/use-auth"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { DateRange } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import type { Receita } from "./gestao-receitas"
import { useToast } from "@/components/ui/use-toast"

// Cores para os gráficos
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#8dd1e1"]

export function DemonstracaoResultados() {
  const { fornecedores } = useAppContext()
  const { user } = useAuth()
  const [periodoSelecionado, setPeriodoSelecionado] = useState<string>("mes")
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  })
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [activeTab, setActiveTab] = useState("resumo")
  const { toast } = useToast()

  // Carregar receitas do localStorage
  useEffect(() => {
    const storedReceitas = localStorage.getItem("receitas")
    if (storedReceitas) {
      try {
        const parsedReceitas = JSON.parse(storedReceitas, (key, value) => {
          if (key === "data" || key === "dataRecebimento") {
            return value ? new Date(value) : null
          }
          return value
        })
        setReceitas(parsedReceitas)
      } catch (error) {
        console.error("Erro ao carregar receitas:", error)
      }
    }
  }, [])

  // Calcular período com base na seleção
  const periodo = useMemo(() => {
    const hoje = new Date()

    if (periodoSelecionado === "mes") {
      return {
        from: startOfMonth(hoje),
        to: endOfMonth(hoje),
      }
    } else if (periodoSelecionado === "trimestre") {
      return {
        from: subMonths(hoje, 3),
        to: hoje,
      }
    } else if (periodoSelecionado === "semestre") {
      return {
        from: subMonths(hoje, 6),
        to: hoje,
      }
    } else if (periodoSelecionado === "ano") {
      const anoAtual = hoje.getFullYear()
      return {
        from: new Date(anoAtual, 0, 1), // 1º de janeiro
        to: new Date(anoAtual, 11, 31), // 31 de dezembro
      }
    } else {
      return dateRange
    }
  }, [periodoSelecionado, dateRange])

  // Filtrar pagamentos com base no período
  const pagamentosFiltrados = useMemo(() => {
    if (!periodo.from || !periodo.to) return []

    return fornecedores.flatMap((fornecedor) =>
      fornecedor.pagamentos
        .filter((pagamento) => {
          const dataPagamento = pagamento.dataPagamento
            ? new Date(pagamento.dataPagamento)
            : new Date(pagamento.dataVencimento)

          return isWithinInterval(dataPagamento, {
            start: periodo.from!,
            end: periodo.to!,
          })
        })
        .map((pagamento) => ({
          ...pagamento,
          fornecedorNome: fornecedor.nome,
          fornecedorId: fornecedor.id,
        })),
    )
  }, [fornecedores, periodo])

  // Filtrar receitas com base no período
  const receitasFiltradas = useMemo(() => {
    if (!periodo.from || !periodo.to) return []

    return receitas.filter((receita) => {
      const dataReceita =
        receita.status === "recebido" && receita.dataRecebimento
          ? new Date(receita.dataRecebimento)
          : new Date(receita.data)

      return isWithinInterval(dataReceita, {
        start: periodo.from!,
        end: periodo.to!,
      })
    })
  }, [receitas, periodo])

  // Calcular totais
  const totalReceitas = useMemo(() => {
    return receitasFiltradas.filter((r) => r.status === "recebido").reduce((acc, curr) => acc + curr.valor, 0)
  }, [receitasFiltradas])

  const totalDespesas = useMemo(() => {
    return pagamentosFiltrados.filter((p) => p.estado === "pago").reduce((acc, curr) => acc + curr.valor, 0)
  }, [pagamentosFiltrados])

  const resultado = totalReceitas - totalDespesas

  // Calcular receitas por categoria
  const receitasPorCategoria = useMemo(() => {
    const dados: Record<string, number> = {}

    receitasFiltradas
      .filter((r) => r.status === "recebido")
      .forEach((receita) => {
        if (!dados[receita.categoria]) {
          dados[receita.categoria] = 0
        }
        dados[receita.categoria] += receita.valor
      })

    return Object.entries(dados)
      .map(([categoria, valor]) => ({
        categoria,
        valor,
      }))
      .sort((a, b) => b.valor - a.valor)
  }, [receitasFiltradas])

  // Calcular despesas por departamento
  const despesasPorDepartamento = useMemo(() => {
    const dados: Record<string, number> = {}

    pagamentosFiltrados
      .filter((p) => p.estado === "pago")
      .forEach((pagamento) => {
        if (!dados[pagamento.departamento]) {
          dados[pagamento.departamento] = 0
        }
        dados[pagamento.departamento] += pagamento.valor
      })

    return Object.entries(dados)
      .map(([departamento, valor]) => ({
        departamento,
        valor,
      }))
      .sort((a, b) => b.valor - a.valor)
  }, [pagamentosFiltrados])

  // Calcular tendência mensal
  const tendenciaMensal = useMemo(() => {
    const hoje = new Date()
    const meses: Record<string, { receitas: number; despesas: number }> = {}

    // Inicializar os últimos 12 meses
    for (let i = 0; i < 12; i++) {
      const data = subMonths(hoje, i)
      const chave = format(data, "MMM yyyy", { locale: pt })
      meses[chave] = { receitas: 0, despesas: 0 }
    }

    // Preencher receitas
    receitasFiltradas
      .filter((r) => r.status === "recebido")
      .forEach((receita) => {
        const data = receita.dataRecebimento ? new Date(receita.dataRecebimento) : new Date(receita.data)
        const chave = format(data, "MMM yyyy", { locale: pt })
        if (meses[chave]) {
          meses[chave].receitas += receita.valor
        }
      })

    // Preencher despesas
    pagamentosFiltrados
      .filter((p) => p.estado === "pago")
      .forEach((pagamento) => {
        const data = pagamento.dataPagamento ? new Date(pagamento.dataPagamento) : new Date(pagamento.dataVencimento)
        const chave = format(data, "MMM yyyy", { locale: pt })
        if (meses[chave]) {
          meses[chave].despesas += pagamento.valor
        }
      })

    return Object.entries(meses)
      .map(([mes, valores]) => ({
        mes,
        receitas: valores.receitas,
        despesas: valores.despesas,
        resultado: valores.receitas - valores.despesas,
      }))
      .reverse()
  }, [receitasFiltradas, pagamentosFiltrados])

  // Calcular indicadores financeiros
  const indicadores = useMemo(() => {
    // Margem de lucro
    const margemLucro = totalReceitas > 0 ? (resultado / totalReceitas) * 100 : 0

    // Relação despesa/receita
    const relacaoDespesaReceita = totalReceitas > 0 ? (totalDespesas / totalReceitas) * 100 : 0

    // Receitas pendentes
    const receitasPendentes = receitasFiltradas
      .filter((r) => r.status === "pendente" || r.status === "atrasado")
      .reduce((acc, curr) => acc + curr.valor, 0)

    // Despesas pendentes
    const despesasPendentes = pagamentosFiltrados
      .filter((p) => p.estado === "pendente" || p.estado === "atrasado")
      .reduce((acc, curr) => acc + curr.valor, 0)

    // Resultado projetado (incluindo pendentes)
    const resultadoProjetado = totalReceitas + receitasPendentes - (totalDespesas + despesasPendentes)

    return {
      margemLucro,
      relacaoDespesaReceita,
      receitasPendentes,
      despesasPendentes,
      resultadoProjetado,
    }
  }, [totalReceitas, totalDespesas, resultado, receitasFiltradas, pagamentosFiltrados])

  // Função para imprimir o relatório
  const handlePrint = () => {
    window.print()
  }

  // Função para exportar para PDF
  const handleExportPDF = () => {
    // Implementação futura
    toast({
      title: "Exportação para PDF",
      description: "Esta funcionalidade será implementada em breve.",
    })
  }

  return (
    <PrintLayout title="Demonstração de Resultados">
      <Card>
        <CardHeader className="bg-blue-700 text-white">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <CardTitle>Demonstração de Resultados</CardTitle>
              <CardDescription className="text-blue-100">
                Análise de receitas, despesas e resultados financeiros
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={periodoSelecionado} onValueChange={setPeriodoSelecionado}>
                <SelectTrigger className="w-[180px] bg-white border-gray-300">
                  <SelectValue placeholder="Selecionar período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mes">Mês Atual</SelectItem>
                  <SelectItem value="trimestre">Último Trimestre</SelectItem>
                  <SelectItem value="semestre">Último Semestre</SelectItem>
                  <SelectItem value="ano">Ano Atual</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>

              {periodoSelecionado === "personalizado" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="bg-white border-gray-300">
                      {periodo.from && periodo.to ? (
                        <>
                          {format(periodo.from, "dd/MM/yyyy", { locale: pt })} -
                          {format(periodo.to, "dd/MM/yyyy", { locale: pt })}
                        </>
                      ) : (
                        <span>Selecionar datas</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={periodo.from}
                      selected={periodo}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              )}

              <Button onClick={handlePrint} className="print:hidden bg-blue-600 text-white hover:bg-blue-700">
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>

              <Button onClick={handleExportPDF} className="print:hidden bg-blue-600 text-white hover:bg-blue-700">
                <FileDown className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="resumo">Resumo</TabsTrigger>
              <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
              <TabsTrigger value="tendencias">Tendências</TabsTrigger>
            </TabsList>

            {/* Aba de Resumo */}
            <TabsContent value="resumo" className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Total de Receitas</CardTitle>
                    <CardDescription>
                      {periodo.from && periodo.to
                        ? `${format(periodo.from, "dd/MM/yyyy", { locale: pt })} - ${format(periodo.to, "dd/MM/yyyy", { locale: pt })}`
                        : "Período selecionado"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      {totalReceitas.toLocaleString("pt-MZ", { style: "currency", currency: "MZN" })}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {receitasFiltradas.filter((r) => r.status === "recebido").length} receitas no período
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Total de Despesas</CardTitle>
                    <CardDescription>
                      {periodo.from && periodo.to
                        ? `${format(periodo.from, "dd/MM/yyyy", { locale: pt })} - ${format(periodo.to, "dd/MM/yyyy", { locale: pt })}`
                        : "Período selecionado"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-red-600">
                      {totalDespesas.toLocaleString("pt-MZ", { style: "currency", currency: "MZN" })}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {pagamentosFiltrados.filter((p) => p.estado === "pago").length} despesas no período
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Resultado</CardTitle>
                    <CardDescription>Receitas - Despesas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-3xl font-bold ${resultado >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {resultado.toLocaleString("pt-MZ", { style: "currency", currency: "MZN" })}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                      <div
                        className={`h-2.5 rounded-full ${resultado >= 0 ? "bg-green-600" : "bg-red-600"}`}
                        style={{ width: `${Math.min((Math.abs(resultado) / (totalReceitas || 1)) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Receitas por Categoria</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={receitasPorCategoria}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="valor"
                            nameKey="categoria"
                            label={({ categoria, percent }) => `${categoria}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {receitasPorCategoria.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => value.toLocaleString("pt-MZ", { style: "currency", currency: "MZN" })}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Despesas por Departamento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={despesasPorDepartamento} layout="vertical" margin={{ left: 20, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            type="number"
                            tickFormatter={(value) =>
                              value.toLocaleString("pt-MZ", {
                                style: "currency",
                                currency: "MZN",
                                notation: "compact",
                                maximumFractionDigits: 1,
                              })
                            }
                          />
                          <YAxis type="category" dataKey="departamento" width={100} />
                          <Tooltip
                            formatter={(value) => value.toLocaleString("pt-MZ", { style: "currency", currency: "MZN" })}
                          />
                          <Bar dataKey="valor" fill="#FF8042">
                            {despesasPorDepartamento.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Indicadores Financeiros</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-medium">Margem de Resultado</h3>
                        <Popover>
                          <PopoverTrigger>
                            <Info className="h-4 w-4 text-gray-400" />
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <p className="text-sm">
                              A margem de resultado indica a percentagem das receitas que se converte em resultado
                              positivo. Uma margem maior indica melhor eficiência financeira.
                            </p>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="text-2xl font-bold mt-2">{indicadores.margemLucro.toFixed(1)}%</div>
                      <div className={`text-sm ${indicadores.margemLucro >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {indicadores.margemLucro >= 20
                          ? "Excelente"
                          : indicadores.margemLucro >= 10
                            ? "Boa"
                            : indicadores.margemLucro >= 0
                              ? "Aceitável"
                              : "Negativa"}
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-medium">Relação Despesa/Receita</h3>
                        <Popover>
                          <PopoverTrigger>
                            <Info className="h-4 w-4 text-gray-400" />
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <p className="text-sm">
                              Indica quanto das receitas é consumido pelas despesas. Um valor abaixo de 100% indica
                              resultado positivo.
                            </p>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="text-2xl font-bold mt-2">{indicadores.relacaoDespesaReceita.toFixed(1)}%</div>
                      <div
                        className={`text-sm ${
                          indicadores.relacaoDespesaReceita <= 90
                            ? "text-green-600"
                            : indicadores.relacaoDespesaReceita <= 100
                              ? "text-yellow-600"
                              : "text-red-600"
                        }`}
                      >
                        {indicadores.relacaoDespesaReceita <= 80
                          ? "Excelente"
                          : indicadores.relacaoDespesaReceita <= 90
                            ? "Boa"
                            : indicadores.relacaoDespesaReceita <= 100
                              ? "Aceitável"
                              : "Preocupante"}
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-medium">Resultado Projetado</h3>
                        <Popover>
                          <PopoverTrigger>
                            <Info className="h-4 w-4 text-gray-400" />
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <p className="text-sm">
                              Resultado projetado considerando todas as receitas e despesas pendentes. Indica a
                              tendência do resultado final após todas as transações serem concluídas.
                            </p>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div
                        className={`text-2xl font-bold mt-2 ${indicadores.resultadoProjetado >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {indicadores.resultadoProjetado.toLocaleString("pt-MZ", { style: "currency", currency: "MZN" })}
                      </div>
                      <div className="text-sm text-gray-600">
                        Inclui{" "}
                        {indicadores.receitasPendentes.toLocaleString("pt-MZ", { style: "currency", currency: "MZN" })}{" "}
                        em receitas pendentes
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba de Detalhes */}
            <TabsContent value="detalhes" className="pt-6">
              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Detalhamento de Receitas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-100">
                          <TableHead className="font-semibold">Descrição</TableHead>
                          <TableHead className="font-semibold">Categoria</TableHead>
                          <TableHead className="font-semibold">Fonte</TableHead>
                          <TableHead className="font-semibold">Data</TableHead>
                          <TableHead className="font-semibold text-right">Valor</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {receitasFiltradas.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                              Nenhuma receita encontrada para o período selecionado.
                            </TableCell>
                          </TableRow>
                        ) : (
                          receitasFiltradas.map((receita, index) => (
                            <TableRow key={receita.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <TableCell className="font-medium">{receita.descricao}</TableCell>
                              <TableCell>{receita.categoria}</TableCell>
                              <TableCell>{receita.fonte}</TableCell>
                              <TableCell>
                                {format(
                                  receita.status === "recebido" && receita.dataRecebimento
                                    ? new Date(receita.dataRecebimento)
                                    : new Date(receita.data),
                                  "dd/MM/yyyy",
                                  { locale: pt },
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {receita.valor.toLocaleString("pt-MZ", { style: "currency", currency: "MZN" })}
                              </TableCell>
                              <TableCell>
                                {receita.status === "recebido" ? (
                                  <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                    Recebido
                                  </span>
                                ) : receita.status === "pendente" ? (
                                  <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                                    Pendente
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                                    Atrasado
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Detalhamento de Despesas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-100">
                          <TableHead className="font-semibold">Referência</TableHead>
                          <TableHead className="font-semibold">Fornecedor</TableHead>
                          <TableHead className="font-semibold">Departamento</TableHead>
                          <TableHead className="font-semibold">Data</TableHead>
                          <TableHead className="font-semibold text-right">Valor</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagamentosFiltrados.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                              Nenhuma despesa encontrada para o período selecionado.
                            </TableCell>
                          </TableRow>
                        ) : (
                          pagamentosFiltrados.map((pagamento, index) => (
                            <TableRow key={pagamento.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <TableCell className="font-medium">{pagamento.referencia}</TableCell>
                              <TableCell>{pagamento.fornecedorNome}</TableCell>
                              <TableCell>{pagamento.departamento}</TableCell>
                              <TableCell>
                                {format(
                                  pagamento.dataPagamento
                                    ? new Date(pagamento.dataPagamento)
                                    : new Date(pagamento.dataVencimento),
                                  "dd/MM/yyyy",
                                  { locale: pt },
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {pagamento.valor.toLocaleString("pt-MZ", { style: "currency", currency: "MZN" })}
                              </TableCell>
                              <TableCell>
                                {pagamento.estado === "pago" ? (
                                  <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                    Pago
                                  </span>
                                ) : pagamento.estado === "pendente" ? (
                                  <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                                    Pendente
                                  </span>
                                ) : pagamento.estado === "atrasado" ? (
                                  <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                                    Atrasado
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                                    Cancelado
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Aba de Tendências */}
            <TabsContent value="tendencias" className="pt-6">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Evolução Mensal de Receitas e Despesas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={tendenciaMensal} margin={{ left: 20, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="mes" />
                        <YAxis
                          tickFormatter={(value) =>
                            value.toLocaleString("pt-MZ", {
                              style: "currency",
                              currency: "MZN",
                              notation: "compact",
                              maximumFractionDigits: 1,
                            })
                          }
                        />
                        <Tooltip
                          formatter={(value) => value.toLocaleString("pt-MZ", { style: "currency", currency: "MZN" })}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="receitas"
                          name="Receitas"
                          stroke="#00C49F"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="despesas"
                          name="Despesas"
                          stroke="#FF8042"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="resultado"
                          name="Resultado"
                          stroke="#8884d8"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Análise de Tendências</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium mb-2">Tendência de Receitas</h3>
                        <p className="text-sm text-gray-600">
                          {tendenciaMensal.length > 1 && tendenciaMensal[0].receitas > tendenciaMensal[1].receitas
                            ? "As receitas estão em tendência de crescimento no último mês."
                            : tendenciaMensal.length > 1 && tendenciaMensal[0].receitas < tendenciaMensal[1].receitas
                              ? "As receitas estão em tendência de queda no último mês."
                              : "As receitas estão estáveis no último mês."}
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                          <div
                            className={`h-2.5 rounded-full ${
                              tendenciaMensal.length > 1 && tendenciaMensal[0].receitas > tendenciaMensal[1].receitas
                                ? "bg-green-600"
                                : tendenciaMensal.length > 1 &&
                                    tendenciaMensal[0].receitas < tendenciaMensal[1].receitas
                                  ? "bg-red-600"
                                  : "bg-yellow-600"
                            }`}
                            style={{
                              width: `${
                                tendenciaMensal.length > 1
                                  ? Math.min(
                                      Math.abs(
                                        (tendenciaMensal[0].receitas / (tendenciaMensal[1].receitas || 1) - 1) * 100,
                                      ) + 50,
                                      100,
                                    )
                                  : 50
                              }%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-medium mb-2">Tendência de Despesas</h3>
                        <p className="text-sm text-gray-600">
                          {tendenciaMensal.length > 1 && tendenciaMensal[0].despesas < tendenciaMensal[1].despesas
                            ? "As despesas estão em tendência de queda no último mês."
                            : tendenciaMensal.length > 1 && tendenciaMensal[0].despesas > tendenciaMensal[1].despesas
                              ? "As despesas estão em tendência de crescimento no último mês."
                              : "As despesas estão estáveis no último mês."}
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                          <div
                            className={`h-2.5 rounded-full ${
                              tendenciaMensal.length > 1 && tendenciaMensal[0].despesas < tendenciaMensal[1].despesas
                                ? "bg-green-600"
                                : tendenciaMensal.length > 1 &&
                                    tendenciaMensal[0].despesas > tendenciaMensal[1].despesas
                                  ? "bg-red-600"
                                  : "bg-yellow-600"
                            }`}
                            style={{
                              width: `${
                                tendenciaMensal.length > 1
                                  ? Math.min(
                                      Math.abs(
                                        (tendenciaMensal[0].despesas / (tendenciaMensal[1].despesas || 1) - 1) * 100,
                                      ) + 50,
                                      100,
                                    )
                                  : 50
                              }%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-medium mb-2">Tendência de Resultado</h3>
                        <p className="text-sm text-gray-600">
                          {tendenciaMensal.length > 1 && tendenciaMensal[0].resultado > tendenciaMensal[1].resultado
                            ? "O resultado está em tendência de melhoria no último mês."
                            : tendenciaMensal.length > 1 && tendenciaMensal[0].resultado < tendenciaMensal[1].resultado
                              ? "O resultado está em tendência de piora no último mês."
                              : "O resultado está estável no último mês."}
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                          <div
                            className={`h-2.5 rounded-full ${
                              tendenciaMensal.length > 1 && tendenciaMensal[0].resultado > tendenciaMensal[1].resultado
                                ? "bg-green-600"
                                : tendenciaMensal.length > 1 &&
                                    tendenciaMensal[0].resultado < tendenciaMensal[1].resultado
                                  ? "bg-red-600"
                                  : "bg-yellow-600"
                            }`}
                            style={{
                              width: `${
                                tendenciaMensal.length > 1 && tendenciaMensal[1].resultado !== 0
                                  ? Math.min(
                                      Math.abs(
                                        (tendenciaMensal[0].resultado / (tendenciaMensal[1].resultado || 1) - 1) * 100,
                                      ) + 50,
                                      100,
                                    )
                                  : 50
                              }%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Projeções e Recomendações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium mb-2">Projeção para o Próximo Período</h3>
                        <p className="text-sm text-gray-600">
                          {tendenciaMensal.length >= 3 && (
                            <>
                              Baseado nas tendências dos últimos 3 meses, projeta-se
                              {tendenciaMensal[0].resultado > 0 &&
                              tendenciaMensal[1].resultado > 0 &&
                              tendenciaMensal[2].resultado > 0
                                ? " a continuidade de resultados positivos."
                                : tendenciaMensal[0].resultado > tendenciaMensal[1].resultado &&
                                    tendenciaMensal[1].resultado > tendenciaMensal[2].resultado
                                  ? " uma melhoria contínua nos resultados."
                                  : tendenciaMensal[0].resultado < tendenciaMensal[1].resultado &&
                                      tendenciaMensal[1].resultado < tendenciaMensal[2].resultado
                                    ? " uma deterioração contínua nos resultados."
                                    : " resultados mistos sem tendência clara."}
                            </>
                          )}
                          {tendenciaMensal.length < 3 &&
                            "Dados insuficientes para uma projeção confiável. Recomenda-se acumular mais dados históricos."}
                        </p>
                      </div>

                      <div>
                        <h3 className="font-medium mb-2">Recomendações Financeiras</h3>
                        <ul className="text-sm text-gray-600 space-y-2 list-disc pl-5">
                          {resultado < 0 && (
                            <li>
                              <span className="font-medium text-red-600">Atenção:</span> O resultado atual é negativo.
                              Recomenda-se revisar despesas e buscar aumentar receitas.
                            </li>
                          )}

                          {indicadores.relacaoDespesaReceita > 90 && (
                            <li>
                              A relação despesa/receita está alta ({indicadores.relacaoDespesaReceita.toFixed(1)}%).
                              Considere medidas para reduzir custos operacionais.
                            </li>
                          )}

                          {indicadores.receitasPendentes > totalReceitas * 0.3 && (
                            <li>
                              Há um volume significativo de receitas pendentes. Intensifique esforços de cobrança para
                              melhorar o fluxo de caixa.
                            </li>
                          )}

                          {tendenciaMensal.length >= 3 &&
                            tendenciaMensal[0].despesas > tendenciaMensal[1].despesas &&
                            tendenciaMensal[1].despesas > tendenciaMensal[2].despesas && (
                              <li>
                                As despesas estão em tendência de crescimento contínuo. Avalie se este aumento está
                                alinhado com o crescimento das receitas.
                              </li>
                            )}

                          {tendenciaMensal.length >= 3 &&
                            tendenciaMensal[0].receitas < tendenciaMensal[1].receitas &&
                            tendenciaMensal[1].receitas < tendenciaMensal[2].receitas && (
                              <li>
                                As receitas estão em tendência de queda contínua. Desenvolva estratégias para reverter
                                esta tendência.
                              </li>
                            )}

                          {resultado > 0 && indicadores.margemLucro > 15 && (
                            <li>
                              <span className="font-medium text-green-600">Positivo:</span> A margem de resultado está
                              saudável. Considere investimentos estratégicos para crescimento.
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </PrintLayout>
  )
}

