param([string]$OutputDirectory = (Join-Path $PSScriptRoot '../downloads'))
$ErrorActionPreference = 'Stop'
$compilerPath = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
if (!(Test-Path -LiteralPath $compilerPath)) { $compilerPath = Join-Path $env:WINDIR 'Microsoft.NET/Framework/v4.0.30319/csc.exe' }
if (!(Test-Path -LiteralPath $compilerPath)) { throw '.NET Framework 4.x mit C#-Compiler wird benötigt.' }
$null = New-Item -ItemType Directory -Path $OutputDirectory -Force
$outputPath = Join-Path $OutputDirectory 'Pirate-Token-Hotkeys.exe'
& $compilerPath /nologo /target:winexe /optimize+ /platform:anycpu /codepage:65001 "/out:$outputPath" "/win32manifest:$(Join-Path $PSScriptRoot 'app.manifest')" /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.Net.Http.dll /r:System.Web.Extensions.dll (Join-Path $PSScriptRoot 'Hotkeys.cs') (Join-Path $PSScriptRoot 'SelfTests.cs')
if ($LASTEXITCODE -ne 0) { throw 'Kompilierung fehlgeschlagen.' }
Get-FileHash -LiteralPath $outputPath -Algorithm SHA256
