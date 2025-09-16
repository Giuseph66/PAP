# Fluxo de Autenticação do PAP

## Visão Geral

O sistema de autenticação do PAP suporta dois tipos de usuários:
1. **Empresas** - Usuários que criam envios
2. **Entregadores** - Usuários que realizam entregas

## Fluxos de Registro

### Registro de Empresa (3 etapas)
1. **Informações da Empresa**
   - Nome da empresa
   - CNPJ
   - Nome do responsável

2. **Informações de Contato**
   - Email
   - Telefone

3. **Credenciais**
   - Senha
   - Confirmação de senha

### Registro de Entregador (4 etapas)
1. **Informações Pessoais**
   - Nome completo
   - CPF

2. **Informações de Contato**
   - Email
   - Telefone

3. **Credenciais**
   - Senha
   - Confirmação de senha

4. **Informações Profissionais**
   - Tipo de veículo (moto, carro, bicicleta)
   - Capacidade do veículo (kg)

## Funcionalidades

### Validação de Formulários
- Validação em tempo real de campos obrigatórios
- Formatação automática de CNPJ e CPF
- Formatação automática de telefones
- Validação de força de senha
- Confirmação de senhas

### Indicador de Progresso
- Visualização clara das etapas do registro
- Indicador de etapa atual
- Indicador de etapas concluídas

### Experiência do Usuário
- Botão de voltar em todas as etapas
- Visualização/ocultação de senhas
- Feedback claro de erros
- Design responsivo e acessível

## Componentes Técnicos

### Serviços
- `enhanced-auth.service.ts` - Serviço de autenticação aprimorado
- `auth.service.ts` - Serviço de autenticação original (mantido para compatibilidade)

### Telas
- `app/auth/register/index.tsx` - Seleção de tipo de registro
- `app/auth/register/company.tsx` - Registro de empresas
- `app/auth/register/courier.tsx` - Registro de entregadores
- `app/auth/login.tsx` - Login padrão
- `app/(tabs)/auth-test.tsx` - Tela de teste de autenticação

### Tipos
- `types/index.ts` - Definições de tipos atualizadas para suportar campos específicos de empresas e entregadores

## Integração com Firebase

O sistema utiliza:
- Firestore para armazenamento de dados de usuários
- Coleção `authUsers` para informações de autenticação
- Campos personalizados para dados específicos de empresas e entregadores