# Sistema de Provas V2

Data: 2026-09-17  
Status: arquitetura aprovada; implementação incremental pendente.

## Objetivo

Evoluir o ProvaScan para que `admin`, `vice_diretor`, `coordenador` e
`professor` criem e operem provas dentro de seus limites reais, preservando
provas, gabaritos, correções, resultados, QR legados e a geometria OMR
validada. A autorização é sempre decidida no backend.

Não será criado o cargo `diretor`. Os cargos continuam:

- `admin`
- `vice_diretor`
- `coordenador`
- `professor`

## Princípios congelados

- `exams.creator_id` preserva a autoria original e é imutável.
- `exam_assignments` representa responsabilidade por prova e turma; não muda
  a autoria.
- `pedagogical_scopes` representa onde um usuário pode atuar pedagogicamente.
- `exam_sections` continua como estrutura de conteúdo/colaboração e nunca é
  reutilizada como autorização ou atribuição.
- `subjects` é o catálogo canônico. `exams.subject` permanece como snapshot
  textual para compatibilidade e histórico.
- Atribuições são relacionais, nunca JSON ou produto cartesiano implícito.
- Gabarito Oficial e Cartão-Resposta são documentos e fluxos diferentes.
- O corretor atual é preservado e adaptado; não será criado outro motor.
- O QR identifica; o servidor resolve e autoriza. QR V1 é leitura somente; toda
  nova emissão usa V2.
- A geometria de `services/answer-sheet-template.ts` é a fonte única para
  impressão e leitura OMR.
- Histórico acadêmico e snapshots não são reescritos. Alteração estrutural após
  resultado exige duplicação da prova.
- Gerar PDF, baixar, imprimir e aplicar são estados distintos.
- Hard delete não é o fluxo normal para histórico acadêmico.

## Modelo conceitual

```text
subjects
  -> pedagogical_scopes
  -> exame (creator_id preservado)
  -> Gabarito Oficial
  -> exam_assignments
  -> answer_sheet_instances
  -> Cartão-Resposta V2
  -> leitura QR/OMR
  -> correções e resultados
```

| Estrutura | Pergunta respondida |
| --- | --- |
| `creator_id` | Quem é o autor original? |
| `pedagogical_scopes` | Onde este usuário está autorizado a atuar? |
| `exam_assignments` | Quem responde pela prova nesta turma? |
| `answer_sheet_instances` | Qual cartão individual foi emitido? |
| `corrections` | Qual tentativa/resultado foi registrada? |

## Fundação de autorização

### Catálogo e snapshot de disciplina

`subjects` será um catálogo canônico com identificador estável e nome atual.
`exams.subject_id` será nullable durante a transição. Para uma nova prova
publicada, `subject_id` é obrigatório e o backend grava em `exams.subject`
o nome canônico naquele momento. O cliente não pode enviar snapshot diferente.
Renomear uma disciplina nunca reescreve provas antigas.

### Escopo pedagógico

```text
pedagogical_scopes
id, user_id, subject_id, class_id,
granted_by, granted_at, updated_at, active, archived_at
```

Representa explicitamente usuário + disciplina + turma e serve a professor e
coordenador. Uma atribuição excepcional não cria escopo permanente.

### Atribuição de prova

```text
exam_assignments
id, exam_id, teacher_id, class_id,
assigned_by, assigned_at, updated_at, active, archived_at
```

Haverá unicidade parcial para `exam_id + teacher_id + class_id` ativa e
índices por prova, professor e turma. Remoção normal inativa a linha; não apaga
histórico. O payload recebe grupos explícitos `teacherId + classIds`, expandidos
deterministicamente após autorização; nunca arrays independentes.

Política de exceção:

- Professor: apenas no próprio escopo.
- Coordenador: apenas no próprio escopo e para professor autorizado.
- Vice-diretor: escola inteira, para professor autorizado.
- Admin: exceção pontual fora do escopo somente com justificativa e auditoria;
  isso não concede escopo permanente.

### Regra de cargo

Admin tem controle global, usuários, cargos, configurações, segurança,
auditoria, provas, impressão e correções. Vice-diretor opera a escola sem
configurações técnicas/críticas. Coordenador opera fluxo pedagógico no escopo.
Professor trabalha em provas próprias ou atribuídas, disciplinas e turmas
autorizadas.

