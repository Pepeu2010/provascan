import { ANSWER_SHEET_TEMPLATE, getQuestionLayout } from "@/services/answer-sheet-template";
import { createFanucchiAnswerSheetCard, fanucchiAnswerSheetPrintCss } from "@/lib/fanucchi-answer-sheet-document";
import { defaultExamPrintOptions, type ExamPrintOptions } from "@/lib/exam-print-options";
import type { TeacherExam } from "@/types/teacher-exams";

export type { AnswerSheetArea, AnswerSheetModel, ExamPrintOptions, PrintAlternativeLayout, PrintSize, PrintTemplate, PrintTypeface } from "@/lib/exam-print-options";
export type ExamPrintKind = "prova" | "cartao" | "gabarito";
export type ExamPrintStudent = { id: string; name: string; className: string };
export { defaultExamPrintOptions } from "@/lib/exam-print-options";

const answerLabels = ["A", "B", "C", "D", "E"];

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function formatDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("pt-BR").format(date);
}

export function getAnswerSheetLabels() {
  return answerLabels;
}

function printTokens(options: ExamPrintOptions) {
  const accent = options.template === "classico" ? "#7c2d12" : options.template === "compacto" ? "#0f766e" : options.template === "simulado" ? "#1d4ed8" : options.template === "recuperacao" ? "#c2410c" : options.template === "atividade" ? "#15803d" : "#4338ca";
  const font = options.typeface === "serifada" ? "Georgia, 'Times New Roman', serif" : options.typeface === "didatica" ? "Verdana, Arial, sans-serif" : "Arial, Helvetica, sans-serif";
  const scale = options.size === "compacta" ? 0.9 : options.size === "ampliada" ? 1.13 : 1;
  return `--print-accent:${accent};--print-font:${font};--print-scale:${scale};`;
}

function createExamSheet(exam: TeacherExam, options: ExamPrintOptions) {
  const details = [exam.subject, exam.audienceLabel, formatDate(exam.examDate)].filter(Boolean).map(escapeHtml).join(" · ");
  const questions = exam.questions.map((question, index) => {
    const alternatives = question.alternatives.filter((item) => item.trim());
    const answerOptions = alternatives.length
      ? `<div class="exam-print__alternatives exam-print__alternatives--${options.alternativeLayout}"${options.alternativeLayout === "duas_colunas" ? " style=\"grid-template-columns:repeat(2,minmax(0,1fr));column-gap:18px\"" : ""}>${alternatives.map((alternative, alternativeIndex) => `<p><b>${answerLabels[alternativeIndex] ?? String.fromCharCode(65 + alternativeIndex)})</b>${escapeHtml(alternative)}</p>`).join("")}</div>`
      : `<div class="exam-print__writing" aria-label="Espaço para resposta"></div>`;
    return `<li><div class="exam-print__question-number">${index + 1}</div><div><p class="exam-print__prompt">${escapeHtml(question.prompt || "Questão sem enunciado").replaceAll("\n", "<br>")}</p>${answerOptions}</div></li>`;
  }).join("");
  return `<main class="exam-print exam-print--${options.template}" style="${printTokens(options)}"><header class="exam-print__header"><div><span class="exam-print__brand">PROVASCAN</span><h1>${escapeHtml(exam.title || "Prova")}</h1>${details ? `<p>${details}</p>` : ""}</div><span class="exam-print__count">${exam.questions.length} ${exam.questions.length === 1 ? "questão" : "questões"}</span></header><section class="exam-print__student"><span>Aluno(a):</span><i></i><span>Turma:</span><i></i></section>${exam.instructions.trim() ? `<aside class="exam-print__instructions"><strong>Instruções</strong><p>${escapeHtml(exam.instructions).replaceAll("\n", "<br>")}</p></aside>` : ""}<ol class="exam-print__questions">${questions}</ol></main>`;
}

