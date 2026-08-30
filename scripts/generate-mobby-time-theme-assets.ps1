param()

Add-Type -AssemblyName System.Drawing

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$themeRoot = Join-Path $repoRoot 'assets\themes'
$registryPath = Join-Path $repoRoot 'src\data\gachaMobbyTimeThemeAssets.generated.ts'

function Get-ThemeColor([string]$hex) {
  return [System.Drawing.ColorTranslator]::FromHtml($hex)
}

function Draw-Cover([System.Drawing.Graphics]$graphics, [System.Drawing.Image]$image, [int]$width, [int]$height, [int]$alpha) {
  $scale = [Math]::Max($width / $image.Width, $height / $image.Height)
  $drawWidth = [int][Math]::Ceiling($image.Width * $scale)
  $drawHeight = [int][Math]::Ceiling($image.Height * $scale)
  $x = [int](($width - $drawWidth) / 2)
  $y = [int](($height - $drawHeight) / 2)
  $matrix = New-Object System.Drawing.Imaging.ColorMatrix
  $matrix.Matrix33 = [single]($alpha / 255.0)
  $attributes = New-Object System.Drawing.Imaging.ImageAttributes
  $attributes.SetColorMatrix($matrix)
  $graphics.DrawImage($image, (New-Object System.Drawing.Rectangle($x, $y, $drawWidth, $drawHeight)), 0, 0, $image.Width, $image.Height, [System.Drawing.GraphicsUnit]::Pixel, $attributes)
  $attributes.Dispose()
}

function Draw-Contain([System.Drawing.Graphics]$graphics, [System.Drawing.Image]$image, [int]$width, [int]$height, [double]$fraction, [int]$alpha) {
  $targetWidth = [int]($width * $fraction)
  $targetHeight = [int]($height * $fraction)
  $scale = [Math]::Min($targetWidth / $image.Width, $targetHeight / $image.Height)
  $drawWidth = [int][Math]::Max(1, [Math]::Round($image.Width * $scale))
  $drawHeight = [int][Math]::Max(1, [Math]::Round($image.Height * $scale))
  $x = [int](($width - $drawWidth) / 2)
  $y = [int](($height - $drawHeight) / 2)
  $matrix = New-Object System.Drawing.Imaging.ColorMatrix
  $matrix.Matrix33 = [single]($alpha / 255.0)
  $attributes = New-Object System.Drawing.Imaging.ImageAttributes
  $attributes.SetColorMatrix($matrix)
  $graphics.DrawImage($image, (New-Object System.Drawing.Rectangle($x, $y, $drawWidth, $drawHeight)), 0, 0, $image.Width, $image.Height, [System.Drawing.GraphicsUnit]::Pixel, $attributes)
  $attributes.Dispose()
}

$characters = @(
  @{ Id='mobirin'; Accent='#4C6172' }, @{ Id='mobichi'; Accent='#E36C91' }, @{ Id='yami'; Accent='#7B6A92' },
  @{ Id='mobiyan'; Accent='#2F6274' }, @{ Id='mobiyura'; Accent='#4D3B68' }, @{ Id='reomoby'; Accent='#93445E' },
  @{ Id='potemoby'; Accent='#9A724C' }, @{ Id='mobibou'; Accent='#C86A35' }, @{ Id='babumoby'; Accent='#D58A9B' },
  @{ Id='magician'; Accent='#765A9E' }, @{ Id='informant'; Accent='#4B758D' }, @{ Id='tracker'; Accent='#65764C' },
  @{ Id='safecracker'; Accent='#9A6845' }, @{ Id='veiled-duchess'; Accent='#8D5578' }, @{ Id='courier'; Accent='#8C6252' },
  @{ Id='commander'; Accent='#535B75' }
)

$slots = @(
  @{ Name='board'; Base='assets\backgrounds\mobby-time-board.png'; Alpha=38; MotifFraction=0.62 },
  @{ Name='timerPlaque'; Base='assets\mobby-time\timer-plaque.png'; Alpha=46; MotifFraction=0.74 },
  @{ Name='messagePlaque'; Base='assets\mobby-time\message-plaque.png'; Alpha=46; MotifFraction=0.70 },
  @{ Name='rewardSeal'; Base='assets\mobby-time\reward-seal.png'; Alpha=56; MotifFraction=0.74 }
)

