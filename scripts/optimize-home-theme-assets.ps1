[CmdletBinding()]
param(
  [ValidateRange(1, 1024)]
  [int]$MinimumFreeMB = 15
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$themeRoot = (Resolve-Path -LiteralPath (Join-Path $repoRoot 'assets\themes')).Path
$ffmpeg = (Get-Command ffmpeg -CommandType Application -ErrorAction Stop).Source
$minimumFreeBytes = [int64]$MinimumFreeMB * 1MB

# These bounds remain at least four times larger than each slot's largest
# in-app display size. The shelf is already the full-room source size and is
# intentionally left untouched.
$slotBounds = [ordered]@{
  controlButton = [pscustomobject]@{ Width = 640; Height = 400 }
  garland = [pscustomobject]@{ Width = 1280; Height = 410 }
  hook = [pscustomobject]@{ Width = 256; Height = 384 }
  inventoryTile = [pscustomobject]@{ Width = 384; Height = 384 }
  inventoryTileSelected = [pscustomobject]@{ Width = 384; Height = 384 }
  inventoryTray = [pscustomobject]@{ Width = 1320; Height = 528 }
  reactionBubble = [pscustomobject]@{ Width = 640; Height = 360 }
}

function Get-PngDimensions([string]$Path) {
  $stream = [IO.File]::OpenRead($Path)
  try {
    $header = [byte[]]::new(24)
    if ($stream.Read($header, 0, $header.Length) -ne $header.Length) {
      throw "Truncated PNG: $Path"
    }
    $signature = [byte[]](137, 80, 78, 71, 13, 10, 26, 10)
    for ($index = 0; $index -lt $signature.Length; $index++) {
      if ($header[$index] -ne $signature[$index]) { throw "Not a PNG: $Path" }
    }
    $width = [uint32]0
    $height = [uint32]0
    foreach ($offset in 16..19) { $width = ($width -shl 8) -bor $header[$offset] }
    foreach ($offset in 20..23) { $height = ($height -shl 8) -bor $header[$offset] }
    return [pscustomobject]@{ Width = [int]$width; Height = [int]$height }
  }
  finally {
    $stream.Dispose()
  }
}

function Test-PngTransparencyChunk([string]$Path) {
  $bytes = [IO.File]::ReadAllBytes($Path)
  $marker = [Text.Encoding]::ASCII.GetBytes('tRNS')
  for ($index = 8; $index -le $bytes.Length - $marker.Length; $index++) {
    if (
      $bytes[$index] -eq $marker[0] -and
      $bytes[$index + 1] -eq $marker[1] -and
      $bytes[$index + 2] -eq $marker[2] -and
      $bytes[$index + 3] -eq $marker[3]
    ) { return $true }
  }
  return $false
}

function Get-FreeBytes {
  return [IO.DriveInfo]::new([IO.Path]::GetPathRoot($repoRoot)).AvailableFreeSpace
}

$homeDirectories = @(
  Get-ChildItem -LiteralPath $themeRoot -Directory |
    ForEach-Object { Get-ChildItem -LiteralPath $_.FullName -Directory } |
    ForEach-Object {
      $homeDirectoryPath = Join-Path $_.FullName 'home'
      if (Test-Path -LiteralPath $homeDirectoryPath -PathType Container) { Get-Item -LiteralPath $homeDirectoryPath }
    } |
    Sort-Object FullName
)
if ($homeDirectories.Count -ne 80) {
  throw "Expected exactly 80 character/style home directories; found $($homeDirectories.Count)."
}

$allHomeFiles = @(foreach ($directory in $homeDirectories) { Get-ChildItem -LiteralPath $directory.FullName -File })
if ($allHomeFiles.Count -ne 640) {
  throw "Expected exactly 640 final Home assets; found $($allHomeFiles.Count)."
}
$beforeBytes = [int64](($allHomeFiles | Measure-Object Length -Sum).Sum)
$replaced = 0
$skipped = 0

foreach ($slot in $slotBounds.Keys) {
  $bound = $slotBounds[$slot]
  $targets = @(foreach ($directory in $homeDirectories) {
    $path = Join-Path $directory.FullName "$slot.png"
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Missing Home asset: $path" }
    Get-Item -LiteralPath $path
  })
  if ($targets.Count -ne 80) { throw "Expected 80 $slot assets; found $($targets.Count)." }

  foreach ($target in $targets) {
    $sourceDimensions = Get-PngDimensions $target.FullName
    if ($sourceDimensions.Width -le $bound.Width -and $sourceDimensions.Height -le $bound.Height) {
      $skipped++
      continue
    }
    if ((Get-FreeBytes) -lt ($minimumFreeBytes + 3MB)) {
      throw "Stopping before free space falls below ${MinimumFreeMB}MB while processing $($target.FullName)."
    }

    $temporaryPath = Join-Path $target.DirectoryName ('.' + $target.BaseName + '.resizing-' + $PID + '-' + [guid]::NewGuid().ToString('N') + '.png')
    $backupPath = Join-Path $target.DirectoryName ('.' + $target.BaseName + '.backup-' + $PID + '-' + [guid]::NewGuid().ToString('N') + '.png')
    try {
      $filter = "[0:v]scale=w=$($bound.Width):h=$($bound.Height):force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos,split=2[palette_source][indexed_source];[palette_source]palettegen=max_colors=64:reserve_transparent=1:stats_mode=full[palette];[indexed_source][palette]paletteuse=dither=sierra2_4a:alpha_threshold=1"
      & $ffmpeg -hide_banner -loglevel error -nostdin -y -i $target.FullName -filter_complex $filter -frames:v 1 -compression_level 9 $temporaryPath
      if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $temporaryPath -PathType Leaf)) {
        throw "ffmpeg failed for $($target.FullName)."
      }
      $candidate = Get-Item -LiteralPath $temporaryPath
      $candidateDimensions = Get-PngDimensions $candidate.FullName
      if ($candidateDimensions.Width -gt $bound.Width -or $candidateDimensions.Height -gt $bound.Height) {
        throw "Oversized result for $($target.FullName): $($candidateDimensions.Width)x$($candidateDimensions.Height)."
      }
      if ($candidateDimensions.Width -lt 2 -or $candidateDimensions.Height -lt 2) {
        throw "Invalid result dimensions for $($target.FullName)."
      }
      if (-not (Test-PngTransparencyChunk $candidate.FullName)) {
        throw "Transparency was lost for $($target.FullName)."
      }
      if ($candidate.Length -ge $target.Length) {
        $skipped++
        continue
      }

      [IO.File]::Replace($candidate.FullName, $target.FullName, $backupPath, $true)
      $replaced++
    }
    finally {
      if (Test-Path -LiteralPath $temporaryPath) { Remove-Item -LiteralPath $temporaryPath -Force }
      if (Test-Path -LiteralPath $backupPath) { Remove-Item -LiteralPath $backupPath -Force }
    }
  }
}

$afterFiles = @(foreach ($directory in $homeDirectories) { Get-ChildItem -LiteralPath $directory.FullName -File })
if ($afterFiles.Count -ne 640) { throw "Final Home asset count changed: $($afterFiles.Count)." }
foreach ($slot in @($slotBounds.Keys) + 'shelf') {
  $slotHashes = @()
  foreach ($directory in $homeDirectories) {
    $slotHashes += (Get-FileHash -LiteralPath (Join-Path $directory.FullName "$slot.png") -Algorithm SHA256).Hash
  }
  $hashes = @($slotHashes | Sort-Object -Unique)
  if ($hashes.Count -ne 80) { throw "Expected 80 unique $slot assets; found $($hashes.Count)." }
}
$afterBytes = [int64](($afterFiles | Measure-Object Length -Sum).Sum)
Write-Output "home_assets=640"
Write-Output "replaced=$replaced"
Write-Output "skipped=$skipped"
Write-Output "before_bytes=$beforeBytes"
Write-Output "after_bytes=$afterBytes"
Write-Output "reclaimed_bytes=$($beforeBytes - $afterBytes)"
