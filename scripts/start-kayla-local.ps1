param()

$ErrorActionPreference = 'Stop'
$siteRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$sitePort = 4337
$workerPort = 8788
$nodePath = (Get-Command node -ErrorAction Stop).Source
# In an agent-capable shell Astro normally launches a detached daemon and
# waits for its lock file. Keep this helper's site process in the foreground
# instead: its lifetime is then owned and cleaned up by this script.
$env:ASTRO_DEV_BACKGROUND = '1'
$env:XDG_CONFIG_HOME = Join-Path $siteRoot '.wrangler-config'
$runtimeDir = Join-Path $siteRoot '.kayla-local'
$workerOut = Join-Path $runtimeDir 'worker.out.log'
$workerErr = Join-Path $runtimeDir 'worker.err.log'
$siteOut = Join-Path $runtimeDir 'site.out.log'
$siteErr = Join-Path $runtimeDir 'site.err.log'
$astroEntry = Join-Path $siteRoot 'node_modules\astro\bin\astro.mjs'
$wranglerEntry = Join-Path $siteRoot 'worker\node_modules\wrangler\bin\wrangler.js'
$workerConfig = Join-Path $siteRoot 'worker\wrangler.toml'

foreach ($entry in @($astroEntry, $wranglerEntry, $workerConfig)) {
  if (-not (Test-Path -LiteralPath $entry)) {
    throw "Missing local development dependency: $entry"
  }
}

