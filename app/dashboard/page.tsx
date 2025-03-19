"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PageTransition } from "@/components/page-transition"
import { PagamentosTable } from "@/components/pagamentos-table"
import { RelatorioDivida } from "@/components/relatorio-divida"
import { GraficoDivida } from "@/components/grafico-divida"
import { RelatorioFornecedor } from "@/components/relatorio-fornecedor"
import { ControloCheques } from "@/components/controlo-cheques"
import { FundoManeio } from "@/components/fundo-maneio"
import { UserManagement } from "@/components/user-management"
import { ExtratoFornecedor } from "@/components/extrato-fornecedor"
import { AppProvider } from "@/contexts/AppContext"
// Adicionar as importações dos novos componentes
import { ReconciliacaoBancaria } from "@/components/reconciliacao-bancaria"
import { ReconciliacaoInterna } from "@/components/reconciliacao-interna"
import { PrevisaoOrcamento } from "@/components/previsao-orcamento"
import { DocumentosPendentes } from "@/components/documentos-pendentes"
// Adicionar a importação do componente CalendarioFiscal
import { CalendarioFiscal } from "@/components/calendario-fiscal"
// Adicionar a importação do componente WorkflowAprovacao
import { WorkflowAprovacao } from "@/components/workflow-aprovacao"
// Adicionar as importações dos novos componentes financeiros
import { GestaoReceitas } from "@/components/gestao-receitas"
import { DemonstracaoResultados } from "@/components/demonstracao-resultados"

function DashboardContent() {
  const { user, logout, isLoading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("pagamentos")

  useEffect(() => {
    if (!user && !isLoading) {
      router.push("/")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>
  }

  if (!user) {
    return null
  }

  const isAdmin = user.role === "admin"
  const isReitor = user.role === "reitor"
  const isDiretoraFinanceira = user.role === "directora_financeira"

  const navButtonClass = (tabName: string) =>
    `text-white ${activeTab === tabName ? "bg-red-800" : "bg-red-700"} hover:bg-red-600 transition-colors`

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-100 flex flex-col">
        {/* Modificar a tag nav para adicionar a classe print:hidden */}
        <nav className="bg-red-700 text-white p-4 shadow-md print:hidden">
          <div className="max-w-full mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-center">
              <span className="text-2xl font-bold mb-4 sm:mb-0">Tesouraria By VM</span>
              <div className="flex flex-wrap justify-center sm:justify-end items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setActiveTab("pagamentos")}
                  className={navButtonClass("pagamentos")}
                >
                  Pagamentos
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setActiveTab("relatorio-divida")}
                  className={navButtonClass("relatorio-divida")}
                >
                  Relatório de Dívida
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setActiveTab("grafico-divida")}
                  className={navButtonClass("grafico-divida")}
                >
                  Gráfico de Dívida
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setActiveTab("relatorio-fornecedor")}
                  className={navButtonClass("relatorio-fornecedor")}
                >
                  Relatório por Fornecedor
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setActiveTab("extrato-fornecedor")}
                  className={navButtonClass("extrato-fornecedor")}
                >
                  Extrato de Fornecedor
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setActiveTab("controlo-cheques")}
                  className={navButtonClass("controlo-cheques")}
                >
                  Controlo de Cheques
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setActiveTab("fundo-maneio")}
                  className={navButtonClass("fundo-maneio")}
                >
                  Fundo de Maneio
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setActiveTab("reconciliacao-interna")}
                  className={navButtonClass("reconciliacao-interna")}
                >
                  Reconciliação Interna
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setActiveTab("reconciliacao-bancaria")}
                  className={navButtonClass("reconciliacao-bancaria")}
                >
                  Reconciliação Bancária
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setActiveTab("calendario-fiscal")}
                  className={navButtonClass("calendario-fiscal")}
                >
                  Calendário Fiscal
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setActiveTab("documentos-pendentes")}
                  className={navButtonClass("documentos-pendentes")}
                >
                  Documentos Pendentes
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setActiveTab("previsao-orcamento")}
                  className={navButtonClass("previsao-orcamento")}
                >
                  Previsão/Orçamento
                </Button>
                {/* Adicionar botão para o Workflow de Aprovação */}
                <Button
                  variant="ghost"
                  onClick={() => setActiveTab("workflow-aprovacao")}
                  className={navButtonClass("workflow-aprovacao")}
                >
                  Workflow de Aprovação
                </Button>
                {/* Adicionar botões para os novos componentes financeiros */}
                {(isAdmin || isReitor || isDiretoraFinanceira) && (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => setActiveTab("gestao-receitas")}
                      className={navButtonClass("gestao-receitas")}
                    >
                      Gestão de Receitas
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setActiveTab("demonstracao-resultados")}
                      className={navButtonClass("demonstracao-resultados")}
                    >
                      Demonstração de Resultados
                    </Button>
                  </>
                )}
                {isAdmin && (
                  <Button
                    variant="ghost"
                    onClick={() => setActiveTab("user-management")}
                    className={navButtonClass("user-management")}
                  >
                    Gestão de Usuários
                  </Button>
                )}
                <span className="text-white">Olá, {user.username}</span>
                <Button
                  variant="outline"
                  onClick={() => {
                    logout()
                    router.push("/")
                  }}
                  className="bg-red-700 text-white hover:bg-red-600 hover:text-white border-white"
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </nav>
        <main className="flex-grow max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {activeTab === "pagamentos" && <PagamentosTable />}
          {activeTab === "relatorio-divida" && <RelatorioDivida />}
          {activeTab === "grafico-divida" && <GraficoDivida />}
          {activeTab === "relatorio-fornecedor" && <RelatorioFornecedor />}
          {activeTab === "extrato-fornecedor" && <ExtratoFornecedor />}
          {activeTab === "controlo-cheques" && <ControloCheques />}
          {activeTab === "fundo-maneio" && <FundoManeio />}
          {activeTab === "reconciliacao-bancaria" && <ReconciliacaoBancaria />}
          {activeTab === "reconciliacao-interna" && <ReconciliacaoInterna />}
          {activeTab === "calendario-fiscal" && <CalendarioFiscal />}
          {activeTab === "documentos-pendentes" && <DocumentosPendentes />}
          {activeTab === "previsao-orcamento" && <PrevisaoOrcamento />}
          {activeTab === "workflow-aprovacao" && <WorkflowAprovacao />}
          {/* Adicionar os novos componentes financeiros */}
          {activeTab === "gestao-receitas" && <GestaoReceitas />}
          {activeTab === "demonstracao-resultados" && <DemonstracaoResultados />}
          {activeTab === "user-management" && isAdmin && <UserManagement />}
        </main>
      </div>
    </PageTransition>
  )
}

export default function Dashboard() {
  return (
    <AppProvider>
      <DashboardContent />
    </AppProvider>
  )
}

