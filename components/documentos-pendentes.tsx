"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { pt } from "date-fns/locale"
import { useAppContext } from "@/contexts/AppContext"
import { LembreteDocumentos } from "@/components/lembrete-documentos"
import { FileCheck, FileX, Receipt, AlertTriangle, FileText, FileSpreadsheet } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function DocumentosPendentes() {
  const { fornecedores } = useAppContext()
  const [pagamentoSelecionado, setPagamentoSelecionado] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState("todos")

  // Obter todos os pagamentos pagos que precisam de documentos
  // Apenas pagamentos com estado "pago" são considerados
  const pagamentosPendentesDocumentos = fornecedores.flatMap((fornecedor) =>
    fornecedor.pagamentos
      .filter((pagamento) => {
        if (pagamento.estado !== "pago") return false

        // Verificar o tipo de documento requerido
        const documentoRequerido = pagamento.documentoRequerido || "factura"

        if (documentoRequerido === "factura") {
          return pagamento.facturaRecebida !== true || pagamento.reciboRecebido !== true
        } else if (documentoRequerido === "vd") {
          return pagamento.vdRecebido !== true
        }

        return false // Se for "nenhum", não incluir na lista
      })
      .map((pagamento) => ({
        ...pagamento,
        fornecedorId: fornecedor.id,
        fornecedorNome: fornecedor.nome,
      })),
  )

  // Filtrar pagamentos por tipo de documento
  const pagamentosFactura = pagamentosPendentesDocumentos.filter(
    (pagamento) => (pagamento.documentoRequerido || "factura") === "factura",
  )

  const pagamentosVD = pagamentosPendentesDocumentos.filter((pagamento) => pagamento.documentoRequerido === "vd")

  // Determinar quais pagamentos mostrar com base na aba ativa
  const pagamentosParaMostrar =
    activeTab === "factura" ? pagamentosFactura : activeTab === "vd" ? pagamentosVD : pagamentosPendentesDocumentos

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentos Fiscais Pendentes</CardTitle>
        <CardDescription>Pagamentos que necessitam de documentação fiscal</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="todos" className="mb-4" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="todos">Todos ({pagamentosPendentesDocumentos.length})</TabsTrigger>
            <TabsTrigger value="factura">Facturas/Recibos ({pagamentosFactura.length})</TabsTrigger>
            <TabsTrigger value="vd">VDs ({pagamentosVD.length})</TabsTrigger>
          </TabsList>
        </Tabs>

        {pagamentosParaMostrar.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="font-semibold">Referência</TableHead>
                <TableHead className="font-semibold">Fornecedor</TableHead>
                <TableHead className="font-semibold">Valor</TableHead>
                <TableHead className="font-semibold">Data Pagamento</TableHead>
                <TableHead className="font-semibold">Tipo Documento</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagamentosParaMostrar.map((pagamento, index) => {
                const documentoRequerido = pagamento.documentoRequerido || "factura"
                let statusBadge

                if (documentoRequerido === "factura") {
                  const facturaStatus = pagamento.facturaRecebida ? "Recebida" : "Pendente"
                  const reciboStatus = pagamento.reciboRecebido ? "Recebida" : "Pendente"
                  statusBadge = (
                    <div className="space-y-1">
                      <Badge
                        variant="outline"
                        className={
                          pagamento.facturaRecebida
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }
                      >
                        <FileCheck className={`mr-1 h-4 w-4 ${pagamento.facturaRecebida ? "" : "hidden"}`} />
                        <FileX className={`mr-1 h-4 w-4 ${pagamento.facturaRecebida ? "hidden" : ""}`} />
                        Factura: {facturaStatus}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          pagamento.reciboRecebido
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }
                      >
                        <Receipt className={`mr-1 h-4 w-4 ${pagamento.reciboRecebido ? "" : "hidden"}`} />
                        <FileX className={`mr-1 h-4 w-4 ${pagamento.reciboRecebido ? "hidden" : ""}`} />
                        Recibo: {reciboStatus}
                      </Badge>
                    </div>
                  )
                } else if (documentoRequerido === "vd") {
                  statusBadge = (
                    <Badge
                      variant="outline"
                      className={
                        pagamento.vdRecebido
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }
                    >
                      <FileSpreadsheet className={`mr-1 h-4 w-4 ${pagamento.vdRecebido ? "" : "hidden"}`} />
                      <FileX className={`mr-1 h-4 w-4 ${pagamento.vdRecebido ? "hidden" : ""}`} />
                      VD: {pagamento.vdRecebido ? "Recebido" : "Pendente"}
                    </Badge>
                  )
                }

                return (
                  <TableRow key={pagamento.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <TableCell className="font-medium">{pagamento.referencia}</TableCell>
                    <TableCell>{pagamento.fornecedorNome}</TableCell>
                    <TableCell>
                      {pagamento.valor.toLocaleString("pt-MZ", { style: "currency", currency: "MZN" })}
                    </TableCell>
                    <TableCell>
                      {pagamento.dataPagamento
                        ? format(new Date(pagamento.dataPagamento), "dd/MM/yyyy", { locale: pt })
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          documentoRequerido === "factura"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-purple-50 text-purple-700 border-purple-200"
                        }
                      >
                        {documentoRequerido === "factura" ? (
                          <>
                            <FileText className="mr-1 h-4 w-4" />
                            Factura/Recibo
                          </>
                        ) : (
                          <>
                            <FileSpreadsheet className="mr-1 h-4 w-4" />
                            VD
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>{statusBadge}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setPagamentoSelecionado(pagamento)}>
                        <AlertTriangle className="mr-1 h-4 w-4" />
                        Atualizar
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FileCheck className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">Sem documentos pendentes</h3>
            <p className="mt-1 text-sm text-gray-500">
              {activeTab === "todos"
                ? "Todos os pagamentos têm os documentos fiscais necessários."
                : activeTab === "factura"
                  ? "Todos os pagamentos têm as facturas e recibos necessários."
                  : "Todos os pagamentos têm os VDs necessários."}
            </p>
          </div>
        )}

        {pagamentoSelecionado && (
          <LembreteDocumentos
            pagamento={pagamentoSelecionado}
            isOpen={!!pagamentoSelecionado}
            onClose={() => setPagamentoSelecionado(null)}
          />
        )}
      </CardContent>
    </Card>
  )
}

