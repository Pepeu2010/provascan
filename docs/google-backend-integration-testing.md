# Teste integrado do backend Google

`npm run test:integration:google` valida Google Sheets, Google Drive privado e Upstash Redis. Execute somente contra recursos de teste dedicados.

## Recursos isolados necessários

- Uma planilha de teste com a aba `app_settings_internal` e cabeçalho compatível com o esquema do aplicativo.
- Uma pasta privada de Drive, acessível à conta de serviço, para o arquivo temporário do teste.
- Uma instância Upstash Redis separada da usada pelo aplicativo.
- Uma conta de serviço com acesso somente aos recursos de teste necessários.

Não use a planilha operacional, a pasta operacional ou o Redis operacional. O script compara os IDs dos recursos de teste com os valores operacionais e encerra se detectar reutilização.

## Variáveis de ambiente

Defina localmente, sem colar valores secretos em chat ou em arquivos versionados:

```text
GOOGLE_INTEGRATION_TESTS=true
GOOGLE_TEST_RESOURCE_CONFIRMATION=ISOLATED
GOOGLE_TEST_SHEET_ID=<id-da-planilha-isolada>
GOOGLE_TEST_DRIVE_FOLDER_ID=<id-da-pasta-isolada>
GOOGLE_TEST_SERVICE_ACCOUNT_EMAIL=<email-da-conta-de-servico>
GOOGLE_TEST_PRIVATE_KEY=<chave-privada-da-conta-de-servico>
UPSTASH_TEST_REDIS_REST_URL=<url-do-redis-isolado>
UPSTASH_TEST_REDIS_REST_TOKEN=<token-do-redis-isolado>
```

`GOOGLE_TEST_PRIVATE_KEY` aceita quebras de linha reais ou `\n` escapados. Mantenha os valores num arquivo local ignorado pelo Git ou no gerenciador de segredos do ambiente de teste.

## O que o script altera

O teste insere, lê, edita e remove uma linha sintética em `app_settings_internal`; cria, baixa, verifica por SHA-256 e exclui um arquivo temporário na pasta privada; e adquire, testa contenção e libera um lock no Redis isolado. O bloco `finally` tenta remover os dados temporários se uma verificação falhar.

Esse script não valida o login do aplicativo, MFA, permissões por papel nem os fluxos de cadastro. Esses fluxos precisam de uma aplicação configurada com o mesmo backend isolado antes de serem testados no navegador.
