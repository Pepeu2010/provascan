# ProvaScan — redesign premium de Login, MFA e Provas

## Objetivo

Transformar Login, MFA e Provas em uma experiência visual e operacional tão refinada quanto a Central de Gabaritos, com uma melhora claramente perceptível em hierarquia, legibilidade, velocidade de uso, feedback e responsividade. A interface deve parecer um único produto, não três módulos criados em momentos diferentes.

O redesign preserva as APIs, o modelo de autenticação, as permissões por perfil, a criação e publicação de provas, a importação, a impressão e as regras de segurança existentes.

## Princípios

- Clareza antes de decoração: a ação principal de cada etapa deve ser óbvia em poucos segundos.
- Densidade controlada: mostrar contexto suficiente sem transformar a tela em um painel carregado.
- Segurança compreensível: MFA deve transmitir proteção sem parecer um obstáculo técnico.
- Continuidade: Login, MFA, biblioteca, criação e revisão devem compartilhar tokens, linguagem e comportamento.
- Mobile real: nenhuma etapa pode depender de hover, colunas apertadas ou barras fixas que escondam conteúdo.
- Estado sempre explícito: carregando, vazio, erro, sucesso, rascunho, pendência e bloqueio precisam de apresentações próprias.

## Direção visual

O conceito é **Sala de Avaliação**: uma interface escura, precisa e editorial, com violeta reservado para direção e ação, verde para conclusão, âmbar para pendência e vermelho apenas para falhas reais. A aparência deve ser sofisticada, mas funcional para uso escolar diário.

- Tipografia com títulos compactos, forte contraste e textos auxiliares confortáveis.
- Superfícies com bordas nítidas, profundidade discreta e gradientes apenas em áreas de destaque.
- Raios, espaçamento e iconografia alinhados à Central de Gabaritos.
- Microinterações limitadas a entrada de conteúdo, foco, progresso e confirmação.
- `prefers-reduced-motion` remove transições não essenciais.
- CSS dedicado por superfície para evitar o problema de cache do stylesheet global já encontrado em produção.

## Login

### Composição

Desktop usa uma composição assimétrica em duas áreas:

1. Um painel editorial apresenta o propósito do produto, três garantias operacionais e uma visualização abstrata do ciclo digitalização → conferência → resultado.
2. O painel de acesso concentra marca, título, campos, opção de dispositivo confiável, ajuda contextual e botão principal.

Em tablet e celular, o conteúdo editorial é reduzido a uma faixa compacta; o formulário permanece no topo útil, sem exigir rolagem para alcançar “Entrar”.

### Eficiência

- Campo de acesso recebe foco lógico e mantém `autocomplete="username"`.
- Senha mantém mostrar/ocultar, `autocomplete="current-password"` e botão com área de toque adequada.
- “Lembrar este dispositivo” explica duração e risco sem poluir o formulário.
- Ajuda com senha abre uma orientação curta no próprio cartão.
- Envio apresenta estado ocupado sem mudar a largura do botão.
- Erro aparece junto do formulário, com linguagem acionável e foco acessível.

### Estados

- sessão sendo resolvida;
- formulário pronto;
- autenticação em andamento;
- credenciais rejeitadas;
- serviço indisponível;
- encaminhamento para troca de senha ou MFA.

## MFA e segurança da conta

### Estrutura comum

O fluxo usa um cabeçalho com progresso visível e mantém a mesma moldura do Login. Cada etapa mostra:

- número e nome da etapa;
- explicação curta do motivo;
- conteúdo principal;
- ação dominante;
- alternativa ou recuperação como ação secundária.

### Configuração TOTP

- QR Code em superfície clara e isolada, com tamanho seguro para leitura.
- Chave manual em bloco copiável, inicialmente recolhido.
- Compatibilidade explicada com linguagem simples.
- Entrada OTP continua sendo um único `input` nativo com seis células visuais, preservando colar, autofill e acessibilidade.
- Feedback de verificação ocorre sem remover o código prematuramente.

### Recuperação

- Alternar para código de recuperação não perde o contexto da etapa.
- Códigos novos são exibidos em uma superfície de alta legibilidade.
- Copiar e baixar continuam disponíveis.
- Confirmação de armazenamento é obrigatória e explica que cada código funciona uma vez.

### Troca de senha

- Requisitos são exibidos antes do erro.
- Indicador de força usa critérios compreensíveis, não apenas uma palavra.
- Os três campos têm controles consistentes de visibilidade.

## Biblioteca de Provas

### Hero operacional

O topo funciona como central de comando: título, descrição curta, total ativo e ação “Nova prova”. A composição será irmã da Central de Gabaritos, mas com identidade própria baseada em documento, autoria e ciclo de publicação.

### Resumo e filtros

- Segmentos para todas, rascunhos, publicadas, aplicadas e arquivadas.
- Busca por título, disciplina, turma ou professor.
- Filtros por disciplina e origem, reorganizados em desktop e empilhados no celular.
- Filtros ativos ficam visíveis e podem ser limpos em uma ação.
- Contagens não desaparecem durante filtragem.

### Cartões de prova

Cada prova apresenta:

- disciplina, título, turma e autoria;
- situação com texto e cor;
- data, quantidade de questões e origem;
- pendência de revisão quando aplicável;
- ação principal contextual: continuar, revisar ou abrir;
- imprimir e gerar cartão como ações rápidas;
- menu para duplicar, arquivar, restaurar ou excluir.

