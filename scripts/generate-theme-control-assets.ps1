param(
  [switch]$Force,
  [switch]$ForceNewSlots,
  [switch]$ForceBrightControls,
  [switch]$ForceCloseButtons,
  [switch]$ForceIconButtons,
  [switch]$ForceTabs,
  [switch]$ForceReselectButtons
)

Add-Type -AssemblyName System.Drawing

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$themeRoot = Join-Path $repoRoot 'assets\themes'
$sourcePath = Join-Path $repoRoot 'assets\generated-ui\theme-control-surfaces-source-v1.png'
$source = [System.Drawing.Image]::FromFile($sourcePath)

function Get-ThemeColor([string]$hex) {
  return [System.Drawing.ColorTranslator]::FromHtml($hex)
}

function New-RoundedPath([System.Drawing.RectangleF]$rect, [float]$radius) {
  $diameter = $radius * 2
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc($rect.X, $rect.Y, $diameter, $diameter, 180, 90)
  $path.AddArc($rect.Right - $diameter, $rect.Y, $diameter, $diameter, 270, 90)
  $path.AddArc($rect.Right - $diameter, $rect.Bottom - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($rect.X, $rect.Bottom - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function Draw-TintedCrop(
  [System.Drawing.Graphics]$graphics,
  [System.Drawing.Image]$image,
  [System.Drawing.Rectangle]$sourceRect,
  [System.Drawing.RectangleF]$targetRect,
  [System.Drawing.Color]$accent,
  [switch]$FillTarget,
  [single]$Brightness = 0.68,
  [single]$AccentMix = 0.32
) {
  $matrix = New-Object System.Drawing.Imaging.ColorMatrix
  $matrix.Matrix00 = $Brightness
  $matrix.Matrix11 = $Brightness
  $matrix.Matrix22 = $Brightness
  $matrix.Matrix03 = [single]($accent.R / 255.0 * $AccentMix)
  $matrix.Matrix13 = [single]($accent.G / 255.0 * $AccentMix)
  $matrix.Matrix23 = [single]($accent.B / 255.0 * $AccentMix)
  $attributes = New-Object System.Drawing.Imaging.ImageAttributes
  $attributes.SetColorMatrix($matrix)
  if ($FillTarget) {
    # The new controls are transparent cut-outs, so the authored shape must
    # occupy the same rectangle as the React Native control. Letterboxing the
    # source would recreate the undersized plaque seen in the picker.
    $destination = New-Object System.Drawing.Rectangle(
      [int]$targetRect.X,
      [int]$targetRect.Y,
      [int]$targetRect.Width,
      [int]$targetRect.Height
    )
  } else {
    $scale = [Math]::Min($targetRect.Width / $sourceRect.Width, $targetRect.Height / $sourceRect.Height)
    $width = [single]($sourceRect.Width * $scale)
    $height = [single]($sourceRect.Height * $scale)
    $destination = New-Object System.Drawing.Rectangle(
      [int]($targetRect.X + (($targetRect.Width - $width) / 2)),
      [int]($targetRect.Y + (($targetRect.Height - $height) / 2)),
      [int]$width,
      [int]$height
    )
  }
  $graphics.DrawImage($image, $destination, $sourceRect.X, $sourceRect.Y, $sourceRect.Width, $sourceRect.Height, [System.Drawing.GraphicsUnit]::Pixel, $attributes)
  $attributes.Dispose()
}

function Draw-ThemeMark([System.Drawing.Graphics]$graphics, [string]$mark, [System.Drawing.Color]$accent, [int]$width, [int]$height, [int]$style) {
  $fontSize = [single]([Math]::Max(16, [Math]::Min($width, $height) * 0.08))
  $font = New-Object System.Drawing.Font('Segoe UI Symbol', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(115, $accent))
  $x = [single]($width * (0.72 + (($style % 2) * 0.07)))
  $y = [single]($height * 0.10)
  $graphics.DrawString($mark, $font, $brush, $x, $y)
  $brush.Dispose()
  $font.Dispose()
}

function Draw-SoftPortrait(
  [System.Drawing.Graphics]$graphics,
  [System.Drawing.Image]$image,
  [System.Drawing.RectangleF]$targetRect,
  [single]$opacity
) {
  $scale = [Math]::Min($targetRect.Width / $image.Width, $targetRect.Height / $image.Height)
  $width = [single]($image.Width * $scale)
  $height = [single]($image.Height * $scale)
  $destination = New-Object System.Drawing.Rectangle(
    [int]($targetRect.X + (($targetRect.Width - $width) / 2)),
    [int]($targetRect.Y + (($targetRect.Height - $height) / 2)),
    [int]$width,
    [int]$height
  )
  $matrix = New-Object System.Drawing.Imaging.ColorMatrix
  $matrix.Matrix33 = $opacity
  $attributes = New-Object System.Drawing.Imaging.ImageAttributes
  $attributes.SetColorMatrix($matrix)
  $graphics.DrawImage(
    $image,
    $destination,
    0,
    0,
    $image.Width,
    $image.Height,
    [System.Drawing.GraphicsUnit]::Pixel,
    $attributes
  )
  $attributes.Dispose()
}

function Draw-ThemeEmblem(
  [System.Drawing.Graphics]$graphics,
  [System.Drawing.Color]$accent,
  [System.Drawing.Color]$tint,
  [int]$width,
  [int]$height,
  [int]$style
) {
  # Abstract stitched dots and a small diamond keep the artwork decorative,
  # while avoiding any text-like glyph inside the app's text safe area.
  $centerX = [single]($width * 0.16)
  $centerY = [single]($height * 0.50)
  $radius = [single]([Math]::Max(10, [Math]::Min($width, $height) * 0.13))
  $outerPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(108, $accent), [single]([Math]::Max(2, $height * 0.018)))
  $outerPen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dot
  $graphics.DrawEllipse($outerPen, $centerX - $radius, $centerY - $radius, $radius * 2, $radius * 2)
  $outerPen.Dispose()
  $diamond = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diamondPoints = New-Object 'System.Drawing.PointF[]' 4
  $diamondPoints[0] = New-Object System.Drawing.PointF -ArgumentList @([single]$centerX, [single]($centerY - ($radius * 0.62)))
  $diamondPoints[1] = New-Object System.Drawing.PointF -ArgumentList @([single]($centerX + ($radius * 0.62)), [single]$centerY)
  $diamondPoints[2] = New-Object System.Drawing.PointF -ArgumentList @([single]$centerX, [single]($centerY + ($radius * 0.62)))
  $diamondPoints[3] = New-Object System.Drawing.PointF -ArgumentList @([single]($centerX - ($radius * 0.62)), [single]$centerY)
  $diamond.AddPolygon($diamondPoints)
  $diamondBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(88, $tint))
  $graphics.FillPath($diamondBrush, $diamond)
  $diamondBrush.Dispose()
  $diamond.Dispose()
  $dotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(132, $accent))
  for ($dot = 0; $dot -lt 4; $dot += 1) {
    $dotX = [single]($centerX + (($dot - 1.5) * $radius * 0.44))
    $dotY = [single]($centerY + (($style % 2) - 0.5) * $radius * 1.35)
    $dotSize = [single]([Math]::Max(3, $height * 0.022))
    $graphics.FillEllipse($dotBrush, $dotX - ($dotSize / 2), $dotY - ($dotSize / 2), $dotSize, $dotSize)
  }
  $dotBrush.Dispose()
}