function createAnswerSheet(exam: TeacherExam, options: ExamPrintOptions, student?: ExamPrintStudent) {
  if (options.answerSheetModel === "fanucchi") {
    // The base card never exposes student data: the QR is issued on a
    // separate individual label and validated by the backend before OMR.
    return createFanucchiAnswerSheetCard({ area: resolveFanucchiArea(exam, options), questionCount: exam.questions.length });
  }
  const labels = getAnswerSheetLabels();
  const layout = getQuestionLayout(exam.questions.length, labels);
  const questionGrid = `${Math.round(layout.numberColumnWidth)}px repeat(${labels.length}, 1fr)`;
  const legends = Array.from({ length: layout.columnCount }, (_, columnIndex) => `<div class="answer-card__legend" style="left:${Math.round(columnIndex * (layout.columnWidth + layout.columnGap))}px;width:${Math.round(layout.columnWidth)}px;grid-template-columns:${questionGrid};"><span>Q</span>${labels.map((label) => `<span>${label}</span>`).join("")}</div>`).join("");
  const rows = exam.questions.map((_, index) => {
    const columnIndex = Math.floor(index / layout.rowsPerColumn);
    const rowIndex = index % layout.rowsPerColumn;
    return `<div class="answer-card__question" style="left:${Math.round(columnIndex * (layout.columnWidth + layout.columnGap))}px;top:${Math.round(layout.rowHeight * rowIndex)}px;width:${Math.round(layout.columnWidth)}px;height:${Math.round(layout.rowHeight)}px;grid-template-columns:${questionGrid};--bubble-size:${Math.max(14, Math.round(layout.bubbleRadius * 2))}px;"><strong>${index + 1}</strong>${labels.map((label) => `<span class="answer-card__bubble" aria-label="Alternativa ${label}"></span>`).join("")}</div>`;
  }).join("");
  const details = [exam.subject, exam.audienceLabel, formatDate(exam.examDate)].filter(Boolean).map(escapeHtml).join(" · ");
  const studentLine = student
    ? `<div><span>Aluno(a):</span><b>${escapeHtml(student.name)}</b><span>Turma:</span><b>${escapeHtml(student.className)}</b></div>`
    : `<div><span>Aluno(a):</span><i></i><span>Turma:</span><i></i></div>`;
  return `<main class="answer-card answer-card--${options.template}${student ? " answer-card--identified" : ""}" style="${printTokens(options)}"><header class="answer-card__header"><span class="answer-card__brand">PROVASCAN · CARTÃO-RESPOSTA</span><h1>${escapeHtml(exam.title || "Prova")}</h1>${details ? `<p>${details}</p>` : ""}${studentLine}</header><p class="answer-card__instruction">Marque uma única alternativa por questão.</p><div class="answer-card__caption">RESPOSTAS <span>Preencha completamente a bolha escolhida.</span></div><section class="answer-card__grid">${legends}${rows}</section><footer>Cartão de leitura ProvaScan · use caneta azul ou preta e não dobre esta folha.</footer></main>`;
}

function resolveFanucchiArea(exam: TeacherExam, options: ExamPrintOptions) {
  if (options.answerSheetArea !== "automatica") return options.answerSheetArea;
  return exam.groupType.trim().toUpperCase() === "EXATAS" ? "EXATAS" : "HUMANAS";
}

function answerLetter(question: TeacherExam["questions"][number]) {
  if (question.annulled) return "ANULADA";
  const answer = question.correctAnswers[0] ?? "";
  const index = question.alternatives.findIndex((alternative) => alternative === answer);
  return index >= 0 ? answerLabels[index] ?? String.fromCharCode(65 + index) : answer ? "REVISAR" : "PENDENTE";
}

function createOfficialAnswerKey(exam: TeacherExam, options: ExamPrintOptions) {
  const answers = exam.questions.map((question, index) => `<li><strong>${index + 1}</strong><span>${escapeHtml(answerLetter(question))}</span></li>`).join("");
  const details = [exam.subject, exam.audienceLabel, formatDate(exam.examDate)].filter(Boolean).map(escapeHtml).join(" · ");
  return `<main class="official-key" style="${printTokens(options)}"><header><div><span>PROVASCAN · GABARITO OFICIAL</span><h1>${escapeHtml(exam.title || "Prova")}</h1>${details ? `<p>${details}</p>` : ""}</div><small>${exam.questions.length} questões</small></header><aside><strong>Uso da equipe</strong><p>Este material mostra somente o número e a resposta correta de cada questão.</p></aside><ol>${answers}</ol></main>`;
}

