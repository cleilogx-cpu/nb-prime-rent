# NB Prime Rent

Sistema profissional de gestão de locação de veículos para NB Prime Capital, construído com React, Vite e Tailwind CSS.

## Configuração

1. Copie o arquivo `.env.example` para `.env`.
2. Preencha as variáveis de ambiente do Supabase:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

3. Instale as dependências e inicie o projeto:

```bash
npm install
npm run dev
```

## Recursos da versão 0.1

- Autenticação com Supabase usando `signInWithPassword`.
- Tela de login com identidade visual preta e dourada.
- Proteção de rotas para acesso autenticado.
- Persistência de sessão ao atualizar a página.
- Dashboard inicial conectado às tabelas `vehicles`, `payments` e `expenses`.
- Layout responsivo com menu lateral para desktop e menu compacto para celular.
- Páginas de módulo provisórias para funcionalidades futuras.

## Estrutura principal

- `src/lib/supabaseClient.js` — conexão ao Supabase por variáveis de ambiente.
- `src/hooks/useAuth.js` — contexto de autenticação e gestão de sessão.
- `src/layouts/AppLayout.jsx` — layout com cabeçalho e navegação.
- `src/pages/Login.jsx` — tela de login e tratamento de erros.
- `src/pages/Dashboard.jsx` — painel com métricas e cards de veículos.
- `src/components/ProtectedRoute.jsx` — proteção de rotas autenticadas.
- `src/services/dashboardService.js` — consulta às tabelas do Supabase.

## Build

```bash
npm run build
```

## Observações

- Nenhuma chave do Supabase está escrita diretamente no código.
- A configuração atual do Tailwind foi preservada.
- O projeto usa placeholders elegantes para módulos ainda não implementados.
