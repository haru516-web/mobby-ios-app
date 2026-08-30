param()

Add-Type -AssemblyName System.Drawing

$themeRepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$themeOutputRoot = Join-Path $themeRepoRoot 'assets\themes'

function Get-ThemeColor([string]$hex) {
  return [System.Drawing.ColorTranslator]::FromHtml($hex)
}

function Get-BlendedColor([System.Drawing.Color]$from, [System.Drawing.Color]$to, [double]$amount) {
  $mix = [Math]::Max(0, [Math]::Min(1, $amount))
  return [System.Drawing.Color]::FromArgb(
    [int]($from.A + (($to.A - $from.A) * $mix)),
    [int]($from.R + (($to.R - $from.R) * $mix)),
    [int]($from.G + (($to.G - $from.G) * $mix)),
    [int]($from.B + (($to.B - $from.B) * $mix))
  )
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

function Draw-ThemeImage(
  [System.Drawing.Graphics]$graphics,
  [System.Drawing.Image]$image,
  [System.Drawing.RectangleF]$bounds,
  [single]$opacity
) {
  $scale = [Math]::Min($bounds.Width / $image.Width, $bounds.Height / $image.Height)
  $width = [single]($image.Width * $scale)
  $height = [single]($image.Height * $scale)
  $destination = New-Object System.Drawing.RectangleF(
    ($bounds.X + (($bounds.Width - $width) / 2)),
    ($bounds.Y + (($bounds.Height - $height) / 2)),
    $width,
    $height
  )
  $matrix = New-Object System.Drawing.Imaging.ColorMatrix
  $matrix.Matrix33 = $opacity
  $attributes = New-Object System.Drawing.Imaging.ImageAttributes
  $attributes.SetColorMatrix($matrix)
  $destinationInt = New-Object System.Drawing.Rectangle(
    [int]$destination.X,
    [int]$destination.Y,
    [int]$destination.Width,
    [int]$destination.Height
  )
  $graphics.DrawImage(
    $image,
    $destinationInt,
    0,
    0,
    $image.Width,
    $image.Height,
    [System.Drawing.GraphicsUnit]::Pixel,
    $attributes
  )
  $attributes.Dispose()
}

function Draw-ThemeMotifs(
  [System.Drawing.Graphics]$graphics,
  [string]$motif,
  [System.Drawing.Color]$color,
  [int]$width,
  [int]$height,
  [int]$seed,
  [single]$opacity = 0.18
) {
  $fontSize = [single]([Math]::Max(22, [Math]::Min($width, $height) * 0.075))
  $font = New-Object System.Drawing.Font('Segoe UI Symbol', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb([int](255 * $opacity), $color))
  $positions = @(
    @((0.08 + (($seed % 3) * 0.04)), 0.10),
    @(0.72, (0.14 + (($seed % 4) * 0.035))),
    @((0.16 + (($seed % 5) * 0.03)), 0.48),
    @(0.78, 0.57),
    @(0.34, 0.80)
  )
  foreach ($motifPosition in $positions) {
    $graphics.DrawString($motif, $font, $brush, [single]($motifPosition[0] * $width), [single]($motifPosition[1] * $height))
  }
  $brush.Dispose()
  $font.Dispose()
}

function Draw-StitchBorder(
  [System.Drawing.Graphics]$graphics,
  [System.Drawing.RectangleF]$rect,
  [single]$radius,
  [System.Drawing.Color]$color,
  [single]$width
) {
  $path = New-RoundedPath $rect $radius
  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(205, $color), $width)
  $pen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
  $pen.DashPattern = [single[]]@(3.0, 2.4)
  $graphics.DrawPath($pen, $path)
  $pen.Dispose()
  $path.Dispose()
}

$themeWhite = Get-ThemeColor '#FFF9EC'
$themeCream = Get-ThemeColor '#F4E2BE'
$themeInk = Get-ThemeColor '#35283A'
$themeGold = Get-ThemeColor '#D5A64A'
$themeCoral = Get-ThemeColor '#C85E6F'
$themeAqua = Get-ThemeColor '#8CC7C5'
$themeNight = Get-ThemeColor '#29233E'

