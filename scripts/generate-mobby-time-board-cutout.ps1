param(
  [string]$SourceRelativePath = 'assets\backgrounds\mobby-time-board.png',
  [string]$OutputRelativePath = 'assets\backgrounds\mobby-time-board-cutout.png'
)

Add-Type -AssemblyName System.Drawing

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$sourcePath = Join-Path $repoRoot $SourceRelativePath
$outputPath = Join-Path $repoRoot $OutputRelativePath

function Add-RoundedRectangle(
  [System.Drawing.Drawing2D.GraphicsPath]$path,
  [System.Drawing.RectangleF]$rect,
  [single]$radius
) {
  $diameter = $radius * 2
  $path.AddArc($rect.X, $rect.Y, $diameter, $diameter, 180, 90)
  $path.AddArc($rect.Right - $diameter, $rect.Y, $diameter, $diameter, 270, 90)
  $path.AddArc($rect.Right - $diameter, $rect.Bottom - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($rect.X, $rect.Bottom - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
}

function New-BoardSilhouette([int]$width, [int]$height) {
  $sx = [single]($width / 1024.0)
  $sy = [single]($height / 1536.0)
  $mainPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  Add-RoundedRectangle $mainPath (New-Object System.Drawing.RectangleF([single](30 * $sx), [single](54 * $sy), [single](964 * $sx), [single](1458 * $sy))) ([single](38 * [Math]::Min($sx, $sy)))
  $region = New-Object System.Drawing.Region($mainPath)
  $mainPath.Dispose()
  # Preserve the authored heart crests and the side tassels that extend past
  # the main wooden frame while removing the rectangular brown canvas.
  $topCrest = New-Object System.Drawing.Drawing2D.GraphicsPath
  $bottomCrest = New-Object System.Drawing.Drawing2D.GraphicsPath
  $topCrest.AddEllipse([single](342 * $sx), [single](28 * $sy), [single](340 * $sx), [single](150 * $sy))
  $bottomCrest.AddEllipse([single](338 * $sx), [single](1390 * $sy), [single](348 * $sx), [single](132 * $sy))
  $region.Union($topCrest)
  $region.Union($bottomCrest)
  $topCrest.Dispose()
  $bottomCrest.Dispose()
  $leftTassel = @(
    (New-Object System.Drawing.PointF([single](54 * $sx), [single](300 * $sy))),
    (New-Object System.Drawing.PointF([single](77 * $sx), [single](318 * $sy))),
    (New-Object System.Drawing.PointF([single](89 * $sx), [single](350 * $sy))),
    (New-Object System.Drawing.PointF([single](91 * $sx), [single](423 * $sy))),
    (New-Object System.Drawing.PointF([single](76 * $sx), [single](457 * $sy))),
    (New-Object System.Drawing.PointF([single](31 * $sx), [single](470 * $sy))),
    (New-Object System.Drawing.PointF([single](16 * $sx), [single](447 * $sy))),
    (New-Object System.Drawing.PointF([single](13 * $sx), [single](390 * $sy))),
    (New-Object System.Drawing.PointF([single](25 * $sx), [single](347 * $sy))),
    (New-Object System.Drawing.PointF([single](41 * $sx), [single](318 * $sy)))
  )
  $rightTassel = @($leftTassel | ForEach-Object { New-Object System.Drawing.PointF([single](($width - $_.X)), [single]$_.Y) })
  $leftPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $rightPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $leftPath.AddPolygon([System.Drawing.PointF[]]$leftTassel)
  $rightPath.AddPolygon([System.Drawing.PointF[]]$rightTassel)
  $region.Union($leftPath)
  $region.Union($rightPath)
  $leftPath.Dispose()
  $rightPath.Dispose()
  return $region
}

$source = [System.Drawing.Image]::FromFile($sourcePath)
$bitmap = New-Object System.Drawing.Bitmap($source.Width, $source.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([System.Drawing.Color]::Transparent)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$silhouette = New-BoardSilhouette $source.Width $source.Height
$graphics.SetClip([System.Drawing.Region]$silhouette, [System.Drawing.Drawing2D.CombineMode]::Replace)
$graphics.DrawImage($source, 0, 0, $source.Width, $source.Height)
$graphics.ResetClip()
$bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$silhouette.Dispose()
$graphics.Dispose()
$bitmap.Dispose()
$source.Dispose()

Write-Output "Generated board cutout at $outputPath"
