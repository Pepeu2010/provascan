# Segurança da correção por foto

## Estado atual

A leitura de imagem ocorre no navegador por meio do pipeline de canvas. A rota
`/api/scan` exige sessão, mesma origem e limite de 20 chamadas por usuário/IP
a cada cinco minutos, mas ainda retorna uma sessão de demonstração. Nenhuma
imagem é enviada, persistida ou disponibilizada em Supabase Storage.

## Quando houver upload real

- Aceitar somente `multipart/form-data`, com limite de tamanho antes de ler o
  corpo e lista explícita de MIME types/assinatura de arquivo.
- Reprocessar imagens no servidor; nunca confiar em MIME, nome ou metadados
  enviados pelo navegador.
- Usar bucket privado, path com ID imprevisível e ownership validado no
  servidor. Não tornar cartões-resposta públicos.
- Gerar URL assinada curta apenas após autorização do dono/gestão.
- Remover EXIF, limitar pixels e tempo de processamento, e registrar auditoria
  sem gravar imagem, QR ou dados pessoais em logs.
- Manter a revisão humana obrigatória antes da nota final.

Não criar um bucket público para “facilitar o teste”: cartões-resposta contêm
dados educacionais sensíveis.
