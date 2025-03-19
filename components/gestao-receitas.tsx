"use client"

import { useState, useEffect } from "react"
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns"
import { pt } from "date-fns/locale"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { PrintLayout } from "@/components/print-layout"
import { Trash2, Printer, ChevronLeft, ChevronRight, Plus, Search, Edit, FileText } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { Badge } from "@/components/ui/badge"
import { useAppContext } from "@/contexts/AppContext"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Definir tipos para receitas
export interface Receita {
  id: string
  data: Date
  descricao: string
  valor: number
  categoria: string
  fonte: string
  observacoes?: string
  status: "recebido" | "pendente" | "atrasado"
  dataRecebimento?: Date | null
  metodoPagamento?: string
  comprovante?: string
  historico?: any[]
}

export function GestaoReceitas() {
  const { user } = useAuth()
  const { hasPermission } = useAppContext()
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [mesSelecionado, setMesSelecionado] = useState<Date>(startOfMonth(new Date()))
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [receitaSelecionada, setReceitaSelecionada] = useState<Receita | null>(null)
  const [novaReceita, setNovaReceita] = useState<Partial<Receita>>({
    status: "pendente",
    data: new Date(),
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("todas")

  // Categorias de receita
  const categorias = ["Mensalidades", "Matrículas", "Taxas", "Doações", "Subsídios", "Eventos", "Serviços", "Outras"]

  // Fontes de receita
  const fontes = ["Alunos", "Governo", "Empresas", "ONGs", "Fundações", "Comunidade", "Internacional", "Outras"]

  // Métodos de pagamento
  const metodosPagamento = [
    "Transferência Bancária",
    "Depósito",
    "Dinheiro",
    "Cheque",
    "Cartão",
    "Mobile Money",
    "Outro",
  ]

  // Carregar dados do localStorage ao iniciar
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
        toast({
          title: "Erro",
          description: "Não foi possível carregar as receitas.",
          variant: "destructive",
        })
      }
    }
  }, [])

  // Salvar dados no localStorage sempre que receitas for atualizado
  useEffect(() => {
    localStorage.setItem("receitas", JSON.stringify(receitas))
  }, [receitas])

  // Filtrar receitas por mês e termo de pesquisa
  const receitasFiltradas = receitas.filter((receita) => {
    const dataReceita = new Date(receita.data)
    const dentroDoMes = dataReceita >= startOfMonth(mesSelecionado) && dataReceita <= endOfMonth(mesSelecionado)

    const matchesSearch =
      receita.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receita.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receita.fonte.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus =
      activeTab === "todas" ||
      (activeTab === "recebidas" && receita.status === "recebido") ||
      (activeTab === "pendentes" && receita.status === "pendente") ||
      (activeTab === "atrasadas" && receita.status === "atrasado")

    return dentroDoMes && matchesSearch && matchesStatus
  })

  // Calcular totais
  const totalReceitas = receitasFiltradas.reduce((acc, curr) => acc + curr.valor, 0)
  const totalRecebido = receitasFiltradas
    .filter((r) => r.status === "recebido")
    .reduce((acc, curr) => acc + curr.valor, 0)
  const totalPendente = receitasFiltradas
    .filter((r) => r.status === "pendente" || r.status === "atrasado")
    .reduce((acc, curr) => acc + curr.valor, 0)

  // Adicionar nova receita
  const handleAddReceita = () => {
    if (!novaReceita.descricao || !novaReceita.valor || !novaReceita.categoria || !novaReceita.fonte) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      })
      return
    }

    const novaReceitaCompleta: Receita = {
      id: Date.now().toString(),
      data: novaReceita.data || new Date(),
      descricao: novaReceita.descricao || "",
      valor: novaReceita.valor || 0,
      categoria: novaReceita.categoria || "",
      fonte: novaReceita.fonte || "",
      observacoes: novaReceita.observacoes || "",
      status: novaReceita.status as "recebido" | "pendente" | "atrasado",
      dataRecebimento: novaReceita.status === "recebido" ? novaReceita.dataRecebimento || new Date() : null,
      metodoPagamento: novaReceita.metodoPagamento,
      comprovante: novaReceita.comprovante,
      historico: [
        {
          id: Date.now().toString(),
          data: new Date(),
          usuario: user?.username || "Sistema",
          acao: "Criação",
          detalhes: "Receita criada",
        },
      ],
    }

    setReceitas([...receitas, novaReceitaCompleta])
    setNovaReceita({
      status: "pendente",
      data: new Date(),
    })
    setIsAddDialogOpen(false)
    toast({
      title: "Receita adicionada",
      description: "A receita foi adicionada com sucesso.",
    })
  }

  // Editar receita existente
  const handleEditReceita = () => {
    if (!receitaSelecionada) return

    const receitaAtualizada = {
      ...receitaSelecionada,
      historico: [
        ...(receitaSelecionada.historico || []),
        {
          id: Date.now().toString(),
          data: new Date(),
          usuario: user?.username || "Sistema",
          acao: "Edição",
          detalhes: "Receita atualizada",
        },
      ],
    }

    setReceitas(receitas.map((r) => (r.id === receitaAtualizada.id ? receitaAtualizada : r)))
    setIsEditDialogOpen(false)
    setReceitaSelecionada(null)
    toast({
      title: "Receita atualizada",
      description: "A receita foi atualizada com sucesso.",
    })
  }

  // Excluir receita
  const handleDeleteReceita = (id: string) => {
    setReceitas(receitas.filter((r) => r.id !== id))
    toast({
      title: "Receita excluída",
      description: "A receita foi excluída com sucesso.",
    })
  }

  // Marcar receita como recebida
  const handleMarcarComoRecebida = (id: string) => {
    setReceitas(
      receitas.map((r) => {
        if (r.id === id) {
          return {
            ...r,
            status: "recebido",
            dataRecebimento: new Date(),
            historico: [
              ...(r.historico || []),
              {
                id: Date.now().toString(),
                data: new Date(),
                usuario: user?.username || "Sistema",
                acao: "Status",
                detalhes: "Marcada como recebida",
              },
            ],
          }
        }
        return r
      }),
    )
    toast({
      title: "Status atualizado",
      description: "A receita foi marcada como recebida.",
    })
  }

  // Navegação entre meses
  const handleMesAnterior = () => {
    setMesSelecionado(subMonths(mesSelecionado, 1))
  }

  const handleProximoMes = () => {
    setMesSelecionado(addMonths(mesSelecionado, 1))
  }

  // Imprimir relatório
  const handlePrint = () => {
    window.print()
  }

  // Verificar permissões
  const podeEditar =
    hasPermission("manage_receitas") ||
    user?.role === "admin" ||
    user?.role === "reitor" ||
    user?.role === "directora_financeira"

  return (
    <PrintLayout title="Gestão de Receitas">
      <Card>
        <CardHeader className="bg-green-700 text-white">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Gestão de Receitas</CardTitle>
              <CardDescription className="text-green-100">Gerencie as receitas da instituição</CardDescription>
            </div>
            <div className="space-x-2">
              <Button onClick={handlePrint} className="print:hidden bg-green-600 text-white hover:bg-green-500">
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Filtros e controles */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            <div className="flex items-center space-x-2">
              <Button onClick={handleMesAnterior} variant="outline">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-lg font-semibold">{format(mesSelecionado, "MMMM yyyy", { locale: pt })}</span>
              <Button onClick={handleProximoMes} variant="outline">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar receitas..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {podeEditar && (
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 text-white hover:bg-green-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Receita
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px]">
                  <DialogHeader>
                    <DialogTitle>Adicionar Nova Receita</DialogTitle>
                    <DialogDescription>
                      Preencha os detalhes da nova receita a ser adicionada ao sistema.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="descricao" className="mb-2 block">
                          Descrição <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="descricao"
                          value={novaReceita.descricao || ""}
                          onChange={(e) => setNovaReceita({ ...novaReceita, descricao: e.target.value })}
                          placeholder="Ex: Mensalidades de Junho"
                        />
                      </div>
                      <div>
                        <Label htmlFor="valor" className="mb-2 block">
                          Valor (MT) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="valor"
                          type="number"
                          step="0.01"
                          value={novaReceita.valor || ""}
                          onChange={(e) => setNovaReceita({ ...novaReceita, valor: Number(e.target.value) })}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="categoria" className="mb-2 block">
                          Categoria <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={novaReceita.categoria}
                          onValueChange={(value) => setNovaReceita({ ...novaReceita, categoria: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {categorias.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="fonte" className="mb-2 block">
                          Fonte <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={novaReceita.fonte}
                          onValueChange={(value) => setNovaReceita({ ...novaReceita, fonte: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a fonte" />
                          </SelectTrigger>
                          <SelectContent>
                            {fontes.map((fonte) => (
                              <SelectItem key={fonte} value={fonte}>
                                {fonte}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="data" className="mb-2 block">
                          Data Prevista <span className="text-red-500">*</span>
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                              {novaReceita.data ? (
                                format(novaReceita.data, "dd/MM/yyyy", { locale: pt })
                              ) : (
                                <span>Selecionar data</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={novaReceita.data}
                              onSelect={(date) => setNovaReceita({ ...novaReceita, data: date })}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label htmlFor="status" className="mb-2 block">
                          Status <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={novaReceita.status}
                          onValueChange={(value: "recebido" | "pendente" | "atrasado") =>
                            setNovaReceita({ ...novaReceita, status: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendente">Pendente</SelectItem>
                            <SelectItem value="recebido">Recebido</SelectItem>
                            <SelectItem value="atrasado">Atrasado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {novaReceita.status === "recebido" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="dataRecebimento" className="mb-2 block">
                            Data de Recebimento
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start text-left font-normal">
                                {novaReceita.dataRecebimento ? (
                                  format(novaReceita.dataRecebimento, "dd/MM/yyyy", { locale: pt })
                                ) : (
                                  <span>Selecionar data</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={novaReceita.dataRecebimento || undefined}
                                onSelect={(date) => setNovaReceita({ ...novaReceita, dataRecebimento: date })}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div>
                          <Label htmlFor="metodoPagamento" className="mb-2 block">
                            Método de Pagamento
                          </Label>
                          <Select
                            value={novaReceita.metodoPagamento}
                            onValueChange={(value) => setNovaReceita({ ...novaReceita, metodoPagamento: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o método" />
                            </SelectTrigger>
                            <SelectContent>
                              {metodosPagamento.map((metodo) => (
                                <SelectItem key={metodo} value={metodo}>
                                  {metodo}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="observacoes" className="mb-2 block">
                        Observações
                      </Label>
                      <Input
                        id="observacoes"
                        value={novaReceita.observacoes || ""}
                        onChange={(e) => setNovaReceita({ ...novaReceita, observacoes: e.target.value })}
                        placeholder="Observações adicionais"
                      />
                    </div>

                    <div>
                      <Label htmlFor="comprovante" className="mb-2 block">
                        Comprovante (Referência)
                      </Label>
                      <Input
                        id="comprovante"
                        value={novaReceita.comprovante || ""}
                        onChange={(e) => setNovaReceita({ ...novaReceita, comprovante: e.target.value })}
                        placeholder="Número de referência ou comprovante"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddReceita} className="bg-green-600 hover:bg-green-700">
                      Adicionar Receita
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Cards de resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total de Receitas</CardTitle>
                <CardDescription>
                  {format(startOfMonth(mesSelecionado), "dd/MM/yyyy", { locale: pt })} -
                  {format(endOfMonth(mesSelecionado), "dd/MM/yyyy", { locale: pt })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {totalReceitas.toLocaleString("pt-MZ", { style: "currency", currency: "MZN" })}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{receitasFiltradas.length} receitas no período</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total Recebido</CardTitle>
                <CardDescription>{((totalRecebido / totalReceitas) * 100 || 0).toFixed(1)}% do total</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {totalRecebido.toLocaleString("pt-MZ", { style: "currency", currency: "MZN" })}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                  <div
                    className="bg-green-600 h-2.5 rounded-full"
                    style={{ width: `${(totalRecebido / totalReceitas) * 100 || 0}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total Pendente</CardTitle>
                <CardDescription>{((totalPendente / totalReceitas) * 100 || 0).toFixed(1)}% do total</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600">
                  {totalPendente.toLocaleString("pt-MZ", { style: "currency", currency: "MZN" })}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                  <div
                    className="bg-amber-600 h-2.5 rounded-full"
                    style={{ width: `${(totalPendente / totalReceitas) * 100 || 0}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs e tabela */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="todas">Todas</TabsTrigger>
              <TabsTrigger value="recebidas">Recebidas</TabsTrigger>
              <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
              <TabsTrigger value="atrasadas">Atrasadas</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-semibold">Descrição</TableHead>
                  <TableHead className="font-semibold">Categoria</TableHead>
                  <TableHead className="font-semibold">Fonte</TableHead>
                  <TableHead className="font-semibold">Data Prevista</TableHead>
                  <TableHead className="font-semibold text-right">Valor</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receitasFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                      Nenhuma receita encontrada para o período selecionado.
                    </TableCell>
                  </TableRow>
                ) : (
                  receitasFiltradas.map((receita, index) => (
                    <TableRow key={receita.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <TableCell className="font-medium">{receita.descricao}</TableCell>
                      <TableCell>{receita.categoria}</TableCell>
                      <TableCell>{receita.fonte}</TableCell>
                      <TableCell>{format(new Date(receita.data), "dd/MM/yyyy", { locale: pt })}</TableCell>
                      <TableCell className="text-right">
                        {receita.valor.toLocaleString("pt-MZ", { style: "currency", currency: "MZN" })}
                      </TableCell>
                      <TableCell>
                        {receita.status === "recebido" ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Recebido
                          </Badge>
                        ) : receita.status === "pendente" ? (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            Pendente
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            Atrasado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setReceitaSelecionada(receita)
                              setIsViewDialogOpen(true)
                            }}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>

                          {podeEditar && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setReceitaSelecionada(receita)
                                  setIsEditDialogOpen(true)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>

                              {receita.status !== "recebido" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                  onClick={() => handleMarcarComoRecebida(receita.id)}
                                >
                                  <span className="sr-only">Marcar como recebido</span>✓
                                </Button>
                              )}

                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                                onClick={() => handleDeleteReceita(receita.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Diálogo de visualização */}
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Detalhes da Receita</DialogTitle>
                <DialogDescription>Informações detalhadas sobre a receita selecionada.</DialogDescription>
              </DialogHeader>
              {receitaSelecionada && (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium text-sm">Descrição:</h3>
                      <p>{receitaSelecionada.descricao}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">Valor:</h3>
                      <p className="font-semibold">
                        {receitaSelecionada.valor.toLocaleString("pt-MZ", { style: "currency", currency: "MZN" })}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium text-sm">Categoria:</h3>
                      <p>{receitaSelecionada.categoria}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">Fonte:</h3>
                      <p>{receitaSelecionada.fonte}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium text-sm">Data Prevista:</h3>
                      <p>{format(new Date(receitaSelecionada.data), "dd/MM/yyyy", { locale: pt })}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">Status:</h3>
                      <p>
                        {receitaSelecionada.status === "recebido" ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Recebido
                          </Badge>
                        ) : receitaSelecionada.status === "pendente" ? (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            Pendente
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            Atrasado
                          </Badge>
                        )}
                      </p>
                    </div>
                  </div>

                  {receitaSelecionada.status === "recebido" && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h3 className="font-medium text-sm">Data de Recebimento:</h3>
                          <p>
                            {receitaSelecionada.dataRecebimento
                              ? format(new Date(receitaSelecionada.dataRecebimento), "dd/MM/yyyy", { locale: pt })
                              : "N/A"}
                          </p>
                        </div>
                        <div>
                          <h3 className="font-medium text-sm">Método de Pagamento:</h3>
                          <p>{receitaSelecionada.metodoPagamento || "N/A"}</p>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-medium text-sm">Comprovante:</h3>
                        <p>{receitaSelecionada.comprovante || "N/A"}</p>
                      </div>
                    </>
                  )}

                  <div>
                    <h3 className="font-medium text-sm">Observações:</h3>
                    <p>{receitaSelecionada.observacoes || "Nenhuma observação"}</p>
                  </div>

                  {receitaSelecionada.historico && receitaSelecionada.historico.length > 0 && (
                    <div>
                      <h3 className="font-medium text-sm mb-2">Histórico:</h3>
                      <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                        {receitaSelecionada.historico.map((item, index) => (
                          <div key={index} className="text-xs mb-1 pb-1 border-b last:border-0">
                            <span className="font-medium">
                              {format(new Date(item.data), "dd/MM/yyyy HH:mm", { locale: pt })}
                            </span>
                            <span>
                              {" "}
                              - {item.usuario} - {item.acao}: {item.detalhes}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button onClick={() => setIsViewDialogOpen(false)}>Fechar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Diálogo de edição */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Editar Receita</DialogTitle>
                <DialogDescription>Atualize os detalhes da receita selecionada.</DialogDescription>
              </DialogHeader>
              {receitaSelecionada && (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-descricao" className="mb-2 block">
                        Descrição <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="edit-descricao"
                        value={receitaSelecionada.descricao}
                        onChange={(e) =>
                          setReceitaSelecionada({
                            ...receitaSelecionada,
                            descricao: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-valor" className="mb-2 block">
                        Valor (MT) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="edit-valor"
                        type="number"
                        step="0.01"
                        value={receitaSelecionada.valor}
                        onChange={(e) =>
                          setReceitaSelecionada({
                            ...receitaSelecionada,
                            valor: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-categoria" className="mb-2 block">
                        Categoria <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={receitaSelecionada.categoria}
                        onValueChange={(value) =>
                          setReceitaSelecionada({
                            ...receitaSelecionada,
                            categoria: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categorias.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-fonte" className="mb-2 block">
                        Fonte <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={receitaSelecionada.fonte}
                        onValueChange={(value) =>
                          setReceitaSelecionada({
                            ...receitaSelecionada,
                            fonte: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fontes.map((fonte) => (
                            <SelectItem key={fonte} value={fonte}>
                              {fonte}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-data" className="mb-2 block">
                        Data Prevista <span className="text-red-500">*</span>
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            {format(new Date(receitaSelecionada.data), "dd/MM/yyyy", { locale: pt })}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={new Date(receitaSelecionada.data)}
                            onSelect={(date) =>
                              setReceitaSelecionada({
                                ...receitaSelecionada,
                                data: date || new Date(),
                              })
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label htmlFor="edit-status" className="mb-2 block">
                        Status <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={receitaSelecionada.status}
                        onValueChange={(value: "recebido" | "pendente" | "atrasado") =>
                          setReceitaSelecionada({
                            ...receitaSelecionada,
                            status: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="recebido">Recebido</SelectItem>
                          <SelectItem value="atrasado">Atrasado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {receitaSelecionada.status === "recebido" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-dataRecebimento" className="mb-2 block">
                          Data de Recebimento
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                              {receitaSelecionada.dataRecebimento ? (
                                format(new Date(receitaSelecionada.dataRecebimento), "dd/MM/yyyy", { locale: pt })
                              ) : (
                                <span>Selecionar data</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={
                                receitaSelecionada.dataRecebimento
                                  ? new Date(receitaSelecionada.dataRecebimento)
                                  : undefined
                              }
                              onSelect={(date) =>
                                setReceitaSelecionada({
                                  ...receitaSelecionada,
                                  dataRecebimento: date,
                                })
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label htmlFor="edit-metodoPagamento" className="mb-2 block">
                          Método de Pagamento
                        </Label>
                        <Select
                          value={receitaSelecionada.metodoPagamento}
                          onValueChange={(value) =>
                            setReceitaSelecionada({
                              ...receitaSelecionada,
                              metodoPagamento: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o método" />
                          </SelectTrigger>
                          <SelectContent>
                            {metodosPagamento.map((metodo) => (
                              <SelectItem key={metodo} value={metodo}>
                                {metodo}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="edit-observacoes" className="mb-2 block">
                      Observações
                    </Label>
                    <Input
                      id="edit-observacoes"
                      value={receitaSelecionada.observacoes || ""}
                      onChange={(e) =>
                        setReceitaSelecionada({
                          ...receitaSelecionada,
                          observacoes: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-comprovante" className="mb-2 block">
                      Comprovante (Referência)
                    </Label>
                    <Input
                      id="edit-comprovante"
                      value={receitaSelecionada.comprovante || ""}
                      onChange={(e) =>
                        setReceitaSelecionada({
                          ...receitaSelecionada,
                          comprovante: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleEditReceita} className="bg-green-600 hover:bg-green-700">
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </PrintLayout>
  )
}