`canCreateExam` e verificações equivalentes residem em serviço central e são
chamadas por todas as rotas. Nenhuma permissão depende apenas de botão oculto.

## Ciclo de vida da prova

Estados existentes de `exams` são reutilizados:

```text
rascunho -> publicada -> aplicada -> arquivada
```

Rascunho pode estar incompleto. Publicação é transacional e exige disciplina
resolvida, questões/gabarito completos e atribuições válidas quando aplicáveis.
O botão Criar prova reserva espaço durante sessão/permissões por meio de
skeleton neutro, sem timer ou oscilação visual.

O novo fluxo é:

```text
Informações -> Questões e Gabarito Oficial -> Aplicação -> Revisar -> Criar
```

Rascunhos locais versionados podem proteger a edição, mas publicação é sempre
revalidada e gravada em transação no servidor.

## Gabarito Oficial

`exam_questions.correct_answers`, `weight`, `annulled` e
`correction_rules` são a estrutura principal. `answer_keys` continua como
projeção de compatibilidade. Toda escrita nova passa por um único serviço
`updateOfficialAnswerKey`, que valida, normaliza e atualiza questões,
`answer_keys` e regras em uma única transação.

Depois de correções/resultados válidos, ficam bloqueadas mudanças que alterem
significado acadêmico: respostas, pesos, anulações, alternativas, quantidade de
questões e regra de múltiplas respostas. Título e metadados seguros podem
continuar editáveis. Para mudança estrutural, duplica-se a prova.

## Cartões-resposta e QR

```text
answer_sheet_instances
id, exam_assignment_id, student_id, generated_by,
template_version, created_at, invalidated_at, status
```

Uma instância registra emissão auditável, não aplicação acadêmica. Deve existir
unicidade para cartão ativo por atribuição e aluno. O QR V2 contém somente
identificadores de versão, cartão, prova, atribuição, aluno e turma. O servidor
resolve a instância, compara os vínculos e autoriza antes de aceitar correção.

O parser terá V1 legado e V2. V1 continua apenas para leitura. O template OMR,
posicionamento, bolhas, margens, QR e âncoras não são redesenhados sem validar o
mesmo corpus de leitura.

## Impressão

```text
exam_print_jobs
id, exam_id, requested_by, package_type, ordering, status,
total_items, completed_items, failed_items, page_count,
artifact_path, artifact_checksum, created_at, completed_at,
expires_at, error_summary

exam_print_job_items
id, print_job_id, exam_assignment_id, student_id,
answer_sheet_instance_id, document_kind, sequence, status,
page_count, error_code, error_message
```

Pacotes: `exam_only`, `answer_sheets_only`, `exam_and_answer_sheets` e
`official_answer_key`. O Gabarito Oficial é sempre separado e jamais entra
implicitamente em pacote de aluno.

A preparação possui preview, estimativa de páginas, ordenação por turma/nome,
processamento em blocos retomáveis, falha parcial por item e artefatos privados
temporários. PDF preparado não prova impressão física. Lotes grandes são
fragmentados por turma/limite de páginas para evitar timeout e excesso de
memória.

## Central da Prova

Rota: `/dashboard/provas/[examId]`.

A Central é uma página operacional, não um dashboard de cards. A unidade
principal é atribuição/turma. Ela apresenta autoria, disciplina, responsáveis,
turmas, alunos, estado do Gabarito Oficial, cartões, aplicações, correções,
resultados, pendências, impressão e histórico permitido pelo cargo.

Aplicação é registrada explicitamente por turma:

```text
exam_assignment_applications
id, exam_assignment_id, confirmed_by, applied_at, notes, created_at
```

Cartão gerado, PDF preparado, aplicação confirmada e correção concluída são
métricas separadas.

## Correção e resultados

As correções recebem colunas nullable para preservar o legado:

```text
exam_assignment_id, answer_sheet_instance_id, corrected_by,
attempt_number, supersedes_correction_id, result_status
```

`result_status` é `active`, `superseded` ou `voided`. Uma nova tentativa
não apaga a anterior; em transação, a vigente é marcada `superseded` e a nova
se torna `active`. Somente uma tentativa ativa por atribuição e aluno é
permitida.

Casos operacionais:

- Atribuição arquivada preserva histórico e bloqueia emissão nova.
- Aluno transferido mantém snapshot e turma de emissão; novos cartões usam a
  turma atual.
