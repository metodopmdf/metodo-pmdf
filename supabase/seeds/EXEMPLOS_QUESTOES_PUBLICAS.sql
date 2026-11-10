-- EXEMPLOS DIDÁTICOS AUTORAIS (NÃO são questões oficiais de concursos).
-- Execute no Supabase SQL Editor SOMENTE APÓS instalar o banco completo.
-- Revise enunciados e gabaritos antes de disponibilizar aos candidatos.
-- A API do site só consulta registros com publicada=true.
BEGIN;
INSERT INTO public.questoes
 (hash_unico,disciplina,assunto,disciplina_slug,assunto_slug,formato,dificuldade,
  score_dificuldade,tipo_armadilha,enunciado,alternativas,gabarito,comentario_gabarito,
  texto_origem,banca,criado_por,publicada)
VALUES
 ('pmdf-exemplo-v1-seguranca-cena',
  'Noções de Primeiros Socorros','Avaliação inicial da vítima e segurança da cena',
  'nocoes-de-primeiros-socorros','avaliacao-inicial-da-vitima-e-seguranca-da-cena',
  'CERTO_ERRADO','Médio',0.500,'Segurança da cena',
  'Antes de se aproximar de uma vítima em uma via com circulação de veículos, o socorrista deve verificar a segurança da cena e considerar riscos para si, para a vítima e para terceiros.',
  NULL,'CERTO','A avaliação de riscos antecede o contato com a vítima; o socorrista não deve colocar a si mesmo ou outras pessoas em perigo.',
  'Princípios básicos de segurança da cena em primeiros socorros.','Autoral',NULL,true),
 ('pmdf-exemplo-v1-crase',
  'Língua Portuguesa','Emprego do sinal indicativo de crase',
  'lingua-portuguesa','emprego-do-sinal-indicativo-de-crase',
  'CERTO_ERRADO','Médio',0.450,'Regra gramatical',
  'Na norma-padrão, a locução adverbial feminina “à noite” é grafada com o acento grave indicativo de crase.',
  NULL,'CERTO','A locução adverbial feminina “à noite” recebe acento grave indicativo de crase.',
  'Gramática normativa: emprego do acento grave nas locuções adverbiais femininas.','Autoral',NULL,true),
 ('pmdf-exemplo-v1-negacao-conjuncao',
  'Raciocínio Lógico e Matemático (RLM)','Lógica sentencial (ou proposicional)',
  'raciocinio-logico-e-matematico-rlm','logica-sentencial-ou-proposicional',
  'MULTIPLA_ESCOLHA','Médio',0.550,'Lei de De Morgan',
  'Em lógica proposicional clássica, a negação da proposição “p e q” é logicamente equivalente a qual das expressões a seguir?',
  '[{"letra":"A","texto":"não p e não q"},{"letra":"B","texto":"não p ou não q"},{"letra":"C","texto":"p ou q"},{"letra":"D","texto":"não p e q"},{"letra":"E","texto":"p e não q"}]'::jsonb,
  'B','Pela lei de De Morgan, a negação de uma conjunção equivale à disjunção das negações: ¬(p ∧ q) ≡ (¬p ∨ ¬q).',
  'Lei de De Morgan, lógica proposicional clássica.','Autoral',NULL,true),
 ('pmdf-exemplo-v1-progressao-aritmetica',
  'Raciocínio Lógico e Matemático (RLM)',
  'Padrões em sequências; Progressão aritmética e progressão geométrica',
  'raciocinio-logico-e-matematico-rlm',
  'padroes-em-sequencias-progressao-aritmetica-e-progressao-geometrica',
  'MULTIPLA_ESCOLHA','Fácil',0.250,'Cálculo de PA',
  'Em uma progressão aritmética cujo primeiro termo é 3 e a razão é 4, qual é o quinto termo?',
  '[{"letra":"A","texto":"11"},{"letra":"B","texto":"15"},{"letra":"C","texto":"19"},{"letra":"D","texto":"23"},{"letra":"E","texto":"27"}]'::jsonb,
  'C','Usando a fórmula aₙ = a₁ + (n − 1)r, temos a₅ = 3 + 4 × 4 = 19.',
  'Progressão aritmética: cálculo do termo geral.','Autoral',NULL,true)
ON CONFLICT (hash_unico) DO NOTHING;
COMMIT;
NOTIFY pgrst, 'reload schema';
SELECT disciplina, assunto, formato, dificuldade, count(*) AS publicadas
 FROM public.questoes
 WHERE publicada=true AND hash_unico LIKE 'pmdf-exemplo-v1-%'
 GROUP BY disciplina,assunto,formato,dificuldade
 ORDER BY disciplina,assunto;