function printHtml(title: string, content: string) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>@page{size:A4 portrait;margin:0}*{box-sizing:border-box}body{margin:0;background:#eef1f5;color:#172033;-webkit-print-color-adjust:exact;print-color-adjust:exact}.exam-print{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:17mm;font-family:var(--print-font);font-size:calc(13px * var(--print-scale));line-height:1.58}.exam-print--classico{border-top:7px solid var(--print-accent)}.exam-print--compacto{padding:13mm;font-size:calc(12px * var(--print-scale))}.exam-print--simulado{border:1.5mm solid var(--print-accent);padding:15.5mm}.exam-print--simulado .exam-print__header{border-bottom:3px solid var(--print-accent)}.exam-print--simulado .exam-print__question-number{border-radius:0;background:var(--print-accent);color:#fff}.exam-print--recuperacao{padding:19mm}.exam-print--recuperacao .exam-print__header{border:1px solid var(--print-accent);padding:12px}.exam-print--recuperacao .exam-print__instructions{border-left:5px solid var(--print-accent);background:#fff7ed}.exam-print--atividade{padding:14mm}.exam-print--atividade .exam-print__header{border-bottom:2px dashed var(--print-accent)}.exam-print--atividade .exam-print__question-number{border-radius:999px}.exam-print__header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;border-bottom:1px solid #cbd5e1;padding-bottom:12px}.exam-print__brand,.answer-card__brand{color:var(--print-accent);font-size:10px;font-weight:800;letter-spacing:.14em}.exam-print h1{max-width:145mm;margin:6px 0 4px;font-size:calc(25px * var(--print-scale));letter-spacing:-.035em;line-height:1.12}.exam-print__header p{margin:0;color:#526070;font-size:.88em}.exam-print__count{flex:0 0 auto;border:1px solid #cbd5e1;border-radius:999px;padding:5px 9px;color:#526070;font-size:10px;font-weight:700}.exam-print__student{display:grid;grid-template-columns:auto 1fr auto 75px;gap:8px;align-items:end;margin:18px 0 14px;font-weight:700}.exam-print__student i{height:20px;border-bottom:1px solid #718096}.exam-print__instructions{margin:0 0 18px;border:1px solid #cbd5e1;border-radius:7px;background:#f8fafc;padding:11px 13px}.exam-print__instructions strong{color:var(--print-accent);font-size:.88em}.exam-print__instructions p{margin:4px 0 0}.exam-print__questions{display:grid;gap:16px;margin:0;padding:0;list-style:none}.exam-print__questions li{display:grid;grid-template-columns:30px minmax(0,1fr);gap:10px;break-inside:avoid}.exam-print__question-number{display:grid;width:26px;height:26px;place-items:center;border:1px solid color-mix(in srgb,var(--print-accent) 34%,#cbd5e1);border-radius:6px;color:var(--print-accent);font-size:.9em;font-weight:800}.exam-print__prompt{margin:0;color:#172033;font-size:calc(14px * var(--print-scale));line-height:1.58}.exam-print__alternatives{display:grid;gap:4px;margin-top:7px;color:#425166;font-size:.92em}.exam-print__alternatives p{margin:0}.exam-print__alternatives b{display:inline-block;width:24px;color:var(--print-accent)}.exam-print__writing{height:34mm;margin-top:9px;background:repeating-linear-gradient(to bottom,transparent 0 8mm,#cbd5e1 8.1mm 8.3mm)}.answer-card{position:relative;width:${ANSWER_SHEET_TEMPLATE.page.width}px;height:${ANSWER_SHEET_TEMPLATE.page.height}px;margin:0 auto;overflow:hidden;border:2px solid #172033;background:#fff;color:#172033;font-family:var(--print-font)}.answer-card--classico,.answer-card--simulado{border-top:6px solid var(--print-accent)}.answer-card__header{height:${Math.round(ANSWER_SHEET_TEMPLATE.answerArea.y * ANSWER_SHEET_TEMPLATE.page.height - 56)}px;padding:29px 30px 12px;border-bottom:1px solid #98a2b3}.answer-card__header h1{max-width:540px;margin:7px 0 4px;font-size:25px;letter-spacing:-.035em;line-height:1.08}.answer-card__header p{margin:0;color:#475467;font-size:11px}.answer-card__header div{display:grid;grid-template-columns:auto 1fr auto 112px;gap:7px;align-items:end;margin-top:18px;font-size:11px;font-weight:700}.answer-card__header i{height:16px;border-bottom:1px solid #98a2b3}.answer-card__header b{min-height:16px;overflow:hidden;border-bottom:1px solid #98a2b3;text-overflow:ellipsis;white-space:nowrap}.answer-card__instruction{position:absolute;top:${Math.round(ANSWER_SHEET_TEMPLATE.answerArea.y * ANSWER_SHEET_TEMPLATE.page.height - 58)}px;left:30px;right:30px;margin:0;color:#475467;font-size:10px;text-align:center}.answer-card__caption{position:absolute;top:${Math.round(ANSWER_SHEET_TEMPLATE.answerArea.y * ANSWER_SHEET_TEMPLATE.page.height - 36)}px;left:${Math.round(ANSWER_SHEET_TEMPLATE.answerArea.x * ANSWER_SHEET_TEMPLATE.page.width)}px;color:#172033;font-size:11px;font-weight:800;letter-spacing:.06em}.answer-card__caption span{margin-left:7px;color:#475467;font-size:9px;font-weight:600;letter-spacing:0}.answer-card__grid{position:absolute;left:${Math.round(ANSWER_SHEET_TEMPLATE.answerArea.x * ANSWER_SHEET_TEMPLATE.page.width)}px;top:${Math.round(ANSWER_SHEET_TEMPLATE.answerArea.y * ANSWER_SHEET_TEMPLATE.page.height)}px;width:${Math.round(ANSWER_SHEET_TEMPLATE.answerArea.width * ANSWER_SHEET_TEMPLATE.page.width)}px;height:${Math.round(ANSWER_SHEET_TEMPLATE.answerArea.height * ANSWER_SHEET_TEMPLATE.page.height)}px}.answer-card__legend{position:absolute;top:-19px;display:grid;align-items:center;color:#475467;font-size:9px;font-weight:800;letter-spacing:.05em;text-align:center}.answer-card__legend span:first-child{text-align:left}.answer-card__question{position:absolute;display:grid;align-items:center;border-bottom:1px solid #e2e8f0}.answer-card__question strong{font-size:13px}.answer-card__bubble{display:block;justify-self:center;width:var(--bubble-size);height:var(--bubble-size);border:1.7px solid #172033;border-radius:50%}.answer-card footer{position:absolute;right:30px;bottom:28px;left:30px;border-top:1px solid #98a2b3;padding-top:9px;color:#475467;font-size:8px;text-align:center}.official-key{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:18mm;font-family:var(--print-font)}.official-key header{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid var(--print-accent);padding-bottom:12px}.official-key header span{color:var(--print-accent);font-size:10px;font-weight:800;letter-spacing:.14em}.official-key h1{margin:6px 0 4px;font-size:27px;letter-spacing:-.035em}.official-key header p,.official-key header small{margin:0;color:#526070;font-size:12px}.official-key aside{margin:18px 0;border:1px solid #dbe2ea;border-radius:8px;background:#f8fafc;padding:12px}.official-key aside strong{color:var(--print-accent)}.official-key aside p{margin:4px 0 0;font-size:12px}.official-key ol{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:0;padding:0;list-style:none}.official-key li{display:flex;align-items:center;justify-content:space-between;border:1px solid #cbd5e1;border-radius:7px;padding:9px 10px;font-size:13px}.official-key li span{color:var(--print-accent);font-weight:800}@media print{body{background:#fff}.exam-print,.answer-card,.official-key{margin:0}.answer-card--batch{break-after:page;page-break-after:always}.answer-card--batch:last-child{break-after:auto;page-break-after:auto}}</style></head><body>${content}<script>window.addEventListener('load',()=>requestAnimationFrame(()=>window.print()),{once:true})</script></body></html>`;
}

