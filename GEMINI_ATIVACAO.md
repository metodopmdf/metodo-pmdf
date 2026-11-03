# Integração Gemini — Método PMDF

## Estado da entrega

O código e a interface do Gemini foram integrados à branch `main` do repositório. A IA generativa passou a executar **no servidor do Supabase**, nunca no dispositivo do candidato. Os modelos WebLLM e seus pesos foram retirados da página e do repositório.

**A geração real ainda não está ativa** enquanto a função de servidor, a migração de limites e a chave privada do Gemini não forem configuradas pelo administrador. Esse comportamento é intencional: a aplicação apresenta o estado de configuração sem expor credenciais, e mantém o modo Tradicional/Seguro disponível.

O Google não oferece uma API pública ilimitada sem identificação, chave e cotas. A modalidade gratuita pode ser insuficiente para muitos candidatos simultâneos. Verifique os limites atuais no AI Studio antes de ativar faturamento.

## Procedimento de ativação — apenas administrador

**1. Criar uma chave da Gemini API**

Acesse https://aistudio.google.com/api-keys e crie a chave de um projeto habilitado para a API Gemini. **Não coloque essa chave em `index.html`, arquivos JavaScript, Issues, Pull Requests, comentários, mensagens de chat ou Secrets do GitHub destinados ao navegador.**

**2. Instalar o controle de cotas no Supabase**

No projeto Supabase existente `wskuhkvgipqwykbnuspk`, abra **SQL Editor**, crie uma consulta e execute integralmente o arquivo:

`supabase/migrations/202611030001_gemini_quota.sql`

A migração cria uma tabela interna, com acesso apenas ao papel de serviço, e uma função PostgreSQL que contabiliza cada solicitação de forma atômica. Sem essa função, o gateway **não realiza chamadas ao Google**.

**3. Configurar segredos do servidor (no Supabase)**

Em **Edge Functions → Secrets**, configure:

| Nome | Valor |
| --- | --- |
| `GEMINI_API_KEY` | A chave privada obtida no Google AI Studio |
| `GEMINI_ENABLED` | `true` |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` (padrão econômico) ou `gemini-3.6-flash` (melhor qualidade, sujeito a custo) |
| `GEMINI_USER_DAILY_LIMIT` | `20` (padrão: chamadas por usuário/dia) |
| `GEMINI_GLOBAL_DAILY_LIMIT` | `80` (padrão: chamadas totais do projeto/dia) |

O Supabase injeta suas próprias variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (ou `SUPABASE_SECRET_KEYS`). **Nunca copie a chave `service_role` para o site.**

**4. Implantar a Edge Function**

Opção A — GitHub Actions: adicione o segredo de repositório `SUPABASE_ACCESS_TOKEN` (Personal Access Token do Supabase) em **Settings → Secrets and variables → Actions**. Depois execute o workflow **Publicar Gemini no Supabase (se configurado)** em **Actions → Run workflow**.

Opção B — Supabase CLI, com login autorizado, a partir da raiz do repositório:

```sh
supabase functions deploy gemini-questions --project-ref wskuhkvgipqwykbnuspk
```

A função deve estar publicada com `verify_jwt = true`, como definido em `supabase/config.toml`. A implantação no GitHub Pages **não publica funções Supabase** automaticamente sem autorização.

**5. Verificar**

Acesse https://metodopmdf.github.io/metodo-pmdf/ , entre na conta, abra **Questões → Gemini → Verificar conexão Gemini**. O estado deve ser **Gemini disponível no servidor**.

Selecione um documento completo, marque **Certo/Errado** ou **Múltipla escolha**, e clique **Gerar com Gemini**. O texto é enviado ao Supabase, que verifica a autenticação, consome a cota, consulta o Google e devolve somente questões aceitas pela auditoria estrutural. A geração acontece em pequenos lotes, progressivamente até a meta selecionada.

## Proteções e limites

- Chave do Google e chave administrativa do Supabase **não são expostas ao navegador**.
- Apenas usuários com sessão Supabase Auth válida podem gerar.
- O gateway autentica novamente o JWT contra o Supabase e restringe as origens CORS conhecidas.
- Controles de cota por usuário e global são obrigatórios e atômicos; sem migração ou segredo, a API não é chamada.
- Entradas têm tamanho limitado; a saída exige gabarito compatível, evidência literal presente na fonte e quatro ou cinco alternativas únicas para MC.
- Respostas não verificáveis são rejeitadas e questões já geradas são deduplicadas. A verificação textual **não comprova** a correção jurídica do raciocínio.
- A fonte enviada à geração é transmitida ao **Google**, sujeito aos termos, à política de dados e à modalidade de serviço utilizada pelo projeto.
- A função nunca acessa GPU local e não exige WebGPU no celular.
- O modo **Seguro** continua disponível caso a API esteja desativada, a cota se esgote ou o candidato não queira enviar conteúdo ao Google. Esse modo usa regras, não IA generativa.
- A seleção de 100 ou 200 questões é uma **meta**, não promessa de quantidade ou originalidade. O modelo pode devolver menos questões que as solicitadas.
- Limites do Google e custos de inferência são independentes dos limites internos da plataforma. A presença de uma faixa gratuita **não garante uso ilimitado ou custo zero**.

## Testes e validação

- `node tests/smoke.mjs && node tests/gemini.mjs`: regressão dos recursos e simulações da Edge Function com verificação de segurança, cota e CE/MC.
- `node tests/online-e2e.mjs`: abre o GitHub Pages no Chromium desktop/móvel, verifica a revisão publicada, testa o modo seguro e o caminho Gemini com **servidor simulado**, sem credenciais reais.
- **Pendente após a configuração:** teste ponta a ponta com a função Supabase realmente implantada e uma chave Gemini ativa. Sem esse teste, não se deve declarar que a geração Gemini real está funcionando.

## Documentação oficial

- https://ai.google.dev/gemini-api/docs/structured-output
- https://ai.google.dev/gemini-api/docs/rate-limits
- https://supabase.com/docs/guides/functions/deploy
- https://supabase.com/docs/guides/functions/secrets
