"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { pt } from "date-fns/locale"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Mail, Search, Eye } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface NotificacaoFornecedor {
  id: string
  fornecedorNome: string
  email: string
  referenciaPagamento: string
  dataEnvio: Date
  mensagem: string
}

export function HistoricoNotificacoes() {
  const [notificacoes, setNotificacoes] = useState<NotificacaoFornecedor[]>([])
  const [notificacaoSelecionada, setNotificacaoSelecionada] = useState<NotificacaoFornecedor | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    // Carregar notificações do localStorage
    const storedNotificacoes = localStorage.getItem("notificacoesFornecedores")
    if (storedNotificacoes) {
      try {
        const parsedNotificacoes = JSON.parse(storedNotificacoes, (key, value) => {
          if (key === "dataEnvio") {
            return new Date(value)
          }
          return value
        })
        setNotificacoes(parsedNotificacoes)
      } catch (error) {
        console.error("Erro ao carregar notificações:", error)
        setNotificacoes([])
      }
    }
  }, [])

  // Filtrar notificações com base no termo de pesquisa
  const filteredNotificacoes = notificacoes.filter((notificacao) => {
    return (
      notificacao.fornecedorNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notificacao.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notificacao.referenciaPagamento.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  return (
    <Card>
      <CardHeader className="bg-blue-700 text-white">
        <CardTitle>Histórico de Notificações a Fornecedores</CardTitle>
        <CardDescription className="text-blue-100">
          Visualize todas as notificações enviadas aos fornecedores
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Pesquisar por fornecedor, email ou referência..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {filteredNotificacoes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Nenhuma notificação encontrada.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead>Data de Envio</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotificacoes
                  .sort((a, b) => b.dataEnvio.getTime() - a.dataEnvio.getTime())
                  .map((notificacao) => (
                    <TableRow key={notificacao.id}>
                      <TableCell className="font-medium">{notificacao.fornecedorNome}</TableCell>
                      <TableCell>{notificacao.email}</TableCell>
                      <TableCell>{notificacao.referenciaPagamento}</TableCell>
                      <TableCell>{format(notificacao.dataEnvio, "dd/MM/yyyy HH:mm", { locale: pt })}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setNotificacaoSelecionada(notificacao)
                              setIsDetailsOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Reenviar a notificação
                              toast({
                                title: "Notificação reenviada",
                                description: `A notificação foi reenviada para ${notificacao.fornecedorNome} no email ${notificacao.email}.`,
                              })
                            }}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Diálogo de Detalhes */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Detalhes da Notificação</DialogTitle>
              <DialogDescription>Informações detalhadas sobre a notificação enviada ao fornecedor.</DialogDescription>
            </DialogHeader>
            {notificacaoSelecionada && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-sm text-gray-500">Fornecedor</h3>
                    <p>{notificacaoSelecionada.fornecedorNome}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-500">Email</h3>
                    <p>{notificacaoSelecionada.email}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-500">Referência</h3>
                    <p>{notificacaoSelecionada.referenciaPagamento}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-500">Data de Envio</h3>
                    <p>{format(notificacaoSelecionada.dataEnvio, "dd/MM/yyyy HH:mm:ss", { locale: pt })}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-gray-500 mb-2">Mensagem Enviada</h3>
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-200 whitespace-pre-wrap">
                    {notificacaoSelecionada.mensagem}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