export function createExamPrintDocument(exam: TeacherExam, kind: ExamPrintKind, options: ExamPrintOptions = defaultExamPrintOptions) {
  const card = kind === "cartao" ? createAnswerSheet(exam, options) : null;
  const content = card && options.answerSheetModel === "fanucchi" ? `<style>${fanucchiAnswerSheetPrintCss}</style>${card}` : card ?? (kind === "gabarito" ? createOfficialAnswerKey(exam, options) : createExamSheet(exam, options));
  const label = kind === "cartao" ? "Cartão-resposta" : kind === "gabarito" ? "Gabarito oficial" : "Prova";
  return printHtml(`${label} — ${exam.title || "Prova"}`, content);
}

export function createStudentCardsPrintDocument(exam: TeacherExam, students: ExamPrintStudent[], options: ExamPrintOptions = defaultExamPrintOptions) {
  const cards = students.map((student) => {
    const card = createAnswerSheet(exam, options, student);
    return options.answerSheetModel === "fanucchi" ? card.replace("fanucchi-card fanucchi-card--", "fanucchi-card fanucchi-card--batch fanucchi-card--") : card.replace("answer-card--", "answer-card--batch answer-card--");
  }).join("");
  const content = options.answerSheetModel === "fanucchi" ? `<style>${fanucchiAnswerSheetPrintCss}</style>${cards}` : cards;
  return printHtml(`Cartões-resposta — ${exam.title || "Prova"}`, content);
}