Desktop usa grade de duas colunas quando houver espaço. Tablet e celular usam uma coluna sem truncar ações importantes. Provas arquivadas recebem tratamento visual mais silencioso.

### Estados especiais

- Skeleton com a geometria final durante carregamento.
- Estado vazio diferente para “nenhuma prova criada” e “nenhum resultado para os filtros”.
- Falha de carregamento oferece nova tentativa.
- Perfil somente leitura explica por que ações de edição não estão disponíveis.
- Rascunho local recuperável aparece como faixa contextual, não como botão solto.

## Criação e edição de provas

### Entrada

“Nova prova” abre uma escolha clara entre:

- Criar manualmente.
- Importar PDF, DOCX, DOC ou imagem.

As opções informam o que acontece depois e o nível de revisão necessário. Importação mostra estados de envio, leitura, organização e revisão.

### Wizard

O editor mantém quatro etapas: Informações, Questões, Gabarito e Revisão. A navegação ganha:

- progresso e conclusão por etapa;
- resumo lateral em desktop;
- resumo recolhível no celular;
- salvamento automático visível, mas discreto;
- barra de ações que respeita `safe-area` e nunca cobre conteúdo;
- retorno à biblioteca com confirmação apenas quando necessário.

### Questões

- Cada questão vira uma unidade escaneável com número, tipo, peso e situação.
- Controles de mover, duplicar e remover ficam agrupados e rotulados.
- Alternativas usam hierarquia clara e área de toque confortável.
- Pendências importadas aparecem na própria questão e no resumo.
- Adicionar questão permanece acessível ao fim da lista e no contexto atual.

### Gabarito e revisão

- Gabarito mostra progresso por questão e diferencia objetiva, discursiva, anulada e pendente.
- Revisão final apresenta uma checklist de publicação com links para corrigir cada pendência.
- Publicar é a única ação visualmente dominante; salvar rascunho continua disponível.
- A confirmação existente de publicação é preservada, com texto consistente.

## Arquitetura de componentes

- `LoginForm` continua responsável por credenciais e transição para segurança.
- `AuthSecurityFlow` continua responsável pela máquina de estados do MFA.
- Apresentações reutilizáveis de segurança serão extraídas apenas quando reduzirem duplicação real.
- `TeacherExamsWorkspace` mantém orquestração e chamadas de API.
- Biblioteca, escolha de criação, cabeçalho do editor, navegação de etapas e resumo de publicação tornam-se componentes focados.
- Funções puras de filtros, contagens e progresso ficam em módulo testável separado.
- Login, segurança e provas recebem stylesheets dedicados importados por seus componentes.

Nenhuma API pública, schema, payload ou regra de autorização será alterada pelo redesign.

## Dados e erros

- O fluxo de dados atual permanece: React → rotas `/api/auth/*` e `/api/teacher-exams*`.
- Erros de rede, validação e autorização mantêm as mensagens do servidor quando seguras para o usuário.
- Erros visuais usam `role="alert"`; sucessos e cópias usam `role="status"` e `aria-live` quando necessário.
- Operações ocupadas bloqueiam apenas a ação em andamento, evitando duplo envio.
- Conteúdo anterior permanece visível sempre que isso não apresentar risco de inconsistência.

## Acessibilidade e responsividade

- Semântica nativa para formulários, títulos, navegação e botões.
- Foco visível e ordem de teclado coerente.
- Alvos de toque com pelo menos 44 px.
- Contraste verificado nos estados normal, hover, foco, erro e desabilitado.
- Validação em 1440 px, 1024 px, 768 px, 390 px e 360 px.
- Nenhuma rolagem horizontal em telas suportadas.
- OTP permanece um input nativo para colagem e preenchimento automático.
- Conteúdo não fica escondido atrás de barras fixas ou do teclado virtual.

## Estratégia de testes

### Automatizados

- Testes de regressão estrutural para Login, MFA e Provas.
- Testes das funções puras de filtragem, resumo e progresso.
- Testes existentes de autenticação, autorização, criação, impressão e responsividade.
- ESLint, TypeScript, build e `git diff --check`.

### Navegador

- Login com credencial inválida e válida.
- MFA configurado e estados de recuperação disponíveis sem expor segredos.
- Biblioteca: busca, filtros, vazio, cartões e menus.
- Criação manual: avançar pelas quatro etapas, salvar rascunho e revisar pendências.
- Importação: selecionar arquivo seguro de teste, acompanhar processamento e revisar resultado.
- Desktop, tablet e celular, com inspeção de overflow e console.

### Publicação

- Trabalho em branch isolada.
- Pull request com CI e preview aprovados.
- Merge em `main`.
- Validação final na produção da Vercel com a conta de professor de teste.

## Fora do escopo

- Alterar requisitos de MFA, autenticação ou duração da sessão.
- Modificar banco, RLS, papéis ou permissões.
- Criar um novo formato de prova ou leitor OCR.
- Redesenhar outras áreas do dashboard neste ciclo.
- Substituir o sistema de componentes ou adicionar dependência visual pesada.

## Critério de conclusão

O trabalho estará concluído quando Login, MFA e toda a jornada de Provas apresentarem uma linguagem visual coesa com Gabaritos, todas as ações existentes continuarem funcionais, estados críticos tiverem tratamento explícito, não houver overflow nos breakpoints definidos, os testes automatizados passarem e a experiência publicada for verificada em produção.