$characters = @(
  @{ Id='mobirin'; Accent='#4C6172'; Motif='M'; Image='assets\mobies\joy\mobirin-joy.png' },
  @{ Id='mobichi'; Accent='#E36C91'; Motif='H'; Image='assets\mobies\joy\mobichi-joy.png' },
  @{ Id='yami'; Accent='#7B6A92'; Motif='Y'; Image='assets\mobies\joy\yami-joy.png' },
  @{ Id='mobiyan'; Accent='#2F6274'; Motif='Z'; Image='assets\mobies\joy\mobiyan-joy.png' },
  @{ Id='mobiyura'; Accent='#4D3B68'; Motif='S'; Image='assets\mobies\joy\mobiyura-joy.png' },
  @{ Id='reomoby'; Accent='#93445E'; Motif='R'; Image='assets\mobies\joy\reomoby-joy.png' },
  @{ Id='potemoby'; Accent='#9A724C'; Motif='P'; Image='assets\mobies\joy\potemoby-joy.png' },
  @{ Id='mobibou'; Accent='#C86A35'; Motif='B'; Image='assets\mobies\joy\mobibou-joy.png' },
  @{ Id='babumoby'; Accent='#D58A9B'; Motif='O'; Image='assets\mobies\joy\babumoby-joy.png' },
  @{ Id='magician'; Accent='#765A9E'; Motif='A'; Image='assets\enemies\magician.png' },
  @{ Id='informant'; Accent='#4B758D'; Motif='I'; Image='assets\enemies\informant.png' },
  @{ Id='tracker'; Accent='#65764C'; Motif='T'; Image='assets\enemies\tracker.png' },
  @{ Id='safecracker'; Accent='#9A6845'; Motif='C'; Image='assets\enemies\safecracker.png' },
  @{ Id='veiled-duchess'; Accent='#8D5578'; Motif='V'; Image='assets\enemies\veiled-duchess.png' },
  @{ Id='courier'; Accent='#8C6252'; Motif='U'; Image='assets\enemies\courier.png' },
  @{ Id='commander'; Accent='#535B75'; Motif='D'; Image='assets\enemies\commander.png' }
)

