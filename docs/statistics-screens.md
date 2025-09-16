# Telas de Estatísticas

## Visão Geral

Foram criadas duas telas de estatísticas especializadas para atender às necessidades específicas de cada tipo de usuário:

1. **Estatísticas para Entregadores** (`app/telas_extras/courier-stats.tsx`)
2. **Estatísticas para Empresas** (`app/telas_extras/company-stats.tsx`)

## Estatísticas para Entregadores

### Métricas de Desempenho
- **Total de Entregas**: Número total de entregas realizadas
- **Taxa de Pontualidade**: Percentual de entregas feitas no prazo
- **Tempo Médio de Entrega**: Tempo médio para conclusão das entregas
- **Taxa de Sucesso**: Percentual de entregas concluídas com sucesso

### Informações Financeiras
- **Ganhos Totais**: Valor total recebido pelas entregas
- **Pagamentos Pendentes**: Valor de pagamentos ainda não processados
- **Ganhos Médios por Entrega**: Valor médio recebido por entrega
- **Tendência de Ganhos Semanais**: Gráfico mostrando os ganhos das últimas semanas

### Dados Operacionais
- **Horas Online**: Tempo total conectado à plataforma
- **Distância Percorrida**: Quilometragem total percorrida
- **Horários de Pico**: Períodos com maior número de entregas
- **Áreas Populares**: Regiões com maior demanda de entregas

### Métricas de Qualidade
- **Avaliação Média**: Nota média dos clientes
- **Total de Avaliações**: Número de avaliações recebidas
- **Feedback dos Clientes**: Comentários e observações
- **Taxa de Sucesso**: Percentual de entregas concluídas com sucesso

### Atividade Recente
- Lista das entregas mais recentes com status e avaliações

## Estatísticas para Empresas

### Métricas de Envio
- **Total de Envios**: Número total de envios criados
- **Envios Concluídos**: Quantidade de envios entregues com sucesso
- **Envios Pendentes**: Envios aguardando coleta ou entrega
- **Taxa de Pontualidade**: Percentual de entregas feitas no prazo

### Informações Financeiras
- **Gastos Totais**: Valor total investido em envios
- **Custo Médio por Envio**: Valor médio pago por envio
- **Evolução de Gastos Mensais**: Gráfico mostrando os gastos dos últimos meses
- **Gastos por Categoria**: Distribuição de gastos por tipo de produto

### Dados Operacionais
- **Horários de Pico**: Períodos com maior volume de envios
- **Áreas Populares**: Regiões com maior frequência de envios
- **Tipos de Pacotes**: Distribuição por tamanho/categoria de pacotes
- **Frequência de Uso**: Regularidade no uso do serviço

### Métricas de Qualidade
- **Avaliação Média dos Entregadores**: Nota média dos entregadores contratados
- **Taxa de Reclamações**: Percentual de problemas relatados
- **Satisfação do Cliente**: Índice de satisfação com o serviço
- **Entregas no Prazo**: Percentual de entregas concluídas dentro do prazo

### Atividade Recente
- Lista dos envios mais recentes com status e informações

## Benefícios

### Para Entregadores
- **Autoavaliação**: Permite acompanhar o próprio desempenho
- **Identificação de Padrões**: Mostra horários e áreas mais lucrativas
- **Melhoria Contínua**: Facilita identificar áreas para melhoria
- **Planejamento Financeiro**: Ajuda no planejamento de ganhos

### Para Empresas
- **Controle de Custos**: Acompanhamento detalhado dos gastos
- **Tomada de Decisão**: Base para decisões estratégicas
- **Otimização de Processos**: Identificação de padrões e oportunidades
- **Relacionamento com Clientes**: Monitoramento da satisfação

## Implementação Técnica

### Componentes Reutilizáveis
- **StatCard**: Componente para exibição de métricas individuais
- **ProgressBar**: Barra de progresso para visualização de metas
- **Chart Components**: Componentes para gráficos de barras e tendências

### Design
- **Interface Responsiva**: Adapta-se a diferentes tamanhos de tela
- **Tema Escuro/Claro**: Suporte completo aos temas do aplicativo
- **Visualização Clara**: Dados apresentados de forma intuitiva
- **Performance Otimizada**: Carregamento assíncrono de dados

### Dados
- **Mock Data**: Dados simulados para demonstração
- **Estrutura Tipada**: Interfaces TypeScript bem definidas
- **Facilidade de Integração**: Pronta para conexão com APIs reais

## Próximos Passos

1. **Integração com Backend**: Conectar com APIs reais para dados em tempo real
2. **Exportação de Relatórios**: Permitir exportar estatísticas em formatos PDF/Excel
3. **Comparação de Períodos**: Comparar estatísticas entre diferentes períodos
4. **Metas e Recompensas**: Sistema de metas baseado nas estatísticas
5. **Notificações Inteligentes**: Alertas baseados em mudanças significativas nas métricas