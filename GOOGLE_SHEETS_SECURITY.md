# Segurança do Google Sheets e Drive

## Acesso

- A conta de serviço é usada somente em módulos `server-only`; não exponha sua chave em variáveis `NEXT_PUBLIC_`, no navegador ou em logs.
- Compartilhe a planilha e a pasta privada do Drive apenas com o e-mail da conta de serviço usada pelo deploy.
- Mantenha o acesso à planilha e à pasta restrito aos responsáveis autorizados. Arquivos importados não recebem permissão pública.
- Operações do ProvaScan usam uma lease distribuída Upstash, renovada enquanto uma gravação está ativa. Configure as duas variáveis Upstash em todo ambiente que grava dados.

## Configuração

Defina `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL` e `GOOGLE_PRIVATE_KEY` no ambiente do servidor. Para importar arquivos, também defina `GOOGLE_DRIVE_FOLDER_ID` para uma pasta privada compartilhada com a conta de serviço. `GOOGLE_PRIVATE_KEY` pode ser fornecida com quebras de linha reais ou com `\\n`.

As abas usam nomes de tabela e a primeira linha contém os nomes das colunas. A aplicação valida cabeçalhos e usa o esquema tipado versionado em `lib/google-sheets-schema.ts` para codificar texto, números, booleanos, JSON, strings vazias e nulos. Não remova ou reordene cabeçalhos enquanto a aplicação estiver em uso.

## Limites

Google Sheets não oferece as mesmas garantias relacionais e de transação de um banco SQL. A lease Upstash serializa apenas escritores do ProvaScan que usam o mesmo Redis e a mesma planilha. Ela não impede edições manuais, outros serviços ou operações em mais de uma aba como uma transação. Uma atualização de uma aba usa um único `batchUpdate`; isso não torna a planilha um banco transacional. Mantenha escritores externos suspensos durante migrações e reconciliações e faça backup independente antes de publicar.

OCR e correção de fotos seguem locais no navegador. Downloads de arquivos originais passam por uma rota autenticada que verifica a autorização antes de buscar o conteúdo privado no Drive.

## Drive e conta de serviço

O destino deve ser uma pasta privada de um Shared Drive na qual a conta de serviço tenha permissão para adicionar arquivos, ou usar OAuth delegado a uma conta humana com quota do Drive. Contas de serviço não têm quota de armazenamento própria e não podem ser proprietárias de arquivos em Meu Drive. Não mude o arquivo original do Storage até validar checksum, download autenticado e vínculo em `exam_files`.

## Gates para o PR de migração

### Revalidação pós-exclusão da origem — 2026-10-20

- A planilha operacional tem 27 abas: `RESUMO` e 26 abas de dados. A contagem limitada de células não vazias na primeira coluna, excluindo o cabeçalho, encontrou 849 linhas nas abas de dados.
- O snapshot de exportação de 2026-10-19 registra 820 linhas. As 29 linhas adicionais observadas na planilha são posteriores ao snapshot; a contagem por aba aumentou em `answer_keys` (+1), `audit_log_internal` (+11), `correction_rules` (+1), `exam_content_versions` (+13), `exam_questions` (+1), `exam_sections` (+1) e `exams` (+1). Parte da atividade posterior inclui registros de auditoria e validações. Essa contagem não comprova igualdade de chaves primárias nem igualdade de todos os campos.
- A divergência histórica entre 819 e 820 foi atribuída à soma manual subcontada da auditoria anterior; o snapshot da exportação e a comparação documentada apontaram 820. Como a origem PostgreSQL foi excluída, não é mais possível repetir a comparação linha a linha, identificar de forma independente cada alteração posterior ou afirmar paridade atual com a origem.
- O registro de `exam_files` continua descrevendo um objeto privado de 9.409 bytes. A pasta de destino consultada contém apenas a planilha de exportação; uma busca no Drive pelo nome exato registrado não encontrou o arquivo. Não há prova de cópia, checksum no destino ou download autenticado. O registro e os relacionamentos permanecem sem alteração.
- Na publicação de Produção baseada no commit `6abc23ba74accd50a9853fd1934dab6af8a5b283`, o login do professor de teste abriu o painel e a lista de provas; a lista mostrou duas provas. A sessão foi encerrada. O log de runtime registrou a decisão permitida do rate limit Upstash. Esta verificação cobre autenticação e leitura básica, não MFA, cadastro, autorização de todos os papéis, upload/download privado ou gravação neste ciclo.
- A integração Google/Upstash isolada continua pendente: requer planilha, pasta privada e Redis de teste separados dos recursos operacionais. Credenciais de Produção não devem ser usadas pelo harness de integração.
- Continua sem evidência um backup independente e uma restauração comprovada de PostgreSQL e Storage. A exclusão da origem impede gerar esses artefatos retroativamente a partir do projeto removido.

