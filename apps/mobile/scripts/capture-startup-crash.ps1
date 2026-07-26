# Capture EliteFlow Android startup crash via adb logcat.
# Prerequisites: USB debugging enabled; phone connected and authorized.
$ErrorActionPreference = "Stop"
$adb = Join-Path $PSScriptRoot "..\..\..\tools\platform-tools\adb.exe"
if (-not (Test-Path $adb)) {
  $adb = Join-Path $PSScriptRoot "..\..\tools\platform-tools\adb.exe"
}
if (-not (Test-Path $adb)) {
  throw "adb not found at tools/platform-tools/adb.exe"
}

$pkg = "com.eliteflow.mobile"
$outDir = Join-Path $env:TEMP "eliteflow-logcat"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$outFile = Join-Path $outDir ("crash-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".txt")

Write-Host "Using adb: $adb"
& $adb start-server | Out-Null
Write-Host "Waiting for a device (enable USB debugging and plug in the phone)..."
& $adb wait-for-device
& $adb devices -l

Write-Host "Clearing logcat buffer..."
& $adb logcat -c

Write-Host "Force-stopping $pkg (if installed)..."
& $adb shell am force-stop $pkg 2>$null

Write-Host "Launching $pkg ..."
& $adb shell monkey -p $pkg -c android.intent.category.LAUNCHER 1

Write-Host "Capturing 12 seconds of logcat -> $outFile"
$job = Start-Job -ScriptBlock {
  param($adb, $outFile)
  & $adb logcat -v threadtime *:E ReactNative:V ReactNativeJS:V Expo:V ExpoUpdates:V AndroidRuntime:E ActivityManager:I libc:F DEBUG:F > $outFile
} -ArgumentList $adb, $outFile

Start-Sleep -Seconds 12
Stop-Job $job -ErrorAction SilentlyContinue
Receive-Job $job -ErrorAction SilentlyContinue | Out-Null
Remove-Job $job -Force -ErrorAction SilentlyContinue

Write-Host "==== CRASH / FATAL / Exception lines ===="
Select-String -Path $outFile -Pattern "FATAL|AndroidRuntime|Exception|Error|expo\.modules\.updates|No launchable|SoLoader|ReactNative|EliteFlow|com\.eliteflow" |
  Select-Object -First 120 |
  ForEach-Object { $_.Line }

Write-Host ""
Write-Host "Full log saved: $outFile"