$themeCharacters = @(
  @{ Id='mobirin'; Accent='#4C6172'; Motif='○'; Image='assets\mobies\joy\mobirin-joy.png' },
  @{ Id='mobichi'; Accent='#E36C91'; Motif='♥'; Image='assets\mobies\joy\mobichi-joy.png' },
  @{ Id='yami'; Accent='#7B6A92'; Motif='☾'; Image='assets\mobies\joy\yami-joy.png' },
  @{ Id='mobiyan'; Accent='#2F6274'; Motif='⚡'; Image='assets\mobies\joy\mobiyan-joy.png' },
  @{ Id='mobiyura'; Accent='#4D3B68'; Motif='★'; Image='assets\mobies\joy\mobiyura-joy.png' },
  @{ Id='reomoby'; Accent='#93445E'; Motif='♛'; Image='assets\mobies\joy\reomoby-joy.png' },
  @{ Id='potemoby'; Accent='#9A724C'; Motif='☁'; Image='assets\mobies\joy\potemoby-joy.png' },
  @{ Id='mobibou'; Accent='#C86A35'; Motif='✦'; Image='assets\mobies\joy\mobibou-joy.png' },
  @{ Id='babumoby'; Accent='#D58A9B'; Motif='●'; Image='assets\mobies\joy\babumoby-joy.png' },
  @{ Id='magician'; Accent='#765A9E'; Motif='♣'; Image='assets\enemies\magician.png' },
  @{ Id='informant'; Accent='#4B758D'; Motif='⌁'; Image='assets\enemies\informant.png' },
  @{ Id='tracker'; Accent='#65764C'; Motif='⌖'; Image='assets\enemies\tracker.png' },
  @{ Id='safecracker'; Accent='#9A6845'; Motif='⚙'; Image='assets\enemies\safecracker.png' },
  @{ Id='veiled-duchess'; Accent='#8D5578'; Motif='◈'; Image='assets\enemies\veiled-duchess.png' },
  @{ Id='courier'; Accent='#8C6252'; Motif='➜'; Image='assets\enemies\courier.png' },
  @{ Id='commander'; Accent='#535B75'; Motif='◆'; Image='assets\enemies\commander.png' }
)

$themeStyles = @(
  @{ Number=1; MixA=$themeCream; MixB=$themeWhite; Dark=$themeInk; PortraitOpacity=0.34; MotifOpacity=0.16 },
  @{ Number=2; MixA=$themeAqua; MixB=$themeWhite; Dark=(Get-ThemeColor '#365B66'); PortraitOpacity=0.30; MotifOpacity=0.20 },
  @{ Number=3; MixA=$themeNight; MixB=(Get-ThemeColor '#66537D'); Dark=(Get-ThemeColor '#171424'); PortraitOpacity=0.43; MotifOpacity=0.24 },
  @{ Number=4; MixA=$themeCoral; MixB=$themeGold; Dark=(Get-ThemeColor '#643646'); PortraitOpacity=0.36; MotifOpacity=0.22 },
  @{ Number=5; MixA=$themeInk; MixB=$themeGold; Dark=(Get-ThemeColor '#131018'); PortraitOpacity=0.47; MotifOpacity=0.26 }
)

$themeSlots = @(
  @{ Name='appBackground'; Width=768; Height=1365; Radius=0 },
  @{ Name='buttonPrimary'; Width=720; Height=180; Radius=54 },
  @{ Name='buttonSecondary'; Width=720; Height=180; Radius=54 },
  @{ Name='card'; Width=720; Height=520; Radius=52 },
  # The navigation backdrop is rendered in the bottom tab bar, whose source
  # artwork is 1320x222. Keep this slot at the same aspect ratio so `contain`
  # fills the bar without introducing side gutters on narrow screens.
  @{ Name='navigation'; Width=1320; Height=222; Radius=52 },
  @{ Name='popup'; Width=720; Height=960; Radius=58 }
)

