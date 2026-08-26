# Normalizes ImageGen room layers to the runtime's fixed portrait canvas.
param(
  [Parameter(Mandatory = $true)]
  [string]$InputPath,

  [Parameter(Mandatory = $true)]
  [string]$OutputPath
)

Add-Type -AssemblyName System.Drawing

$resolvedInput = (Resolve-Path -LiteralPath $InputPath).Path
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)
$outputDirectory = [System.IO.Path]::GetDirectoryName($resolvedOutput)

if (-not [System.IO.Directory]::Exists($outputDirectory)) {
  [System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
}

$targetWidth = 768
$targetHeight = 1365
$temporaryOutput = Join-Path $outputDirectory ('.' + [System.IO.Path]::GetFileName($resolvedOutput) + '.normalized.tmp.png')

$source = $null
$bitmap = $null
$graphics = $null

try {
  $source = [System.Drawing.Image]::FromFile($resolvedInput)
  $bitmap = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::FromArgb(246, 231, 201))
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

  $scale = [Math]::Max($targetWidth / $source.Width, $targetHeight / $source.Height)
  $drawWidth = [int][Math]::Ceiling($source.Width * $scale)
  $drawHeight = [int][Math]::Ceiling($source.Height * $scale)
  $drawX = [int][Math]::Floor(($targetWidth - $drawWidth) / 2)
  $drawY = [int][Math]::Floor(($targetHeight - $drawHeight) / 2)

  $graphics.DrawImage($source, $drawX, $drawY, $drawWidth, $drawHeight)
  $bitmap.Save($temporaryOutput, [System.Drawing.Imaging.ImageFormat]::Png)
}
finally {
  if ($graphics) { $graphics.Dispose() }
  if ($bitmap) { $bitmap.Dispose() }
  if ($source) { $source.Dispose() }
}

Move-Item -LiteralPath $temporaryOutput -Destination $resolvedOutput -Force

$result = [System.Drawing.Image]::FromFile($resolvedOutput)
try {
  if ($result.Width -ne $targetWidth -or $result.Height -ne $targetHeight) {
    throw "Unexpected output dimensions: $($result.Width)x$($result.Height)"
  }
}
finally {
  $result.Dispose()
}

Write-Output "Normalized $resolvedInput -> $resolvedOutput ($targetWidth x $targetHeight)"
