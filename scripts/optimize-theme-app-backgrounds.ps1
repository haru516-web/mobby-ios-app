[CmdletBinding()]
param(
  [ValidateSet('Inventory', 'Preview', 'Optimize')]
  [string]$Mode = 'Inventory',

  [string]$PreviewDirectory,

  [ValidateRange(1, 1024)]
  [int]$MinimumFreeMB = 100,

  [ValidateRange(1, 80)]
  [int]$MaximumReplacements = 80
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$expectedCount = 80
$expectedWidth = 768
$expectedHeight = 1365
$maximumColors = 256
$minimumFreeBytes = [int64]$MinimumFreeMB * 1MB
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$themeRoot = (Resolve-Path -LiteralPath (Join-Path $repoRoot 'assets\themes')).Path
$ffmpeg = (Get-Command ffmpeg -CommandType Application -ErrorAction Stop).Source

function ConvertFrom-BigEndianUInt32([byte[]]$Bytes, [int]$Offset) {
  return (
    ([uint32]$Bytes[$Offset] -shl 24) -bor
    ([uint32]$Bytes[$Offset + 1] -shl 16) -bor
    ([uint32]$Bytes[$Offset + 2] -shl 8) -bor
    [uint32]$Bytes[$Offset + 3]
  )
}

function Get-PngInfo([string]$Path) {
  $stream = [IO.File]::OpenRead($Path)
  try {
    $header = [byte[]]::new(26)
    if ($stream.Read($header, 0, $header.Length) -ne $header.Length) {
      throw "PNG header is truncated: $Path"
    }

    $signature = [byte[]](137, 80, 78, 71, 13, 10, 26, 10)
    for ($index = 0; $index -lt $signature.Length; $index++) {
      if ($header[$index] -ne $signature[$index]) {
        throw "Not a PNG file: $Path"
      }
    }

    if ([Text.Encoding]::ASCII.GetString($header, 12, 4) -ne 'IHDR') {
      throw "PNG does not begin with IHDR: $Path"
    }

    $colorType = [int]$header[25]
    $modeByColorType = @{
      0 = 'grayscale'
      2 = 'RGB'
      3 = 'indexed'
      4 = 'grayscale-alpha'
      6 = 'RGBA'
    }
    $mode = if ($modeByColorType.ContainsKey($colorType)) {
      $modeByColorType[$colorType]
    } else {
      "unknown-$colorType"
    }

    return [pscustomobject]@{
      Width = ConvertFrom-BigEndianUInt32 $header 16
      Height = ConvertFrom-BigEndianUInt32 $header 20
      BitDepth = [int]$header[24]
      ColorType = $colorType
      Mode = $mode
    }
  }
  finally {
    $stream.Dispose()
  }
}

function Get-ThemeBackgroundTargets {
  $targets = @(
    Get-ChildItem -LiteralPath $themeRoot -Directory |
      ForEach-Object {
        Get-ChildItem -LiteralPath $_.FullName -Directory |
          ForEach-Object {
            $candidate = Join-Path $_.FullName 'appBackground.png'
            if (Test-Path -LiteralPath $candidate -PathType Leaf) {
              Get-Item -LiteralPath $candidate
            }
          }
      } |
      Sort-Object FullName
  )

  if ($targets.Count -ne $expectedCount) {
    throw "Expected exactly $expectedCount assets/themes/*/*/appBackground.png files; found $($targets.Count)."
  }

  foreach ($target in $targets) {
    $relative = [IO.Path]::GetRelativePath($themeRoot, $target.FullName)
    if ($relative.Split([IO.Path]::DirectorySeparatorChar).Count -ne 3) {
      throw "Refusing unexpected target depth: $($target.FullName)"
    }
  }

  return $targets
}

function Get-Inventory {
  $rows = foreach ($target in Get-ThemeBackgroundTargets) {
    $png = Get-PngInfo $target.FullName
    [pscustomobject]@{
      Path = $target.FullName
      RelativePath = [IO.Path]::GetRelativePath($repoRoot, $target.FullName).Replace('\', '/')
      Bytes = [int64]$target.Length
      Width = [int]$png.Width
      Height = [int]$png.Height
      BitDepth = $png.BitDepth
      ColorType = $png.ColorType
      Mode = $png.Mode
      Sha256 = (Get-FileHash -LiteralPath $target.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    }
  }

  $unexpectedDimensions = @(
    $rows | Where-Object { $_.Width -ne $expectedWidth -or $_.Height -ne $expectedHeight }
  )
  if ($unexpectedDimensions.Count -gt 0) {
    $paths = ($unexpectedDimensions.RelativePath -join ', ')
    throw "Unexpected dimensions; expected ${expectedWidth}x${expectedHeight}: $paths"
  }

  $uniqueHashes = @($rows.Sha256 | Sort-Object -Unique)
  if ($uniqueHashes.Count -ne $expectedCount) {
    throw "Expected $expectedCount unique SHA-256 hashes; found $($uniqueHashes.Count)."
  }

  return @($rows)
}

function Write-InventorySummary([object[]]$Rows) {
  $totalBytes = [int64](($Rows | Measure-Object -Property Bytes -Sum).Sum)
  $dimensions = ($Rows | Group-Object Width, Height | ForEach-Object {
    "$($_.Group[0].Width)x$($_.Group[0].Height):$($_.Count)"
  }) -join ', '
  $modes = ($Rows | Group-Object Mode, BitDepth | ForEach-Object {
    "$($_.Group[0].Mode) $($_.Group[0].BitDepth)-bit:$($_.Count)"
  }) -join ', '
  $uniqueHashes = @($Rows.Sha256 | Sort-Object -Unique).Count

  Write-Output "count=$($Rows.Count)"
  Write-Output "total_bytes=$totalBytes"
  Write-Output "dimensions=$dimensions"
  Write-Output "modes=$modes"
  Write-Output "unique_sha256=$uniqueHashes"
}

function Assert-FreeSpace([string]$Path, [int64]$AdditionalHeadroomBytes = 0) {
  $driveRoot = [IO.Path]::GetPathRoot([IO.Path]::GetFullPath($Path))
  $freeBytes = [IO.DriveInfo]::new($driveRoot).AvailableFreeSpace
  $requiredBytes = $minimumFreeBytes + $AdditionalHeadroomBytes
  if ($freeBytes -lt $requiredBytes) {
    throw "Stopping before free space can fall below ${MinimumFreeMB}MB: free=$freeBytes required=$requiredBytes path=$Path"
  }
}

function New-IndexedPng([string]$SourcePath, [string]$OutputPath) {
  if (Test-Path -LiteralPath $OutputPath) {
    throw "Refusing to overwrite an existing temporary output: $OutputPath"
  }

  $sourceBytes = (Get-Item -LiteralPath $SourcePath).Length
  $generationHeadroom = [Math]::Max([int64]$sourceBytes, [int64](16MB))
  Assert-FreeSpace $OutputPath $generationHeadroom

  $filter = "[0:v]split=2[palette_source][indexed_source];[palette_source]palettegen=max_colors=${maximumColors}:reserve_transparent=0:stats_mode=full[palette];[indexed_source][palette]paletteuse=dither=sierra2_4a:diff_mode=rectangle"
  $arguments = @(
    '-hide_banner',
    '-loglevel', 'error',
    '-nostdin',
    '-y',
    '-i', $SourcePath,
    '-filter_complex', $filter,
    '-frames:v', '1',
    '-compression_level', '9',
    $OutputPath
  )

  try {
    & $ffmpeg @arguments
    if ($LASTEXITCODE -ne 0) {
      throw "ffmpeg failed with exit code $LASTEXITCODE for $SourcePath"
    }
    if (-not (Test-Path -LiteralPath $OutputPath -PathType Leaf)) {
      throw "ffmpeg did not create $OutputPath"
    }

    $output = Get-Item -LiteralPath $OutputPath
    if ($output.Length -le 0) {
      throw "ffmpeg created an empty file: $OutputPath"
    }

    $png = Get-PngInfo $OutputPath
    if ($png.Width -ne $expectedWidth -or $png.Height -ne $expectedHeight) {
      throw "Unexpected output dimensions for ${OutputPath}: $($png.Width)x$($png.Height)"
    }
    if ($png.Mode -ne 'indexed' -or $png.BitDepth -gt 8) {
      throw "Output is not an indexed PNG with at most $maximumColors colors: $OutputPath ($($png.Mode), $($png.BitDepth)-bit)"
    }

    Assert-FreeSpace $OutputPath
    return $output
  }
  catch {
    if (Test-Path -LiteralPath $OutputPath) {
      Remove-Item -LiteralPath $OutputPath -Force
    }
    throw
  }
}

function Invoke-Preview([object[]]$Rows) {
  if ([string]::IsNullOrWhiteSpace($PreviewDirectory)) {
    throw '-PreviewDirectory is required when -Mode Preview is used.'
  }

  $previewPath = [IO.Path]::GetFullPath($PreviewDirectory)
  if ($previewPath.StartsWith($themeRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw "PreviewDirectory must be outside assets/themes: $previewPath"
  }
  if (Test-Path -LiteralPath $previewPath) {
    throw "PreviewDirectory must not already exist: $previewPath"
  }

  Assert-FreeSpace $previewPath (16MB)
  [IO.Directory]::CreateDirectory($previewPath) | Out-Null

  $ordered = @($Rows | Sort-Object Bytes, RelativePath)
  $selections = @(
    [pscustomobject]@{ Label = 'smallest'; Row = $ordered[0] }
    [pscustomobject]@{ Label = 'median'; Row = $ordered[[Math]::Floor($ordered.Count / 2)] }
    [pscustomobject]@{ Label = 'largest'; Row = $ordered[-1] }
  )

  foreach ($selection in $selections) {
    $outputPath = Join-Path $previewPath "$($selection.Label).indexed.png"
    $output = New-IndexedPng $selection.Row.Path $outputPath
    $hash = (Get-FileHash -LiteralPath $output.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    Write-Output (
      "preview={0}|source={1}|source_bytes={2}|output={3}|output_bytes={4}|sha256={5}" -f
      $selection.Label,
      $selection.Row.RelativePath,
      $selection.Row.Bytes,
      $output.FullName,
      $output.Length,
      $hash
    )
  }
}

function Invoke-Optimize([object[]]$Rows) {
  $beforeTotal = [int64](($Rows | Measure-Object -Property Bytes -Sum).Sum)
  $currentHashes = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  foreach ($row in $Rows) {
    if (-not $currentHashes.Add($row.Sha256)) {
      throw "Duplicate source hash detected before optimization: $($row.Sha256)"
    }
  }

  $replacedCount = 0
  $alreadyIndexedCount = 0
  foreach ($row in $Rows) {
    if ($replacedCount -ge $MaximumReplacements) {
      break
    }

    if ($row.Mode -eq 'indexed' -and $row.BitDepth -le 8) {
      $alreadyIndexedCount++
      Write-Output "unchanged=already-indexed|path=$($row.RelativePath)|bytes=$($row.Bytes)"
      continue
    }

    $directory = [IO.Path]::GetDirectoryName($row.Path)
    $temporaryPath = Join-Path $directory ('.appBackground.quantized-' + $PID + '-' + [guid]::NewGuid().ToString('N') + '.png')
    $backupPath = Join-Path $directory ('.appBackground.backup-' + $PID + '-' + [guid]::NewGuid().ToString('N') + '.png')

    try {
      $candidate = New-IndexedPng $row.Path $temporaryPath
      if ($candidate.Length -ge $row.Bytes) {
        throw "Indexed output is not smaller; refusing to replace $($row.RelativePath): source=$($row.Bytes) candidate=$($candidate.Length)"
      }

      $candidateHash = (Get-FileHash -LiteralPath $candidate.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
      if ($candidateHash -ne $row.Sha256 -and $currentHashes.Contains($candidateHash)) {
        throw "Indexed output would duplicate another target hash; refusing to replace $($row.RelativePath): $candidateHash"
      }

      # File.Replace requires a concrete backup path on the bundled Windows
      # runtime. Keeping the backup beside the source also makes the swap
      # atomic; it is removed in finally after the validated candidate lands.
      [IO.File]::Replace($candidate.FullName, $row.Path, $backupPath, $true)
      [void]$currentHashes.Remove($row.Sha256)
      if (-not $currentHashes.Add($candidateHash)) {
        throw "Hash-set invariant failed after replacing $($row.RelativePath)"
      }

      $replacedCount++
      $savedBytes = $row.Bytes - $candidate.Length
      Write-Output "replaced=$($row.RelativePath)|before=$($row.Bytes)|after=$($candidate.Length)|saved=$savedBytes|sha256=$candidateHash"
    }
    finally {
      if (Test-Path -LiteralPath $temporaryPath) {
        Remove-Item -LiteralPath $temporaryPath -Force
      }
      if (Test-Path -LiteralPath $backupPath) {
        Remove-Item -LiteralPath $backupPath -Force
      }
    }
  }

  $after = Get-Inventory
  $notIndexed = @($after | Where-Object { $_.Mode -ne 'indexed' -or $_.BitDepth -gt 8 })
  if ($notIndexed.Count -gt 0 -and $MaximumReplacements -eq $expectedCount) {
    throw "Optimization ended with non-indexed targets: $($notIndexed.RelativePath -join ', ')"
  }

  $afterTotal = [int64](($after | Measure-Object -Property Bytes -Sum).Sum)
  $reclaimedBytes = $beforeTotal - $afterTotal
  Write-Output "replaced_count=$replacedCount"
  Write-Output "already_indexed_count=$alreadyIndexedCount"
  Write-Output "remaining_nonindexed_count=$($notIndexed.Count)"
  Write-Output "before_total_bytes=$beforeTotal"
  Write-Output "after_total_bytes=$afterTotal"
  Write-Output "reclaimed_bytes=$reclaimedBytes"
  Write-InventorySummary $after
}

$inventory = Get-Inventory
switch ($Mode) {
  'Inventory' {
    Write-InventorySummary $inventory
  }
  'Preview' {
    Invoke-Preview $inventory
  }
  'Optimize' {
    Invoke-Optimize $inventory
  }
}