### Comparação de integridade em 2026-10-19

Foram comparadas todas as chaves primárias nas 26 abas com os 26 conjuntos de tabelas: 820 linhas no PostgreSQL e 820 linhas no Sheets, sem chaves ausentes, excedentes ou duplicadas; 6.217 campos examinados. O número 819 da auditoria anterior veio de uma soma manual subcontada, não de uma linha ausente. Permanecem três diferenças de precisão submilissegundo nas colunas `granted_at`, `updated_at` e `archived_at` do único registro de `pedagogical_scopes`; os valores não são reproduzidos aqui. Não houve exposição dos dados sensíveis no relatório. Esta diferença deve ser corrigida e a comparação completa repetida antes de declarar paridade exata.

Na auditoria anterior à exclusão da origem, o Storage continha um objeto privado de 9.409 bytes no bucket de importação. Ele não foi lido nem copiado antes da exclusão. A busca posterior no Drive não encontrou o arquivo; checksum de destino, download autenticado e atualização de `exam_files` não foram comprovados. Como o projeto de origem foi excluído, o objeto original não está mais acessível por essa origem.

Não foi apresentada evidência de exportação independente e restauração testada do PostgreSQL e Storage. O gate de backup restaurável permanece aberto.

Para executar a integração isolada, crie recursos separados: uma planilha temporária, uma pasta privada temporária (preferencialmente em Shared Drive) e um Redis Upstash de teste. Configure `GOOGLE_TEST_SHEET_ID`, `GOOGLE_TEST_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_TEST_PRIVATE_KEY`, `GOOGLE_TEST_DRIVE_FOLDER_ID`, `UPSTASH_TEST_REDIS_REST_URL` e `UPSTASH_TEST_REDIS_REST_TOKEN` localmente, e defina `GOOGLE_TEST_RESOURCE_CONFIRMATION=ISOLATED`. Execute `npm run test:integration:google`; o harness valida autenticação de serviço, insert/read/edit/delete, upload/download privado e checksum, removendo apenas os dados sintéticos que criou. Nunca aponte o teste de integração para recursos operacionais. A publicação de Produção e o teste manual de login/leitura não substituem essa integração. Para a aplicação, valide MFA, cadastro, gravação e permissões por papel em ambiente isolado com usuários de teste.

O teste de integração Google/Upstash real ainda não foi executado contra recursos isolados configurados. Os testes locais cobrem codec, chaves compostas, duplicatas e lease com Redis simulado. O login e a leitura básica foram verificados em Produção; MFA, cadastro, gravações completas e permissões por papel ainda exigem o fluxo de teste isolado com usuários de teste. O harness Google não substitui esse fluxo.

O gate de backup restaurável não foi satisfeito antes da exclusão da infraestrutura de origem. Uma contagem de registros ou backup sem teste de restauração não satisfaz esse gate; a recuperação exige um backup independente preexistente. A publicação e os testes produtivos autorizados não substituem a evidência de restauração.