$themeSeed = 0
foreach ($themeCharacter in $themeCharacters) {
  $themeAccent = Get-ThemeColor $themeCharacter.Accent
  $themeImagePath = Join-Path $themeRepoRoot $themeCharacter.Image
  $themeCharacterImage = [System.Drawing.Image]::FromFile($themeImagePath)

  foreach ($themeStyle in $themeStyles) {
    $themeStyleFolder = Join-Path (Join-Path $themeOutputRoot $themeCharacter.Id) ([string]::Format('{0:D2}', $themeStyle.Number))
    New-Item -ItemType Directory -Force $themeStyleFolder | Out-Null

    foreach ($themeSlot in $themeSlots) {
      $themeBitmap = New-Object System.Drawing.Bitmap($themeSlot.Width, $themeSlot.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
      $themeGraphics = [System.Drawing.Graphics]::FromImage($themeBitmap)
      $themeGraphics.Clear([System.Drawing.Color]::Transparent)
      $themeGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
      $themeGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $themeGraphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

      $themeBounds = New-Object System.Drawing.RectangleF(0, 0, $themeSlot.Width, $themeSlot.Height)
      if ($themeSlot.Radius -gt 0) {
        $themeClipPath = New-RoundedPath $themeBounds $themeSlot.Radius
        $themeGraphics.SetClip($themeClipPath)
      }

      $themeStart = Get-BlendedColor $themeAccent $themeStyle.MixA 0.64
      $themeEnd = Get-BlendedColor $themeAccent $themeStyle.MixB 0.76
      if ($themeSlot.Name -eq 'buttonPrimary' -or $themeSlot.Name -eq 'navigation') {
        $themeStart = Get-BlendedColor $themeAccent $themeStyle.Dark 0.42
        $themeEnd = Get-BlendedColor $themeAccent $themeStyle.MixA 0.22
      } elseif ($themeSlot.Name -eq 'buttonSecondary' -or $themeSlot.Name -eq 'card' -or $themeSlot.Name -eq 'popup') {
        $themeStart = Get-BlendedColor $themeAccent $themeWhite 0.86
        $themeEnd = Get-BlendedColor $themeAccent $themeStyle.MixB 0.72
      }

      $themeGradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $themeBounds,
        $themeStart,
        $themeEnd,
        [single](92 + ($themeStyle.Number * 11))
      )
      $themeGraphics.FillRectangle($themeGradient, $themeBounds)
      $themeGradient.Dispose()

      $themeStripePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(24, $themeWhite), 2)
      for ($themeStripe = -$themeSlot.Height; $themeStripe -lt $themeSlot.Width; $themeStripe += 46) {
        $themeGraphics.DrawLine($themeStripePen, $themeStripe, 0, $themeStripe + $themeSlot.Height, $themeSlot.Height)
      }
      $themeStripePen.Dispose()

      Draw-ThemeMotifs $themeGraphics $themeCharacter.Motif $themeAccent $themeSlot.Width $themeSlot.Height ($themeSeed + $themeStyle.Number) $themeStyle.MotifOpacity

      if ($themeSlot.Name -eq 'appBackground') {
        $themePortraitBounds = New-Object System.Drawing.RectangleF(245, 545, 570, 790)
        Draw-ThemeImage $themeGraphics $themeCharacterImage $themePortraitBounds $themeStyle.PortraitOpacity
        $themeHeaderGlow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(68, $themeWhite))
        $themeGraphics.FillEllipse($themeHeaderGlow, -120, -170, 700, 520)
        $themeHeaderGlow.Dispose()
      } elseif ($themeSlot.Name -eq 'popup') {
        $themePortraitBounds = New-Object System.Drawing.RectangleF(365, 600, 335, 335)
        Draw-ThemeImage $themeGraphics $themeCharacterImage $themePortraitBounds 0.18
      } elseif ($themeSlot.Name -eq 'card') {
        $themePortraitBounds = New-Object System.Drawing.RectangleF(470, 235, 245, 270)
        Draw-ThemeImage $themeGraphics $themeCharacterImage $themePortraitBounds 0.17
      } else {
        $themePortraitBounds = New-Object System.Drawing.RectangleF(($themeSlot.Width - 170), 5, 165, ($themeSlot.Height - 10))
        Draw-ThemeImage $themeGraphics $themeCharacterImage $themePortraitBounds 0.24
      }

      if ($themeSlot.Radius -gt 0) {
        $themeGraphics.ResetClip()
        $themeClipPath.Dispose()
        $themeOuterPath = New-RoundedPath (New-Object System.Drawing.RectangleF(3, 3, ($themeSlot.Width - 6), ($themeSlot.Height - 6))) ($themeSlot.Radius - 3)
        $themeOuterPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(220, $themeAccent), 6)
        $themeGraphics.DrawPath($themeOuterPen, $themeOuterPath)
        $themeOuterPen.Dispose()
        $themeOuterPath.Dispose()
        Draw-StitchBorder $themeGraphics (New-Object System.Drawing.RectangleF(15, 15, ($themeSlot.Width - 30), ($themeSlot.Height - 30))) ([Math]::Max(12, $themeSlot.Radius - 13)) $themeStyle.Dark 3
      }

      $themeTargetPath = Join-Path $themeStyleFolder ($themeSlot.Name + '.png')
      $themeBitmap.Save($themeTargetPath, [System.Drawing.Imaging.ImageFormat]::Png)
      $themeGraphics.Dispose()
      $themeBitmap.Dispose()
    }
    $themeSeed += 1
  }
  $themeCharacterImage.Dispose()
}

$themeAssetCount = (Get-ChildItem -Recurse $themeOutputRoot -Filter '*.png').Count
Write-Output "Generated $themeAssetCount theme assets under $themeOutputRoot"