$registry = @(
  "import type { ImageSourcePropType } from 'react-native';",
  '',
  "export type GeneratedMobbyTimeThemeAssetSlot = 'board' | 'timerPlaque' | 'messagePlaque' | 'rewardSeal';",
  "export type GeneratedMobbyTimeThemeAssetGroup = Readonly<Record<GeneratedMobbyTimeThemeAssetSlot, ImageSourcePropType>>;",
  '',
  '/** 16 characters x 5 styles x 4 MOBBY TIME-specific assets. */',
  'export const GENERATED_GACHA_MOBBY_TIME_THEME_ASSETS: Readonly<Record<string, GeneratedMobbyTimeThemeAssetGroup>> = {'
)

foreach ($character in $characters) {
  $accent = Get-ThemeColor $character.Accent
  foreach ($style in 1..5) {
    $styleRoot = Join-Path (Join-Path $themeRoot $character.Id) ('{0:D2}' -f $style)
    $outputRoot = Join-Path $styleRoot 'mobby-time'
    New-Item -ItemType Directory -Force $outputRoot | Out-Null
    $cardPath = Join-Path $styleRoot 'card.png'
    $cardImage = [System.Drawing.Image]::FromFile($cardPath)
    $registry += "  '$($character.Id):$style': {"
    foreach ($slot in $slots) {
      $basePath = Join-Path $repoRoot $slot.Base
      $baseImage = [System.Drawing.Image]::FromFile($basePath)
      $bitmap = New-Object System.Drawing.Bitmap($baseImage.Width, $baseImage.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.Clear([System.Drawing.Color]::Transparent)
      $graphics.DrawImage($baseImage, 0, 0, $baseImage.Width, $baseImage.Height)
      if ($slot.Name -eq 'board') {
        Draw-Cover $graphics $cardImage $baseImage.Width $baseImage.Height $slot.Alpha
      } else {
        Draw-Contain $graphics $cardImage $baseImage.Width $baseImage.Height $slot.MotifFraction $slot.Alpha
      }
      # The board is opaque, so a subtle accent band can safely span its
      # bounds. Plaques and the seal have transparent corners; do not paint
      # outside their silhouette or the theme color would leak into the page.
      if ($slot.Name -eq 'board') {
        $accentBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(34, $accent))
        $graphics.FillRectangle($accentBrush, 0, 0, $baseImage.Width, [int]($baseImage.Height * 0.07))
        $graphics.FillRectangle($accentBrush, 0, [int]($baseImage.Height * 0.93), $baseImage.Width, [int]($baseImage.Height * 0.07))
        $accentBrush.Dispose()
      }
      $outputPath = Join-Path $outputRoot ($slot.Name + '.png')
      $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
      $graphics.Dispose()
      $bitmap.Dispose()
      $baseImage.Dispose()
      $registry += "    $($slot.Name): require('../../assets/themes/$($character.Id)/$('{0:D2}' -f $style)/mobby-time/$($slot.Name).png'),"
    }
    $registry += '  },'
    $cardImage.Dispose()
  }
}

$registry += @(
  '};',
  '',
  'export function getGeneratedGachaMobbyTimeThemeAssets(characterId: string, styleNumber: number): GeneratedMobbyTimeThemeAssetGroup {',
  '  const key = `${characterId}:${styleNumber}`;',
  '  const assets = GENERATED_GACHA_MOBBY_TIME_THEME_ASSETS[key];',
  '  if (!assets) throw new Error(`Missing generated Mobby Time theme assets for ${key}`);',
  '  return assets;',
  '}',
  ''
)
[System.IO.File]::WriteAllText($registryPath, ($registry -join "`n"), (New-Object System.Text.UTF8Encoding($false)))
Write-Output "Generated $($characters.Count * 5 * $slots.Count) Mobby Time theme assets and registry."
