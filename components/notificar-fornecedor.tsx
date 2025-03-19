"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { pt } from "date-fns/locale"

interface NotificarFornecedorProps {
  fornecedorNome: string
  referenciaPagamento: string
  dataVencimento: Date
  valor: number
  isOpen: boolean
  onClose: () => void
}

export function NotificarFornecedor({
  fornecedorNome,
  referenciaPagamento,
  dataVencimento,
  valor,
  isOpen,
  onClose,
}: NotificarFornecedorProps) {
  const [email, setEmail] = useState("")
  const [mensagem, setMensagem] = useState("")
  const [enviando, setEnviando] = useState(false)

  // Gerar mensagem padrão quando o componente é montado ou quando os props mudam
  useState(() => {
    const mensagemPadrao = `Prezado ${fornecedorNome},

Gostaríamos de lembrá-lo sobre o pagamento próximo:

Referência: ${referenciaPagamento}
Data de Vencimento: ${format(dataVencimento, "dd/MM/yyyy", { locale: pt })}
Valor: ${valor.toFixed(2)} MT

Por favor, certifique-se de que o pagamento seja efetuado até a data de vencimento.

Atenciosamente,
Departamento Financeiro`

    setMensagem(mensagemPadrao)
  })

  const handleEnviarNotificacao = async () => {
    if (!email) {
      toast({
        title: "Erro",
        description: "Por favor, informe o email do fornecedor.",
        variant: "destructive",
      })
      return
    }

    setEnviando(true)

    try {
      // Simular o envio de email com um atraso
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Registrar a notificação no histórico
      const notificacoesEnviadas = JSON.parse(localStorage.getItem("notificacoesFornecedores") || "[]")
      notificacoesEnviadas.push({
        id: Date.now().toString(),
        fornecedorNome,
        email,
        referenciaPagamento,
        dataEnvio: new Date(),
        mensagem,
      })
      localStorage.setItem("notificacoesFornecedores", JSON.stringify(notificacoesEnviadas))

      // Simula o envio bem-sucedido
      toast({
        title: "Notificação enviada",
        description: `Uma notificação foi enviada para ${fornecedorNome} no email ${email}.`,
      })

      // Fechar o diálogo
      onClose()
    } catch (error) {
      console.error("Erro ao enviar notificação:", error)
      toast({
        title: "Erro ao enviar notificação",
        description: "Ocorreu um erro ao tentar enviar a notificação. Por favor, tente novamente.",
        variant: "destructive",
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Notificar Fornecedor</DialogTitle>
          <DialogDescription>Envie uma notificação ao fornecedor sobre o pagamento próximo.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="col-span-3"
              placeholder="email@fornecedor.com"
              type="email"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="mensagem" className="text-right mt-2">
              Mensagem
            </Label>
            <Textarea
              id="mensagem"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className="col-span-3"
              rows={10}
            />
          </div>
          <div className="col-span-4 text-sm text-gray-500 mt-2">
            <p>
              Esta notificação será enviada por email para o fornecedor. Certifique-se de que o endereço de email está
              correto.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" onClick={handleEnviarNotificacao} disabled={enviando}>
            {enviando ? "Enviando..." : "Enviar Notificação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

