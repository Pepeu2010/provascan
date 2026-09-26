export function getPrintPreflight(input: { paperSize: string; scalePercent: number }) {
  const warnings: string[] = [];
  if (input.paperSize.toUpperCase() !== "A4") warnings.push("Selecione papel A4 na janela da impressora.");
  if (input.scalePercent !== 100) warnings.push("Use escala 100% e desative “Ajustar à página”.");
  return { ready: warnings.length === 0, warnings };
}

export function buildCalibrationSheetHtml() {
  return `<main style="box-sizing:border-box;width:210mm;min-height:297mm;padding:20mm;font-family:Arial,sans-serif;color:#101828;background:#fff">
    <h1 style="font-size:22pt;margin:0 0 6mm">Calibração de impressão ProvaScan</h1>
    <ol style="font-size:12pt;line-height:1.6;padding-left:6mm">
      <li>Escolha papel <strong>A4</strong>.</li>
      <li>Use escala <strong>100%</strong>.</li>
      <li>Não marque “Ajustar à página” ou “Encolher páginas grandes”.</li>
      <li>Depois de imprimir, confira o quadrado abaixo com uma régua.</li>
    </ol>
    <div style="box-sizing:border-box;width:100mm;height:100mm;border:1mm solid #101828;margin-top:12mm;display:grid;place-items:center;font-size:14pt;font-weight:700">100mm × 100mm</div>
    <p style="margin-top:8mm;font-size:11pt">Se qualquer lado não medir exatamente 10 cm, corrija a escala antes de imprimir os cartões-resposta.</p>
  </main>`;
}

export function buildPrintInstructionSheetHtml() {
  return `<main style="box-sizing:border-box;width:210mm;min-height:297mm;padding:22mm;font-family:Arial,sans-serif;color:#101828;background:#fff">
    <h1 style="font-size:22pt">Como imprimir e aplicar os cartões</h1>
    <ol style="font-size:13pt;line-height:1.8;padding-left:7mm"><li>Na impressão: papel A4, escala 100% e sem ajustar à página.</li><li>Não corte as bordas nem plastifique a folha.</li><li>Peça ao aluno para preencher uma única bolha por questão com caneta escura.</li><li>Para fotografar: folha inteira, câmera paralela, boa luz e sem sombra.</li></ol>
    <p style="margin-top:12mm;border:1px solid #98a2b3;padding:6mm;font-size:12pt"><strong>Antes de imprimir a turma toda:</strong> imprima a folha de calibração e meça o quadrado com uma régua.</p>
  </main>`;
}
