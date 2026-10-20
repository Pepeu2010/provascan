# Estado de segurança da migração de persistência

## Escopo

Esta revisão acompanha a troca da persistência para Google Sheets e do armazenamento de arquivos para Google Drive privado. A conta de serviço e as variáveis de ambiente ainda não foram configuradas neste ambiente, portanto a conexão real e as permissões da planilha/pasta ainda não foram validadas.

## Controles implementados no código

- Credenciais Google permanecem em módulos `server-only` e são lidas apenas no servidor.
- As rotas mantêm as verificações atuais de sessão, papel e autorização antes de consultar dados e arquivos.
- Os arquivos originais são privados no Drive e entregues somente após a checagem de acesso da prova.
- Gravações nas abas são serializadas com Upstash Redis; limites de requisição usam Upstash em produção e memória local como fallback de desenvolvimento.
- Uma substituição de aba usa um único `spreadsheets.batchUpdate` e preserva formatação das células.

## Pendências de validação

- Configurar `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL` e `GOOGLE_PRIVATE_KEY` no ambiente de deploy.
- Compartilhar a planilha e uma pasta privada do Drive com a conta de serviço; definir `GOOGLE_DRIVE_FOLDER_ID` para a pasta.
- Configurar as credenciais Upstash usadas pelo lock distribuído e limites em produção.
- Conferir que todas as abas e cabeçalhos correspondem às operações do ProvaScan.
- Executar lint, verificação de tipos, build e revisão manual das rotas de autenticação, gravação, importação e download antes de publicar.

Nenhuma validação de conexão real, permissão Google, dados de produção ou aceitação manual é declarada neste documento.
