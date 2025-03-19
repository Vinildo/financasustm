"use client"

import { useState } from "react"
import { format } from "date-fns"
import { pt } from "date-fns/locale"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SolicitarAprovacao } from "@/components/solicitar-aprovacao"

interface DetalhesPagamentoProps {
  pagamento: any
  isOpen: boolean
  onClose: () => void
}

export function DetalhesPagamento({ pagamento, isOpen, onClose }: DetalhesPagamentoProps) {
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)

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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Detalhes do Pagamento</DialogTitle>
            <DialogDescription>Informações detalhadas sobre o pagamento selecionado.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Referência:</p>
                <p className="font-semibold">{pagamento.referencia}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Fornecedor:</p>
                <p>{pagamento.fornecedorNome}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Valor:</p>
                <p>{pagamento.valor.toFixed(2)} MZN</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Estado:</p>
                <p>{getEstadoBadge(pagamento.estado)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Data de Vencimento:</p>
                <p>{format(new Date(pagamento.dataVencimento), "dd/MM/yyyy", { locale: pt })}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Data de Pagamento:</p>
                <p>
                  {pagamento.dataPagamento
                    ? format(new Date(pagamento.dataPagamento), "dd/MM/yyyy", { locale: pt })
                    : "Não pago"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Método:</p>
                <p>{pagamento.metodo}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Departamento:</p>
                <p>{pagamento.departamento}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Descrição:</p>
              <p>{pagamento.descricao || "Sem descrição"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Observações:</p>
              <p>{pagamento.observacoes || "Sem observações"}</p>
            </div>

            {/* Adicionar botão para solicitar aprovação se o pagamento estiver pendente */}
            {pagamento.estado === "pendente" && (
              <div className="flex justify-end mt-4">
                <Button onClick={() => setIsApprovalDialogOpen(true)}>Solicitar Aprovação</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Componente de Solicitação de Aprovação */}
      {isApprovalDialogOpen && (
        <SolicitarAprovacao
          pagamentoId={pagamento.id}
          fornecedorId={pagamento.fornecedorId}
          fornecedorNome={pagamento.fornecedorNome}
          referencia={pagamento.referencia}
          valor={pagamento.valor}
          metodo={pagamento.metodo}
          descricao={pagamento.descricao || ""}
          dataVencimento={new Date(pagamento.dataVencimento)}
          isOpen={isApprovalDialogOpen}
          onClose={() => setIsApprovalDialogOpen(false)}
        />
      )}
    </>
  )
}

