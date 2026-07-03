export type AnswerSheetPageType = "EXATAS" | "HUMANAS" | "TECNICO" | "EXATAS_E_HUMANAS";

export type BlockLayoutStyle = "classic" | "banded";

export type NormalizedRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export type AnswerSheetBlockModel = {
  questionCount: number;
  searchWindow: NormalizedRect;
  title: string;
};

export type AnswerSheetModel = {
  aliases: string[];
  blocks: AnswerSheetBlockModel[];
  displayName: string;
  id: string;
  layoutStyle: BlockLayoutStyle;
  pageType: AnswerSheetPageType;
  tokens: string[];
};

function rect(x: number, y: number, width: number, height: number): NormalizedRect {
  return { height, width, x, y };
}

export const ANSWER_SHEET_MODELS: AnswerSheetModel[] = [
  {
    aliases: ["1 ano exatas", "1 serie exatas", "exatas 1ano"],
    blocks: [
      { questionCount: 10, searchWindow: rect(0.03, 0.18, 0.44, 0.26), title: "MATEMATICA" },
      { questionCount: 10, searchWindow: rect(0.03, 0.45, 0.44, 0.24), title: "FISICA" },
      { questionCount: 10, searchWindow: rect(0.03, 0.71, 0.44, 0.24), title: "BIOLOGIA" },
      { questionCount: 10, searchWindow: rect(0.51, 0.18, 0.44, 0.28), title: "QUIMICA" },
      { questionCount: 5, searchWindow: rect(0.51, 0.50, 0.44, 0.17), title: "EDUCACAO FINANCEIRA" },
      { questionCount: 5, searchWindow: rect(0.51, 0.71, 0.44, 0.17), title: "EDUCACAO FISICA" },
    ],
    displayName: "1ª Série Exatas",
    id: "EXATAS_1ANO",
    layoutStyle: "banded",
    pageType: "EXATAS",
    tokens: ["1serie", "exatas", "matematica", "quimica", "biologia", "educacaofinanceira"],
  },
  {
    aliases: ["1 ano humanas", "1 serie humanas", "humanas 1ano"],
    blocks: [
      { questionCount: 10, searchWindow: rect(0.03, 0.18, 0.44, 0.25), title: "PORTUGUES" },
      { questionCount: 10, searchWindow: rect(0.03, 0.45, 0.44, 0.24), title: "HISTORIA" },
      { questionCount: 10, searchWindow: rect(0.03, 0.71, 0.44, 0.24), title: "GEOGRAFIA" },
      { questionCount: 8, searchWindow: rect(0.52, 0.18, 0.43, 0.28), title: "FILOSOFIA" },
      { questionCount: 5, searchWindow: rect(0.52, 0.50, 0.43, 0.16), title: "INGLES" },
      { questionCount: 5, searchWindow: rect(0.52, 0.71, 0.43, 0.16), title: "ARTES" },
    ],
    displayName: "1ª Série Humanas",
    id: "HUMANAS_1ANO",
    layoutStyle: "banded",
    pageType: "HUMANAS",
    tokens: ["1serie", "humanas", "portugues", "historia", "geografia", "filosofia"],
  },
  {
    aliases: ["2 ad tecnico", "2 serie ad tecnico", "tecnico ad"],
    blocks: [
      { questionCount: 10, searchWindow: rect(0.03, 0.16, 0.45, 0.39), title: "REDES" },
      { questionCount: 10, searchWindow: rect(0.52, 0.16, 0.45, 0.39), title: "PDSMA" },
      { questionCount: 10, searchWindow: rect(0.03, 0.57, 0.45, 0.39), title: "LLP" },
      { questionCount: 10, searchWindow: rect(0.52, 0.57, 0.45, 0.39), title: "CCMT" },
    ],
    displayName: "2ª Série AD Técnico",
    id: "TECNICO_2AD",
    layoutStyle: "classic",
    pageType: "TECNICO",
    tokens: ["2seriead", "tecnico", "redes", "pdsma", "llp", "ccmt"],
  },
  {
    aliases: ["3 a tecnico", "3 serie a tecnico", "tecnico 3a"],
    blocks: [
      { questionCount: 10, searchWindow: rect(0.03, 0.14, 0.45, 0.28), title: "AEDIN" },
      { questionCount: 10, searchWindow: rect(0.52, 0.14, 0.45, 0.28), title: "MECD" },
      { questionCount: 10, searchWindow: rect(0.03, 0.43, 0.45, 0.28), title: "ERIA" },
      { questionCount: 10, searchWindow: rect(0.52, 0.43, 0.45, 0.28), title: "AM" },
      { questionCount: 10, searchWindow: rect(0.03, 0.72, 0.45, 0.24), title: "BDCN" },
      { questionCount: 10, searchWindow: rect(0.52, 0.72, 0.45, 0.24), title: "IA" },
    ],
    displayName: "3ª Série A Técnico",
    id: "TECNICO_3A",
    layoutStyle: "classic",
    pageType: "TECNICO",
    tokens: ["3seriea", "tecnico", "aedin", "mecd", "eria", "bdcn", "ia"],
  },
  {
    aliases: ["2 b humanas", "2 serie b humanas", "humanas 2b"],
    blocks: [
      { questionCount: 10, searchWindow: rect(0.03, 0.15, 0.44, 0.27), title: "PORTUGUES" },
      { questionCount: 10, searchWindow: rect(0.03, 0.44, 0.44, 0.27), title: "HISTORIA" },
      { questionCount: 10, searchWindow: rect(0.03, 0.73, 0.44, 0.24), title: "GEOGRAFIA" },
      { questionCount: 7, searchWindow: rect(0.51, 0.15, 0.44, 0.25), title: "SOCIOLOGIA" },
      { questionCount: 5, searchWindow: rect(0.51, 0.42, 0.44, 0.18), title: "INGLES" },
      { questionCount: 5, searchWindow: rect(0.51, 0.61, 0.44, 0.16), title: "LIDERANCA" },
      { questionCount: 6, searchWindow: rect(0.51, 0.79, 0.44, 0.18), title: "ARTES E MIDIAS" },
    ],
    displayName: "2ª Série B Humanas",
    id: "HUMANAS_2B",
    layoutStyle: "banded",
    pageType: "HUMANAS",
    tokens: ["2serieb", "humanas", "sociologia", "lideranca", "artesemidias"],
  },
  {
    aliases: ["2 acd humanas", "2 serie acd humanas", "humanas 2acd"],
    blocks: [
      { questionCount: 10, searchWindow: rect(0.03, 0.16, 0.44, 0.29), title: "PORTUGUES" },
      { questionCount: 10, searchWindow: rect(0.03, 0.48, 0.44, 0.29), title: "HISTORIA" },
      { questionCount: 10, searchWindow: rect(0.52, 0.16, 0.42, 0.29), title: "GEOGRAFIA" },
      { questionCount: 7, searchWindow: rect(0.52, 0.48, 0.42, 0.22), title: "SOCIOLOGIA" },
      { questionCount: 5, searchWindow: rect(0.52, 0.74, 0.42, 0.15), title: "INGLES" },
    ],
    displayName: "2ª Série ACD Humanas",
    id: "HUMANAS_2ACD",
    layoutStyle: "banded",
    pageType: "HUMANAS",
    tokens: ["2serieacd", "humanas", "portugues", "historia", "geografia", "sociologia"],
  },
  {
    aliases: ["3 a misto", "3 serie a exatas humanas", "3a exatas humanas"],
    blocks: [
      { questionCount: 14, searchWindow: rect(0.04, 0.16, 0.42, 0.39), title: "PORTUGUES" },
      { questionCount: 10, searchWindow: rect(0.04, 0.57, 0.42, 0.24), title: "HISTORIA" },
      { questionCount: 6, searchWindow: rect(0.04, 0.83, 0.42, 0.14), title: "INGLES" },
      { questionCount: 14, searchWindow: rect(0.53, 0.16, 0.42, 0.39), title: "MATEMATICA" },
      { questionCount: 10, searchWindow: rect(0.53, 0.57, 0.42, 0.24), title: "FISICA" },
      { questionCount: 6, searchWindow: rect(0.53, 0.83, 0.42, 0.14), title: "EDUCACAO FISICA" },
    ],
    displayName: "3ª Série A Exatas e Humanas",
    id: "MISTO_3A",
    layoutStyle: "banded",
    pageType: "EXATAS_E_HUMANAS",
    tokens: ["3seriea", "exatasehumanas", "portugues", "matematica", "fisica", "educacaofisica"],
  },
  {
    aliases: ["3 bc humanas", "3 serie bc humanas", "humanas 3bc"],
    blocks: [
      { questionCount: 14, searchWindow: rect(0.03, 0.16, 0.44, 0.37), title: "PORTUGUES" },
      { questionCount: 12, searchWindow: rect(0.03, 0.55, 0.44, 0.34), title: "HISTORIA" },
      { questionCount: 10, searchWindow: rect(0.52, 0.16, 0.43, 0.28), title: "GEOGRAFIA" },
      { questionCount: 6, searchWindow: rect(0.52, 0.47, 0.43, 0.19), title: "SOCIOLOGIA" },
      { questionCount: 8, searchWindow: rect(0.52, 0.69, 0.43, 0.20), title: "FILOSOFIA" },
    ],
    displayName: "3ª Série BC Humanas",
    id: "HUMANAS_3BC",
    layoutStyle: "banded",
    pageType: "HUMANAS",
    tokens: ["3seriebc", "humanas", "portugues", "historia", "geografia", "sociologia", "filosofia"],
  },
  {
    aliases: ["3 de humanas", "3 serie de humanas", "humanas 3de"],
    blocks: [
      { questionCount: 14, searchWindow: rect(0.04, 0.17, 0.44, 0.40), title: "PORTUGUES" },
      { questionCount: 10, searchWindow: rect(0.04, 0.58, 0.44, 0.31), title: "HISTORIA" },
      { questionCount: 6, searchWindow: rect(0.53, 0.17, 0.43, 0.28), title: "EDUCACAO FISICA" },
      { questionCount: 6, searchWindow: rect(0.53, 0.46, 0.43, 0.29), title: "INGLES" },
    ],
    displayName: "3ª Série DE Humanas",
    id: "HUMANAS_3DE",
    layoutStyle: "banded",
    pageType: "HUMANAS",
    tokens: ["3seriede", "humanas", "portugues", "historia", "educacaofisica", "ingles"],
  },
  {
    aliases: ["3 bc exatas", "3 serie bc exatas", "exatas 3bc"],
    blocks: [
      { questionCount: 14, searchWindow: rect(0.03, 0.16, 0.44, 0.42), title: "MATEMATICA" },
      { questionCount: 12, searchWindow: rect(0.03, 0.61, 0.44, 0.35), title: "FISICA" },
      { questionCount: 8, searchWindow: rect(0.52, 0.16, 0.44, 0.28), title: "ATUALIDADES" },
      { questionCount: 6, searchWindow: rect(0.52, 0.47, 0.44, 0.20), title: "EDUCACAO FISICA" },
      { questionCount: 6, searchWindow: rect(0.52, 0.70, 0.44, 0.20), title: "INGLES" },
    ],
    displayName: "3ª Série BC Exatas",
    id: "EXATAS_3BC",
    layoutStyle: "banded",
    pageType: "EXATAS",
    tokens: ["3seriebc", "exatas", "matematica", "fisica", "atualidades", "ingles"],
  },
  {
    aliases: ["2 c exatas", "2 serie c exatas", "exatas 2c"],
    blocks: [
      { questionCount: 10, searchWindow: rect(0.03, 0.16, 0.45, 0.28), title: "MATEMATICA" },
      { questionCount: 10, searchWindow: rect(0.03, 0.46, 0.45, 0.27), title: "FISICA" },
      { questionCount: 10, searchWindow: rect(0.03, 0.75, 0.45, 0.22), title: "BIOLOGIA" },
      { questionCount: 10, searchWindow: rect(0.52, 0.16, 0.45, 0.28), title: "QUIMICA" },
      { questionCount: 5, searchWindow: rect(0.52, 0.46, 0.45, 0.15), title: "EDUCACAO FISICA" },
      { questionCount: 5, searchWindow: rect(0.52, 0.63, 0.45, 0.15), title: "EDUCACAO FINANCEIRA" },
      { questionCount: 5, searchWindow: rect(0.52, 0.81, 0.45, 0.15), title: "EMPREENDEDORISMO" },
    ],
    displayName: "2ª Série C Exatas",
    id: "EXATAS_2C",
    layoutStyle: "banded",
    pageType: "EXATAS",
    tokens: ["2seriec", "exatas", "matematica", "quimica", "biologia", "empreendedorismo"],
  },
  {
    aliases: ["2 abd exatas", "2 serie abd exatas", "exatas 2abd"],
    blocks: [
      { questionCount: 10, searchWindow: rect(0.03, 0.14, 0.45, 0.29), title: "MATEMATICA" },
      { questionCount: 10, searchWindow: rect(0.03, 0.46, 0.45, 0.27), title: "BIOLOGIA" },
      { questionCount: 10, searchWindow: rect(0.03, 0.75, 0.45, 0.21), title: "FISICA" },
      { questionCount: 10, searchWindow: rect(0.52, 0.14, 0.45, 0.33), title: "QUIMICA" },
      { questionCount: 5, searchWindow: rect(0.52, 0.50, 0.45, 0.17), title: "EDUCACAO FISICA" },
      { questionCount: 5, searchWindow: rect(0.52, 0.70, 0.45, 0.17), title: "EDUCACAO FINANCEIRA" },
    ],
    displayName: "2ª Série ABD Exatas",
    id: "EXATAS_2ABD",
    layoutStyle: "banded",
    pageType: "EXATAS",
    tokens: ["2serieabd", "exatas", "matematica", "quimica", "biologia", "educacaofinanceira"],
  },
  {
    aliases: ["3 de exatas", "3 serie de exatas", "exatas 3de"],
    blocks: [
      { questionCount: 14, searchWindow: rect(0.04, 0.16, 0.43, 0.40), title: "MATEMATICA" },
      { questionCount: 10, searchWindow: rect(0.04, 0.58, 0.43, 0.28), title: "BIOLOGIA" },
      { questionCount: 10, searchWindow: rect(0.52, 0.16, 0.43, 0.28), title: "FISICA" },
      { questionCount: 10, searchWindow: rect(0.52, 0.46, 0.43, 0.28), title: "QUIMICA" },
      { questionCount: 6, searchWindow: rect(0.52, 0.77, 0.43, 0.16), title: "EMPREENDEDORISMO" },
    ],
    displayName: "3ª Série DE Exatas",
    id: "EXATAS_3DE",
    layoutStyle: "banded",
    pageType: "EXATAS",
    tokens: ["3seriede", "exatas", "matematica", "biologia", "quimica", "empreendedorismo"],
  },
];

export function findAnswerSheetModelById(templateId?: string | null) {
  if (!templateId) {
    return null;
  }

  const normalized = normalizeTemplateToken(templateId);
  return (
    ANSWER_SHEET_MODELS.find((model) => normalizeTemplateToken(model.id) === normalized) ??
    ANSWER_SHEET_MODELS.find((model) => model.aliases.some((alias) => normalizeTemplateToken(alias) === normalized)) ??
    null
  );
}

export function getAnswerSheetQuestionCount(model: AnswerSheetModel) {
  return model.blocks.reduce((total, block) => total + block.questionCount, 0);
}

export function normalizeTemplateToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}
