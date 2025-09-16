# Sistema de Administração

## Visão Geral

O sistema de administração permite que desenvolvedores e administradores testem diferentes funcionalidades do aplicativo, alternem entre papéis (empresa/entregador) e gerenciem usuários para fins de teste.

## Funcionalidades

### 1. Alternância de Papéis
- Permite alternar entre os papéis de "Empresa" e "Entregador"
- Útil para testar diferentes interfaces e funcionalidades
- A alteração é feita localmente para fins de teste

### 2. Painel Administrativo Completo
- Gerenciamento de usuários
- Visualização de estatísticas do sistema
- Acesso a funcionalidades de teste avançadas

### 3. Modo de Teste
- Ativa funcionalidades especiais para testes
- Permite simular diferentes cenários de uso

## Como Usar

### Acessando o Sistema de Admin

1. **Como Administrador:**
   - Faça login com um email que contenha "admin" (ex: admin@test.com)
   - O sistema reconhecerá automaticamente como administrador

2. **Através do Perfil:**
   - Acesse a tela de perfil
   - Se for administrador, verá uma seção "Administração"
   - Clique em "Modo Teste" para acessar o painel administrativo

3. **Através da Tela de Teste de Autenticação:**
   - Acesse a aba "Teste Auth"
   - Clique em "Painel Administrativo"

### Alternando Papéis

1. No painel administrativo:
   - Vá para a seção "Gerenciamento de Usuários"
   - Encontre o usuário desejado
   - Clique no botão de troca de papel
   - Confirme a alteração

2. No perfil (para administradores):
   - Acesse a seção "Administração" no perfil
   - Clique em "Alternar Papel"
   - Confirme a alteração

### Testando como Diferentes Papéis

1. No painel administrativo:
   - Use os botões "Testar como Empresa" ou "Testar como Entregador"
   - O sistema mostrará uma mensagem de confirmação
   - Reinicie o aplicativo para ver as mudanças

## Implementação Técnica

### Arquivos Adicionados

1. **`app/telas_extras/admin-panel.tsx`**
   - Tela principal do painel administrativo
   - Interface para gerenciamento de usuários e configurações

2. **Atualizações em `app/_layout.tsx`**
   - Adição da rota para o painel administrativo

3. **Atualizações em `app/telas_extras/profile.tsx`**
   - Adição da seção de administração para usuários administradores
   - Funções para alternar papéis

4. **Atualizações em `app/(tabs)/auth-test.tsx`**
   - Adição de link para o painel administrativo

### Verificação de Administrador

O sistema verifica se um usuário é administrador com base no email:
```javascript
const isAdmin = userData.email === 'admin@test.com' || userData.email.includes('admin');
```

### Funcionalidades de Teste

1. **Alternância de Papéis Local**
   - As mudanças de papel são feitas localmente para testes
   - Em uma implementação real, isso seria salvo no banco de dados

2. **Usuários de Teste Mockados**
   - A lista de usuários é mockada para fins de demonstração
   - Em uma implementação real, isso viria do banco de dados

## Próximos Passos

1. **Integração com Banco de Dados**
   - Conectar o painel administrativo com o Firestore
   - Permitir alterações reais de papéis dos usuários

2. **Mais Funcionalidades de Teste**
   - Adicionar mais cenários de teste
   - Criar ferramentas para simular diferentes estados do sistema

3. **Melhorias de Segurança**
   - Implementar verificação de token de administrador
   - Adicionar autenticação de dois fatores para administradores

4. **Analytics Avançado**
   - Adicionar gráficos e métricas detalhadas
   - Implementar relatórios de uso