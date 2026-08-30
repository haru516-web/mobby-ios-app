Add-Type -AssemblyName System.Drawing

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$sourcePath = Join-Path $repoRoot 'assets\gacha\screen\gacha-transparent-ornaments-v1.png'
$source = [System.Drawing.Bitmap]::FromFile($sourcePath)

$characters = @('mobirin','mobichi','yami','mobiyan','mobiyura','reomoby','potemoby','mobibou','babumoby','magician','informant','tracker','safecracker','veiled-duchess','courier','commander')
$styles = 1..5
$slots = @(
  @{ Name='header'; Width=1200; Height=260 },
  @{ Name='themeStats'; Width=520; Height=190 },
  @{ Name='toolStats'; Width=520; Height=190 },
  @{ Name='pullStats'; Width=520; Height=190 },
  @{ Name='machine'; Width=1200; Height=840 },
  @{ Name='lineup'; Width=1200; Height=280 },
  @{ Name='dressup'; Width=1200; Height=360 }
)

foreach ($character in $characters) {
  foreach ($style in $styles) {
    $folder = Join-Path $repoRoot ("assets\themes\{0}\{1:D2}\gacha" -f $character, $style)
    New-Item -ItemType Directory -Force $folder | Out-Null
    foreach ($slot in $slots) {
      $target = New-Object System.Drawing.Bitmap($slot.Width, $slot.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
      $graphics = [System.Drawing.Graphics]::FromImage($target)
      $graphics.Clear([System.Drawing.Color]::Transparent)
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

      # Preserve the generated ornament's aspect ratio. Transparent margins are
      # intentional: the result is an overlay part, never a stretched backdrop.
      $scale = [Math]::Min($slot.Width / [double]$source.Width, $slot.Height / [double]$source.Height)
      $drawWidth = [single]($source.Width * $scale)
      $drawHeight = [single]($source.Height * $scale)
      $drawX = [single](($slot.Width - $drawWidth) / 2)
      $drawY = [single](($slot.Height - $drawHeight) / 2)
      $graphics.DrawImage($source, [System.Drawing.RectangleF]::new($drawX, $drawY, $drawWidth, $drawHeight))

      $target.Save((Join-Path $folder ($slot.Name + '.png')), [System.Drawing.Imaging.ImageFormat]::Png)
      $graphics.Dispose()
      $target.Dispose()
    }
  }
}

$source.Dispose()
Write-Output "Generated transparent gacha parts for $($characters.Count * $styles.Count) themes."
