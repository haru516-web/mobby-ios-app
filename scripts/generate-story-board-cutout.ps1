param(
  [string]$SourceRelativePath = 'assets\backgrounds\trade-exchange-board.png',
  [string]$OutputRelativePath = 'assets\backgrounds\trade-exchange-board-cutout-v1.png'
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

function Add-ScaledPolygon(
  [System.Drawing.Drawing2D.GraphicsPath]$path,
  [object[]]$points,
  [single]$sx,
  [single]$sy
) {
  $scaled = @($points | ForEach-Object {
    New-Object System.Drawing.PointF([single]($_[0] * $sx), [single]($_[1] * $sy))
  })
  $path.AddPolygon([System.Drawing.PointF[]]$scaled)
}

function Add-ScaledEllipse(
  [System.Drawing.Drawing2D.GraphicsPath]$path,
  [single]$x,
  [single]$y,
  [single]$width,
  [single]$height,
  [single]$sx,
  [single]$sy
) {
  $path.AddEllipse([single]($x * $sx), [single]($y * $sy), [single]($width * $sx), [single]($height * $sy))
}

function New-StoryBoardSilhouette([int]$width, [int]$height) {
  $sx = [single]($width / 1024.0)
  $sy = [single]($height / 1536.0)
  $region = New-Object System.Drawing.Region([System.Drawing.RectangleF]::new(0, 0, 0, 0))

  # The authored board body.  This is intentionally tighter than the old
  # transparent asset: the pale outer canvas is not part of the board.
  $main = New-Object System.Drawing.Drawing2D.GraphicsPath
  Add-RoundedRectangle $main (New-Object System.Drawing.RectangleF([single](64 * $sx), [single](166 * $sy), [single](896 * $sx), [single](1344 * $sy))) ([single](52 * [Math]::Min($sx, $sy)))
  $region.Union($main)
  $main.Dispose()

  # Hanging ropes, rod, and wooden end caps above the body.
  $leftRope = New-Object System.Drawing.Drawing2D.GraphicsPath
  $rightRope = New-Object System.Drawing.Drawing2D.GraphicsPath
  Add-ScaledPolygon $leftRope @(@(137,0),@(178,0),@(128,101),@(87,101)) $sx $sy
  Add-ScaledPolygon $rightRope @(@(846,0),@(887,0),@(937,101),@(896,101)) $sx $sy
  $region.Union($leftRope)
  $region.Union($rightRope)
  $leftRope.Dispose()
  $rightRope.Dispose()

  $rod = New-Object System.Drawing.Drawing2D.GraphicsPath
  Add-RoundedRectangle $rod (New-Object System.Drawing.RectangleF([single](42 * $sx), [single](82 * $sy), [single](940 * $sx), [single](88 * $sy))) ([single](30 * [Math]::Min($sx, $sy)))
  $region.Union($rod)
  $rod.Dispose()

  $leftCap = New-Object System.Drawing.Drawing2D.GraphicsPath
  $rightCap = New-Object System.Drawing.Drawing2D.GraphicsPath
  Add-ScaledEllipse $leftCap 24 86 111 92 $sx $sy
  Add-ScaledEllipse $rightCap 889 86 111 92 $sx $sy
  $region.Union($leftCap)
  $region.Union($rightCap)
  $leftCap.Dispose()
  $rightCap.Dispose()

  # Three cloth tabs hang below the rod and sit outside the rounded body.
  $leftTab = New-Object System.Drawing.Drawing2D.GraphicsPath
  $centerTab = New-Object System.Drawing.Drawing2D.GraphicsPath
  $rightTab = New-Object System.Drawing.Drawing2D.GraphicsPath
  Add-RoundedRectangle $leftTab (New-Object System.Drawing.RectangleF([single](214 * $sx), [single](91 * $sy), [single](84 * $sx), [single](116 * $sy))) ([single](12 * [Math]::Min($sx, $sy)))
  Add-ScaledPolygon $centerTab @(@(414,92),@(610,92),@(610,177),@(588,202),@(512,214),@(436,202),@(414,177)) $sx $sy
  Add-RoundedRectangle $rightTab (New-Object System.Drawing.RectangleF([single](726 * $sx), [single](91 * $sy), [single](84 * $sx), [single](116 * $sy))) ([single](12 * [Math]::Min($sx, $sy)))
  $region.Union($leftTab)
  $region.Union($centerTab)
  $region.Union($rightTab)
  $leftTab.Dispose()
  $centerTab.Dispose()
  $rightTab.Dispose()

  # Side hearts, ribbons, and beads are separate authored elements, so keep
  # their silhouettes without restoring the canvas between them and the body.
  $leftHeart = New-Object System.Drawing.Drawing2D.GraphicsPath
  $rightHeart = New-Object System.Drawing.Drawing2D.GraphicsPath
  Add-ScaledEllipse $leftHeart 59 193 71 78 $sx $sy
  Add-ScaledEllipse $rightHeart 894 193 71 78 $sx $sy
  $region.Union($leftHeart)
  $region.Union($rightHeart)
  $leftHeart.Dispose()
  $rightHeart.Dispose()

  $leftRibbon = New-Object System.Drawing.Drawing2D.GraphicsPath
  $rightRibbon = New-Object System.Drawing.Drawing2D.GraphicsPath
  Add-ScaledPolygon $leftRibbon @(@(55,266),@(94,275),@(99,302),@(88,333),@(83,362),@(85,395),@(72,421),@(46,415),@(19,404),@(27,375),@(35,345),@(43,316),@(50,287)) $sx $sy
  Add-ScaledPolygon $rightRibbon @(@(969,266),@(930,275),@(925,302),@(936,333),@(941,362),@(939,395),@(952,421),@(978,415),@(1005,404),@(997,375),@(989,345),@(981,316),@(974,287)) $sx $sy
  $region.Union($leftRibbon)
  $region.Union($rightRibbon)
  $leftRibbon.Dispose()
  $rightRibbon.Dispose()

  $leftBead = New-Object System.Drawing.Drawing2D.GraphicsPath
  $rightBead = New-Object System.Drawing.Drawing2D.GraphicsPath
  Add-ScaledEllipse $leftBead 53 430 40 44 $sx $sy
  Add-ScaledEllipse $rightBead 931 430 40 44 $sx $sy
  $region.Union($leftBead)
  $region.Union($rightBead)
  $leftBead.Dispose()
  $rightBead.Dispose()

  # The bottom heart reaches a little below the rounded body.
  $bottomHeart = New-Object System.Drawing.Drawing2D.GraphicsPath
  Add-ScaledEllipse $bottomHeart 451 1431 122 87 $sx $sy
  $region.Union($bottomHeart)
  $bottomHeart.Dispose()

  return $region
}

$source = [System.Drawing.Image]::FromFile($sourcePath)
$bitmap = New-Object System.Drawing.Bitmap($source.Width, $source.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([System.Drawing.Color]::Transparent)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$silhouette = New-StoryBoardSilhouette $source.Width $source.Height
$graphics.SetClip([System.Drawing.Region]$silhouette, [System.Drawing.Drawing2D.CombineMode]::Replace)
$graphics.DrawImage($source, 0, 0, $source.Width, $source.Height)
$graphics.ResetClip()
$bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$silhouette.Dispose()
$graphics.Dispose()
$bitmap.Dispose()
$source.Dispose()

Write-Output "Generated story board cutout at $outputPath"