function Stop-StaleFdsProcess {
  param([int]$Port)

  $owners = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique)

  foreach ($owner in $owners) {
    $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $owner" -ErrorAction Stop
    $commandLine = [string]$processInfo.CommandLine
    $targetProcessId = $owner

    # Wrangler's listening child is workerd.exe. Its immediate parent is the
    # Wrangler CLI, while the process that owns that whole tree is normally
    # the local worker/node_modules/wrangler/bin/wrangler.js launcher. Walk
    # only these two verified levels and stop the outer launcher tree.
    if ($processInfo.Name -ieq 'workerd.exe' -and $processInfo.ParentProcessId) {
      $parentInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $($processInfo.ParentProcessId)" -ErrorAction SilentlyContinue
      $parentCommandLine = [string]$parentInfo.CommandLine
      $parentIsThisSite = $parentCommandLine.IndexOf($siteRoot, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
      $parentIsWrangler = $parentCommandLine -match 'wrangler(?:\\.js|-dist\\cli\\.js)'
      $launcherInfo = if ($parentInfo -and $parentInfo.ParentProcessId) { Get-CimInstance Win32_Process -Filter "ProcessId = $($parentInfo.ParentProcessId)" -ErrorAction SilentlyContinue } else { $null }
      $launcherCommandLine = [string]$launcherInfo.CommandLine
      $launcherIsThisSite = $launcherCommandLine.IndexOf($siteRoot, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
      $launcherIsWrangler = $launcherCommandLine.IndexOf($wranglerEntry, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
      if ($launcherInfo -and $launcherIsThisSite -and $launcherIsWrangler) {
        $processInfo = $launcherInfo
        $commandLine = $launcherCommandLine
        $targetProcessId = [int]$launcherInfo.ProcessId
      }
      elseif ($parentInfo -and $parentIsThisSite -and $parentIsWrangler) {
        $processInfo = $parentInfo
        $commandLine = $parentCommandLine
        $targetProcessId = [int]$parentInfo.ProcessId
      }
    }
    $isThisSite = $commandLine.IndexOf($siteRoot, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
    $isDevServer = $commandLine -match '(astro\.mjs|wrangler(?:\.js|-dist\\cli\.js)|workerd\.exe)'
    if (-not ($isThisSite -and $isDevServer)) {
      throw "Port $Port is in use by a process outside this FDS Kayla workflow. Stop it manually or choose a different port."
    }
    try {
      Stop-Process -Id $targetProcessId -ErrorAction Stop
    }
    catch {
      # Some Windows hosts expose the listener through a protected launcher
      # handle that Stop-Process cannot close, even after the command line has
      # been verified above. Kill only that exact verified process tree.
      $taskKill = Join-Path $env:SystemRoot 'System32\taskkill.exe'
      & $taskKill '/PID' $targetProcessId '/T' '/F' | Out-Null
      if ($LASTEXITCODE -ne 0) {
        throw "Unable to stop the verified stale FDS process on port $Port."
      }
    }
  }
}

function Test-LocalPortListening {
  param([int]$Port)

  # Get-NetTCPConnection is reliable for the one-time ownership check above,
  # but can take seconds per call on some Windows hosts. The .NET listener
  # table makes the bounded readiness loop genuinely bounded.
  $listeners = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners()
  return @($listeners | Where-Object { $_.Port -eq $Port }).Count -gt 0
}

Stop-StaleFdsProcess -Port $sitePort
Stop-StaleFdsProcess -Port $workerPort
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

# Start-Process joins ArgumentList entries before it calls Node. The checkout
# path has spaces, so preserve each JavaScript/config pathname as one argument.
$quotedWranglerEntry = '"' + $wranglerEntry + '"'
$quotedWorkerConfig = '"' + $workerConfig + '"'
$quotedAstroEntry = '"' + $astroEntry + '"'
$workerProcess = Start-Process -FilePath $nodePath -ArgumentList @($quotedWranglerEntry, 'dev', '--config', $quotedWorkerConfig, '--port', $workerPort, '--local') -WorkingDirectory (Join-Path $siteRoot 'worker') -WindowStyle Hidden -RedirectStandardOutput $workerOut -RedirectStandardError $workerErr -PassThru
$siteProcess = Start-Process -FilePath $nodePath -ArgumentList @($quotedAstroEntry, 'dev', '--host', '127.0.0.1', '--port', $sitePort) -WorkingDirectory $siteRoot -WindowStyle Hidden -RedirectStandardOutput $siteOut -RedirectStandardError $siteErr -PassThru

try {
  # A cold Astro dependency graph can take a little over a minute to warm on
  # this Windows checkout. Keep the wait bounded, but do not misclassify that
  # legitimate startup as a failed Kayla preview.
  for ($attempt = 0; $attempt -lt 450; $attempt++) {
    $siteReady = Test-LocalPortListening -Port $sitePort
    $workerReady = Test-LocalPortListening -Port $workerPort
    if ($siteReady -and $workerReady) {
      Write-Host "Kayla local preview is ready at http://127.0.0.1:$sitePort"
      break
    }
    if ($workerProcess.HasExited -or $siteProcess.HasExited) {
      $workerDetail = (Get-Content -LiteralPath $workerErr -Tail 8 -ErrorAction SilentlyContinue) -join "`n"
      $siteDetail = (Get-Content -LiteralPath $siteErr -Tail 8 -ErrorAction SilentlyContinue) -join "`n"
      throw "The site or Kayla Worker stopped before both local services were ready. Worker: $workerDetail Site: $siteDetail"
    }
    Start-Sleep -Milliseconds 200
  }
  $siteReady = Test-LocalPortListening -Port $sitePort
  $workerReady = Test-LocalPortListening -Port $workerPort
  if (-not ($siteReady -and $workerReady)) {
    $workerDetail = (Get-Content -LiteralPath $workerErr -Tail 8 -ErrorAction SilentlyContinue) -join "`n"
    $siteDetail = (Get-Content -LiteralPath $siteErr -Tail 8 -ErrorAction SilentlyContinue) -join "`n"
    throw "The local services did not become ready within 90 seconds. Worker: $workerDetail Site: $siteDetail"
  }
  if ($workerProcess.HasExited) {
    throw 'The Kayla Worker stopped unexpectedly.'
  }
  Wait-Process -Id $workerProcess.Id
}
finally {
  foreach ($process in @($siteProcess, $workerProcess)) {
    if ($process -and -not $process.HasExited) {
      Stop-Process -Id $process.Id -ErrorAction SilentlyContinue
    }
  }
  # The script started the only Astro daemon on the selected port, after
  # clearing verified stale FDS processes above, so this stop remains scoped
  # to the local website workflow rather than to an unrelated application.
  & $nodePath $astroEntry dev stop | Out-Null
}
