$ErrorActionPreference = 'Stop'
$sourceRoot = Split-Path -Parent $PSScriptRoot
$launcherSource = Join-Path $PSScriptRoot 'SourceLauncher.cs'
$launcherIcon = Join-Path $sourceRoot 'assets\sentinel-camera.ico'
$launcherOutput = Join-Path $sourceRoot 'Sentinel.exe'
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path -LiteralPath $compiler)) {
    $compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe'
}
if (-not (Test-Path -LiteralPath $compiler)) {
    throw 'The Windows .NET Framework compiler is unavailable.'
}
if ((Test-Path -LiteralPath $launcherOutput) -and
    (Get-Item -LiteralPath $launcherOutput).LastWriteTimeUtc -ge
        (Get-Item -LiteralPath $launcherSource).LastWriteTimeUtc -and
    (Get-Item -LiteralPath $launcherOutput).LastWriteTimeUtc -ge
        (Get-Item -LiteralPath $launcherIcon).LastWriteTimeUtc) {
    Write-Output $launcherOutput
    exit 0
}
$pendingLauncher = Join-Path $sourceRoot ('Sentinel.build-' + [guid]::NewGuid().ToString('N') + '.exe')
try {
    & $compiler /nologo /target:winexe /optimize+ "/win32icon:$launcherIcon" /reference:System.Windows.Forms.dll "/out:$pendingLauncher" $launcherSource
    if ($LASTEXITCODE -ne 0) { throw 'Could not build the Sentinel source launcher.' }
    Move-Item -LiteralPath $pendingLauncher -Destination $launcherOutput -Force
} finally {
    if (Test-Path -LiteralPath $pendingLauncher) { Remove-Item -LiteralPath $pendingLauncher }
}
Write-Output $launcherOutput
