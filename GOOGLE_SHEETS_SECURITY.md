# Segurança do Google Sheets e Drive

## Acesso

- A conta de serviço é usada somente em módulos `server-only`; não exponha sua chave em variáveis `NEXT_PUBLIC_`, no navegador ou em logs.
- Compartilhe a planilha e a pasta privada do Drive apenas com o e-mail da conta de serviço usada pelo deploy.
- Mantenha o acesso à planilha e à pasta restrito aos responsáveis autorizados. Arquivos importados não recebem permissão pública.
- Operações de escrita usam Upstash Redis para serializar alterações entre instâncias. Configure as duas variáveis Upstash em todo ambiente que grava dados.

## Configuração

Defina `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL` e `GOOGLE_PRIVATE_KEY` no ambiente do servidor. Para importar arquivos, também defina `GOOGLE_DRIVE_FOLDER_ID` para uma pasta privada compartilhada com a conta de serviço. `GOOGLE_PRIVATE_KEY` pode ser fornecida com quebras de linha reais ou com `\\n`.

As abas usam nomes de tabela e a primeira linha contém os nomes das colunas. A aplicação valida cabeçalhos antes de gravar e falha quando alguma coluna necessária não existe. Não remova ou reordene cabeçalhos enquanto a aplicação estiver em uso.

## Limites

Google Sheets não oferece as mesmas garantias relacionais e de transação de um banco SQL. O app preserva autorização no servidor, protege gravações concorrentes com lock distribuído e envia atualizações completas de uma aba em um lote atômico da API. Falhas de rede durante operações em várias abas ainda podem exigir conferência manual.

OCR e correção de fotos seguem locais no navegador. Downloads de arquivos originais passam por uma rota autenticada que verifica a autorização antes de buscar o conteúdo privado no Drive.