$styles = @(
  @{ Number=1; Tint='#D3B58D' },
  @{ Number=2; Tint='#8CC7C5' },
  @{ Number=3; Tint='#66537D' },
  @{ Number=4; Tint='#C85E6F' },
  @{ Number=5; Tint='#D5A64A' }
)

$slots = @(
  @{ Name='iconButton'; Width=240; Height=240; Source=(New-Object System.Drawing.Rectangle(20, 20, 550, 560)); Radius=120; Brightness=0.92; AccentMix=0.10 },
  @{ Name='tab'; Width=520; Height=170; Source=(New-Object System.Drawing.Rectangle(560, 100, 680, 430)); Radius=44 },
  @{ Name='closeButton'; Width=190; Height=190; Source=(New-Object System.Drawing.Rectangle(20, 650, 440, 520)); Radius=34 },
  @{ Name='reselectButton'; Width=720; Height=180; Source=(New-Object System.Drawing.Rectangle(560, 100, 680, 430)); Radius=54 },
  # New dress-up controls use text-safe cloth labels. The dimensions are
  # deliberately close to the consuming layouts' aspect ratios.
  # Use the same long stitched plaque for each horizontal control. The source
  # is cropped tightly and filled to the target, so no colored wash or blank
  # side margins can become a column behind the control text.
  @{ Name='dressUpButton'; Width=720; Height=320; Source=(New-Object System.Drawing.Rectangle(540, 159, 660, 328)); Radius=72; PortraitOpacity=0.12; Brightness=0.92; AccentMix=0.10 },
  @{ Name='themeActionLabel'; Width=720; Height=360; Source=(New-Object System.Drawing.Rectangle(540, 159, 660, 328)); Radius=64; PortraitOpacity=0.10; Brightness=0.92; AccentMix=0.10 },
  @{ Name='themeCharacterTab'; Width=552; Height=324; Source=(New-Object System.Drawing.Rectangle(540, 159, 660, 328)); Radius=54; PortraitOpacity=0.11; Brightness=0.92; AccentMix=0.10 },
  @{ Name='themeResetButton'; Width=720; Height=348; Source=(New-Object System.Drawing.Rectangle(540, 159, 660, 328)); Radius=62; PortraitOpacity=0.07; Brightness=0.92; AccentMix=0.10 }
)
$newSlotNames = @('dressUpButton', 'themeActionLabel', 'themeCharacterTab', 'themeResetButton')
$brightSlotNames = @('iconButton', 'dressUpButton', 'themeActionLabel', 'themeCharacterTab', 'themeResetButton')

