Add-Type -AssemblyName System.Drawing

$targetWidth = 1320
$targetHeight = 222
$files = Get-ChildItem (Join-Path $PSScriptRoot '..\assets\themes') -Recurse -Filter 'navigation.png'
$converted = 0

foreach ($file in $files) {
  $source = [System.Drawing.Bitmap]::FromFile($file.FullName)
  if ($source.Width -eq $targetWidth -and $source.Height -eq $targetHeight) {
    $source.Dispose()
    continue
  }

  $target = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($target)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

  # Preserve the artwork's aspect ratio and crop only the vertical overflow.
  $scale = [Math]::Max($targetWidth / [double]$source.Width, $targetHeight / [double]$source.Height)
  $drawWidth = [single]($source.Width * $scale)
  $drawHeight = [single]($source.Height * $scale)
  $drawX = [single](($targetWidth - $drawWidth) / 2)
  $drawY = [single](($targetHeight - $drawHeight) / 2)
  $graphics.DrawImage($source, [System.Drawing.RectangleF]::new($drawX, $drawY, $drawWidth, $drawHeight))

  $temporaryPath = $file.FullName + '.tmp.png'
  $target.Save($temporaryPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $target.Dispose()
  $source.Dispose()
  Move-Item -LiteralPath $temporaryPath -Destination $file.FullName -Force
  $converted++
}

Write-Output "Normalized $converted navigation assets to ${targetWidth}x${targetHeight}."
