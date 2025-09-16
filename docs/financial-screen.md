# Tela Financeira - Funcionalidades

## Visão Geral
A tela financeira foi criada para atender às necessidades específicas de ambos os tipos de usuários:
- **Entregadores**: Acompanhamento de ganhos, saques e desempenho financeiro
- **Empresas**: Controle de gastos, categorização de despesas e orçamento

## Funcionalidades por Tipo de Usuário

### Para Entregadores
- **Saldo Disponível**: Valor atual disponível para saque
- **Total Ganho**: Somatório de todos os ganhos com entregas
- **Histórico de Saques**: Controle de saques realizados via PIX
- **Média por Entrega**: Valor médio recebido por entrega concluída
- **Pagamentos Pendentes**: Entregas concluídas mas ainda não pagas
- **Solicitação de Saque**: Interface para solicitar saques via PIX

### Para Empresas
- **Total Gasto**: Somatório de todos os gastos com envios
- **Despesas Pendentes**: Envios concluídos mas ainda não pagos
- **Média por Envio**: Custo médio por envio realizado
- **Controle Orçamentário**: Acompanhamento do uso do orçamento mensal
- **Categorização de Gastos**: Divisão de gastos por tipo (documentos, produtos, etc.)

## Funcionalidades Comuns

### Extrato de Transações
- **Lista Detalhada**: Todas as transações com descrição, valor e data
- **Filtros Avançados**: Por período, categoria, status e busca textual
- **Status de Transações**: Indicação visual do status (concluído, pendente, processando)
- **Referências**: IDs de entregas/envios relacionados

### Visualização de Dados
- **Cards Resumo**: Métricas-chave em destaque no topo da tela
- **Indicadores Visuais**: Cores e ícones para facilitar a identificação
- **Tendências**: Comparação com períodos anteriores

### Filtros e Busca
- **Período**: Hoje, semana, mês, ano ou tudo
- **Categoria**: Tipo de transação (entrega, saque, documentos, etc.)
- **Status**: Concluído, pendente, processando ou falhou
- **Busca Textual**: Pesquisa por descrição ou ID

### Exportação de Dados
- **Relatórios**: Exportação de extratos em formatos PDF ou Excel
- **Histórico Completo**: Dados detalhados para análise externa

## Interface e Design

### Componentes Principais
- **Cards de Resumo**: Informações-chave em destaque
- **Filtros Horizontais**: Navegação fácil entre diferentes filtros
- **Lista de Transações**: Visualização detalhada com informações hierárquicas
- **Modal de Saque**: Interface dedicada para solicitação de saques (entregadores)

### Tipos de Transações
1. **Income** (Ganhos): Recebimentos por entregas
2. **Expense** (Gastos): Pagamentos por envios
3. **Payout** (Saques): Retiradas de saldo
4. **Deposit** (Depósitos): Entradas de saldo (futuras implementações)

### Estados de Transações
- **Completed** (Concluído): Transação finalizada com sucesso
- **Pending** (Pendente): Aguardando confirmação
- **Processing** (Processando): Em andamento
- **Failed** (Falhou): Erro no processamento

## Benefícios

### Para Entregadores
- **Controle Financeiro**: Acompanhamento claro de ganhos e saques
- **Planejamento**: Base para planejar atividades e expectativas de renda
- **Transparência**: Visibilidade total de todas as transações
- **Agilidade**: Processo simplificado para solicitação de saques

### Para Empresas
- **Gestão de Custos**: Controle detalhado de gastos com envios
- **Orçamento**: Limites e acompanhamento de uso do orçamento
- **Análise**: Identificação de padrões de gastos e oportunidades
- **Decisão Informada**: Base sólida para decisões estratégicas

## Próximas Implementações

1. **Integração com APIs Reais**: Conexão com sistemas de pagamento e banco de dados
2. **Notificações**: Alertas para transações importantes
3. **Gráficos Avançados**: Visualizações mais detalhadas de tendências
4. **Recorrência**: Pagamentos automáticos para empresas
5. **Fidelidade**: Programas de recompensas baseados no histórico financeiro