foreach ($character in $characters) {
  $accent = Get-ThemeColor $character.Accent
  $characterImagePath = Join-Path $repoRoot $character.Image
  $characterImage = [System.Drawing.Image]::FromFile($characterImagePath)
  foreach ($style in $styles) {
    $styleRoot = Join-Path (Join-Path $themeRoot $character.Id) ([string]::Format('{0:D2}', $style.Number))
    New-Item -ItemType Directory -Force $styleRoot | Out-Null
    $tint = Get-ThemeColor $style.Tint
    foreach ($slot in $slots) {
      $isNewSlot = $slot.Name -in $newSlotNames
      $isBrightSlot = $slot.Name -in $brightSlotNames
      $brightness = if ($slot.ContainsKey('Brightness')) { [single]$slot.Brightness } else { [single]0.68 }
      $accentMix = if ($slot.ContainsKey('AccentMix')) { [single]$slot.AccentMix } else { [single]0.32 }
      $bitmap = New-Object System.Drawing.Bitmap($slot.Width, $slot.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      $graphics.Clear([System.Drawing.Color]::Transparent)
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $bounds = New-Object System.Drawing.RectangleF(0, 0, $slot.Width, $slot.Height)
      $clip = New-RoundedPath $bounds $slot.Radius
      $graphics.SetClip($clip)
      Draw-TintedCrop -graphics $graphics -image $source -sourceRect $slot.Source -targetRect $bounds -accent $accent -FillTarget:$isNewSlot -Brightness $brightness -AccentMix $accentMix
      # These controls already contain their own authored shapes. Do not add
      # a theme tint wash behind them; it becomes an unrelated colored outer
      # container around the artwork.
      if (-not $isNewSlot -and $slot.Name -notin @('iconButton', 'tab', 'closeButton', 'reselectButton')) {
        $wash = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(48, $tint))
        $graphics.FillRectangle($wash, $bounds)
        $wash.Dispose()
      }
      $graphics.ResetClip()
      $clip.Dispose()
      if ($slot.Name -in @('dressUpButton', 'themeActionLabel', 'themeCharacterTab', 'themeResetButton')) {
        $portraitWidth = [single]([Math]::Max(42, $slot.Width * 0.26))
        $portraitRect = New-Object System.Drawing.RectangleF(($slot.Width - $portraitWidth - ($slot.Width * 0.045)), ($slot.Height * 0.08), $portraitWidth, ($slot.Height * 0.84))
        Draw-SoftPortrait $graphics $characterImage $portraitRect ([single]$slot.PortraitOpacity)
        Draw-ThemeEmblem $graphics $accent $tint $slot.Width $slot.Height $style.Number
      } else {
        Draw-ThemeMark $graphics $character.Motif $accent $slot.Width $slot.Height $style.Number
      }
      $target = Join-Path $styleRoot ($slot.Name + '.png')
      if ($Force -or ($ForceNewSlots -and $isNewSlot) -or ($ForceBrightControls -and $isBrightSlot) -or ($ForceCloseButtons -and $slot.Name -eq 'closeButton') -or ($ForceIconButtons -and $slot.Name -eq 'iconButton') -or ($ForceTabs -and $slot.Name -eq 'tab') -or ($ForceReselectButtons -and $slot.Name -eq 'reselectButton') -or -not (Test-Path $target)) {
        $bitmap.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
      }
      $graphics.Dispose()
      $bitmap.Dispose()
    }
  }
  $characterImage.Dispose()
}
$source.Dispose()
Write-Output "Generated $($characters.Count * $styles.Count * $slots.Count) themed control assets under $themeRoot"