- Professor desativado preserva autoria/histórico; a gestão reatribui.
- Cartão regenerado invalida uso normal do anterior, sem apagar resultado.
- QR antigo é reconhecido com aviso e validação de servidor.
- Prova duplicada copia conteúdo/gabarito/regras permitidos, nunca atribuições,
  cartões, aplicações, correções ou resultados.
- Offline preserva a fila existente; na sincronização, autorização e
  integridade são verificadas novamente no servidor.

Relatórios usam somente resultado `active`, mantendo tentativas e snapshots
para auditoria.

## Retenção

PDFs e artefatos gerados são privados e expiram. Provas antigas são arquivadas,
não apagadas automaticamente. Correções, respostas, snapshots e auditoria
acadêmica não expiram. Rascunho sem dependências pode ser removido somente sob
política administrativa e período de carência. Hard delete de prova publicada
ou aplicada fica bloqueado.

## Matriz de permissões

| Ação | Admin | Vice-diretor | Coordenador | Professor |
| --- | --- | --- | --- | --- |
| Criar/publicar | Escola inteira | Escola inteira | Escopo pedagógico | Disciplinas/turmas autorizadas |
| Atribuir | Global; exceção auditada | Professor autorizado na escola | Professor autorizado no escopo | Autoatribuição no próprio escopo |
| Editar sem resultado | Global | Escola | Escopo | Própria/atribuída autorizada |
| Editar significado após resultado | Duplica prova | Duplica prova | Duplica prova | Duplica prova |
| Gabarito e cartões | Global | Escola | Escopo | Atribuições ativas |
| Impressão em lote | Global | Escola | Escopo | Turmas atribuídas |
| Correção/resultados | Global | Escola | Escopo | Provas/turmas atribuídas |
| Usuários, segurança, configuração | Completo | Sem configuração crítica | Sem acesso crítico | Sem acesso |
| Retenção | Configura e executa | Consulta | Sem configuração | Sem configuração |

## Sequência de entrega

Cada PR é funcional, testado e revisado antes do seguinte.

1. Estabilizar Criar prova: permissão central, skeleton sem layout shift e
   regressão de hidratação.
2. Criar `subjects`, `exams.subject_id` nullable e `pedagogical_scopes`,
   sem backfill arriscado.
3. Criar `exam_assignments`, inativação, auditoria e leitura legada.
4. Criar fluxo progressivo de prova integrado às estruturas existentes.
5. Centralizar Gabarito Oficial em serviço único.
6. Criar instâncias de cartão, QR V2 e compatibilidade V1.
7. Criar jobs de impressão, preview e processamento retomável.
8. Criar a Central da Prova orientada por turma/atribuição.
9. Adaptar o corretor, tentativas e resultados ativos.
10. Hardening: backfill seguro, matriz de permissões, IDOR/BOLA, OMR, QR,
    offline, impressão, acessibilidade, responsividade e E2E.

## Migrations, compatibilidade e rollback

Ordem segura: backup/log quantitativo, estruturas novas, colunas nullable,
índices/constraints, backfill separado, relatório de ambiguidades, dual-read,
validação e somente então novas gravações no modelo novo. Cada registro de
backfill recebe classificação como `migrated_exact`, `migrated_inferred`,
`legacy_ambiguous`, `legacy_unassigned` ou `manual_review_required`.

Não se usa migration destrutiva como rollback. Se necessário, desativa-se a
escrita nova e retorna-se ao dual-read, preservando tabelas, logs e registros
já criados.

## Validação obrigatória

- Testes unitários de permissão, gabarito, atribuição e QR.
- Integração transacional de publicação, atribuição, cartão e correção.
- E2E dos quatro cargos e matriz de escopo.
- Testes negativos IDOR/BOLA para todos os identificadores operacionais.
- QR V1/V2, corpus OMR atual, preflight A4 e impressão em lote.
- Reenvio idempotente e preservação do offline existente.
- Desktop, tablet e 320/375/768/1280/1440 px; teclado, leitor de tela,
  contraste, foco e reduced motion.
- Build, tipos, lint, migrations e relatórios quantitativos antes/depois.

## Critério de pronto

Não basta compilar. Cada PR deve demonstrar o comportamento correspondente,
regressão proporcional, segurança de backend e preservação do legado. Nenhuma
fase pode reescrever o histórico acadêmico ou permitir acesso por mera ocultação
de interface.
