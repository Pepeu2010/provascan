param(
  [ValidateRange(1, 60)]
  [int]$QuestionCount = 45
)

Add-Type -AssemblyName System.Drawing

$outputDirectory = Join-Path $PSScriptRoot "..\fixtures\ocr"
$outputPath = Join-Path $outputDirectory ("ps-card-2-{0}q-test.png" -f $QuestionCount)
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

$width = 794
$height = 1123
$answerPattern = @("A", "C", "E", "B", "D")
$answers = @(for ($index = 0; $index -lt $QuestionCount; $index += 1) { $answerPattern[$index % $answerPattern.Count] })
$alternatives = @("A", "B", "C", "D", "E")

$bitmap = New-Object System.Drawing.Bitmap($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.Color]::White)

$ink = [System.Drawing.Color]::FromArgb(19, 31, 49)
$muted = [System.Drawing.Color]::FromArgb(86, 101, 115)
$accent = [System.Drawing.Color]::FromArgb(33, 86, 161)
$titleFont = New-Object System.Drawing.Font("Arial", 24, [System.Drawing.FontStyle]::Bold)
$subtitleFont = New-Object System.Drawing.Font("Arial", 12)
$questionFont = New-Object System.Drawing.Font("Arial", 15, [System.Drawing.FontStyle]::Bold)
$optionFont = New-Object System.Drawing.Font("Arial", 11, [System.Drawing.FontStyle]::Bold)
$inkBrush = New-Object System.Drawing.SolidBrush($ink)
$mutedBrush = New-Object System.Drawing.SolidBrush($muted)
$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$borderPen = New-Object System.Drawing.Pen($ink, 2)
$lightPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(207, 216, 224), 1)
$accentPen = New-Object System.Drawing.Pen($accent, 2)

$graphics.DrawString("ProvaScan", $titleFont, $inkBrush, 88, 72)
$graphics.DrawString("CARTAO-RESPOSTA DE TESTE", $subtitleFont, $mutedBrush, 90, 110)
$graphics.DrawString(("PS-CARD-2  |  {0} QUESTOES  |  A-E" -f $QuestionCount), $subtitleFont, $mutedBrush, 90, 136)
$graphics.DrawRectangle($accentPen, 88, 180, 618, 86)
$graphics.DrawString("Teste controlado de OCR", $questionFont, $inkBrush, 112, 202)
$graphics.DrawString(("Padrao esperado: A, C, E, B, D repetido {0} vezes" -f [Math]::Ceiling($QuestionCount / 5)), $subtitleFont, $mutedBrush, 112, 232)

$areaX = 0.11 * $width
$areaY = 0.31 * $height
$areaWidth = 0.78 * $width
$areaHeight = 0.5 * $height
$columnCount = [Math]::Min(3, [Math]::Max(1, [Math]::Ceiling($answers.Count / 15)))
$columnGap = if ($columnCount -gt 1) { 20 } else { 0 }
$columnWidth = ($areaWidth - $columnGap * ($columnCount - 1)) / $columnCount
$rowsPerColumn = [Math]::Ceiling($answers.Count / $columnCount)
$rowHeight = $areaHeight / $rowsPerColumn
$numberWidth = [Math]::Max(32, [Math]::Min(54, $columnWidth * 0.18))
$trackWidth = $columnWidth - $numberWidth - 12
$bubbleGap = $trackWidth / $alternatives.Count
$radius = [Math]::Min(15, [Math]::Min($rowHeight * 0.26, $bubbleGap * 0.24))

$graphics.DrawRectangle($borderPen, [int]$areaX, [int]$areaY, [int]$areaWidth, [int]$areaHeight)
for ($index = 0; $index -lt $answers.Count; $index += 1) {
  $columnIndex = [Math]::Floor($index / $rowsPerColumn)
  $rowIndex = $index % $rowsPerColumn
  $columnLeft = $areaX + $columnIndex * ($columnWidth + $columnGap)
  $cy = $areaY + $rowHeight * $rowIndex + $rowHeight / 2
  if ($rowIndex -gt 0) {
    $graphics.DrawLine($lightPen, $columnLeft, $areaY + $rowHeight * $rowIndex, $columnLeft + $columnWidth, $areaY + $rowHeight * $rowIndex)
  }
  $graphics.DrawString(('{0:00}' -f ($index + 1)), $questionFont, $inkBrush, $columnLeft + 4, $cy - 11)
  for ($alternativeIndex = 0; $alternativeIndex -lt $alternatives.Count; $alternativeIndex += 1) {
    $cx = $columnLeft + $numberWidth + $bubbleGap * $alternativeIndex + $bubbleGap / 2
    $left = $cx - $radius
    $top = $cy - $radius
    if ($alternatives[$alternativeIndex] -eq $answers[$index]) {
      $graphics.FillEllipse($inkBrush, $left, $top, $radius * 2, $radius * 2)
      $graphics.DrawString($alternatives[$alternativeIndex], $optionFont, $whiteBrush, $cx - 4, $cy - 7)
    } else {
      $graphics.DrawEllipse($borderPen, $left, $top, $radius * 2, $radius * 2)
      $graphics.DrawString($alternatives[$alternativeIndex], $optionFont, $inkBrush, $cx - 4, $cy - 7)
    }
  }
}

$graphics.DrawString("Imagem criada automaticamente para validar o leitor. Nao utilizar em prova real.", $subtitleFont, $mutedBrush, 90, 980)
$bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$bitmap.Dispose()
$titleFont.Dispose()
$subtitleFont.Dispose()
$questionFont.Dispose()
$optionFont.Dispose()
$inkBrush.Dispose()
$mutedBrush.Dispose()
$whiteBrush.Dispose()
$borderPen.Dispose()
$lightPen.Dispose()
$accentPen.Dispose()

Write-Output $outputPath
