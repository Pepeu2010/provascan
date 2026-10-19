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

### Comparação de integridade em 2026-10-19

Foram comparadas todas as chaves primárias nas 26 abas com os 26 conjuntos de tabelas: 820 linhas no PostgreSQL e 820 linhas no Sheets, sem chaves ausentes, excedentes ou duplicadas; 6.217 campos examinados. O número 819 da auditoria anterior veio de uma soma manual subcontada, não de uma linha ausente. Permanecem três diferenças de precisão submilissegundo nas colunas `granted_at`, `updated_at` e `archived_at` do único registro de `pedagogical_scopes`; os valores não são reproduzidos aqui. Não houve exposição dos dados sensíveis no relatório. Esta diferença deve ser corrigida e a comparação completa repetida antes de declarar paridade exata.

O Storage ainda contém um objeto privado de 9.409 bytes no bucket de importação. Ele não foi lido, copiado nem removido nesta execução; o checksum, download autenticado do destino e atualização de `exam_files` continuam pendentes. A conta atual não tem credenciais Google/Drive configuradas neste ambiente e não há conector de leitura de bytes do objeto do Storage disponível.

Não foi apresentada evidência de exportação independente e restauração testada do PostgreSQL e Storage. O gate de backup restaurável permanece aberto.

Antes de configurar Preview, crie recursos isolados para teste: uma planilha temporária, pasta privada temporária (preferencialmente em Shared Drive) e um Redis Upstash de teste. Configure `GOOGLE_TEST_SHEET_ID`, `GOOGLE_TEST_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_TEST_PRIVATE_KEY`, `GOOGLE_TEST_DRIVE_FOLDER_ID`, `UPSTASH_TEST_REDIS_REST_URL` e `UPSTASH_TEST_REDIS_REST_TOKEN` localmente, e defina `GOOGLE_TEST_RESOURCE_CONFIRMATION=ISOLATED`. Execute `npm run test:integration:google`; o harness valida autenticação de serviço, insert/read/edit/delete, upload/download privado e checksum, removendo apenas os dados sintéticos que criou. Nunca aponte o teste de integração para recursos operacionais. Execute também `npx tsc --noEmit`, `npm run lint`, `npm run test:critical` e `npm run build`; valide autenticação, MFA, cadastro e permissões da aplicação no Preview isolado com usuários de teste.

O teste de integração Google real não foi executado neste ambiente porque não há credenciais Google/Upstash nem identificadores de recursos isolados configurados. Os testes locais cobrem codec, chaves compostas, duplicatas e lease com Redis simulado. A autenticação/MFA/cadastro e permissões por papel ainda exigem o fluxo manual automatizado no Preview com usuários de teste; o harness Google não substitui esse fluxo.

Antes de substituir o backend, exporte PostgreSQL e Storage de forma independente, guarde os artefatos fora da conta de produção e faça uma restauração verificável em ambiente isolado. Contagem de registros e backup sem teste de restauração não satisfazem esse gate. Supabase deve continuar disponível até que a publicação, os testes produtivos autorizados e a restauração tenham sido comprovados.
