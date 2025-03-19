"use client"

import { format } from "date-fns"
import { pt } from "date-fns/locale"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { useAppContext } from "@/contexts/AppContext"
import { useState, useEffect } from "react"

interface LembreteDocumentosProps {
  pagamento: {
    id: string
    referencia: string
    fornecedorId: string
    fornecedorNome: string
    valor: number
    dataPagamento: Date | null
    facturaRecebida?: boolean
    reciboRecebido?: boolean
    vdRecebido?: boolean
    estado: string
    documentoRequerido?: "factura" | "vd" | "nenhum"
  }
  isOpen: boolean
  onClose: () => void
}

export function LembreteDocumentos({ pagamento, isOpen, onClose }: LembreteDocumentosProps) {
  const { atualizarPagamento } = useAppContext()

  // Verificar se o pagamento está pago
  useEffect(() => {
    if (pagamento.estado !== "pago" && isOpen) {
      toast({
        title: "Aviso",
        description: "Documentos fiscais só são necessários para pagamentos já realizados.",
      })
      onClose()
    }
  }, [pagamento, isOpen, onClose])

  const [facturaRecebida, setFacturaRecebida] = useState(pagamento.facturaRecebida || false)
  const [reciboRecebido, setReciboRecebido] = useState(pagamento.reciboRecebido || false)
  const [vdRecebido, setVdRecebido] = useState(pagamento.vdRecebido || false)

  // Determinar o tipo de documento requerido
  const documentoRequerido = pagamento.documentoRequerido || "factura"

  const handleSalvar = () => {
    atualizarPagamento(pagamento.fornecedorId, {
      ...pagamento,
      facturaRecebida,
      reciboRecebido,
      vdRecebido,
      lembreteEnviado: true,
    })

    toast({
      title: "Documentos atualizados",
      description: "O status dos documentos foi atualizado com sucesso.",
    })

    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Documentos Fiscais</DialogTitle>
          <DialogDescription>
            Lembrete para solicitar documentos fiscais do pagamento {pagamento.referencia} para{" "}
            {pagamento.fornecedorNome}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-medium">Referência:</p>
              <p>{pagamento.referencia}</p>
            </div>
            <div>
              <p className="font-medium">Fornecedor:</p>
              <p>{pagamento.fornecedorNome}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-medium">Valor:</p>
              <p>{pagamento.valor.toLocaleString("pt-MZ", { style: "currency", currency: "MZN" })}</p>
            </div>
            <div>
              <p className="font-medium">Data de Pagamento:</p>
              <p>
                {pagamento.dataPagamento
                  ? format(new Date(pagamento.dataPagamento), "dd/MM/yyyy", { locale: pt })
                  : "N/A"}
              </p>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="font-medium mb-2">Status dos Documentos</h3>

            <div className="space-y-3">
              {documentoRequerido === "factura" && (
                <>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="factura"
                      checked={facturaRecebida}
                      onCheckedChange={(checked) => setFacturaRecebida(checked as boolean)}
                    />
                    <Label htmlFor="factura" className="cursor-pointer">
                      Factura recebida
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="recibo"
                      checked={reciboRecebido}
                      onCheckedChange={(checked) => setReciboRecebido(checked as boolean)}
                    />
                    <Label htmlFor="recibo" className="cursor-pointer">
                      Recibo recebido
                    </Label>
                  </div>
                </>
              )}

              {documentoRequerido === "vd" && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="vd"
                    checked={vdRecebido}
                    onCheckedChange={(checked) => setVdRecebido(checked as boolean)}
                  />
                  <Label htmlFor="vd" className="cursor-pointer">
                    VD (Voucher de Despesa) recebido
                  </Label>
                </div>
              )}

              {documentoRequerido === "nenhum" && (
                <div className="bg-gray-50 p-3 rounded-md border border-gray-200 text-gray-600 text-sm">
                  Este pagamento não requer documentos fiscais.
                </div>
              )}
            </div>
          </div>

          <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 text-yellow-800 text-sm">
            <p className="font-medium">Lembrete:</p>
            {documentoRequerido === "factura" && (
              <p>
                Não se esqueça de solicitar a factura e o recibo do fornecedor para este pagamento. Estes documentos são
                necessários para fins contábeis e fiscais.
              </p>
            )}
            {documentoRequerido === "vd" && (
              <p>
                Este pagamento requer um VD (Voucher de Despesa). Certifique-se de que o VD esteja devidamente
                preenchido e assinado.
              </p>
            )}
            {documentoRequerido === "nenhum" && <p>Este pagamento não requer documentação fiscal específica.</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar}>Salvar Status</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

