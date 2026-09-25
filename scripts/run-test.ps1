# Run Playwright tests with timeout
$ErrorActionPreference = "Continue"
$startTime = Get-Date
$timeoutSeconds = 120

$job = Start-Job -ScriptBlock {
    Set-Location "D:\Work\project_school"
    npx playwright test tests/browser/01_admin_flow.spec.js --project=chromium --timeout=20000 --workers=1 --reporter=list 2>&1
}

Write-Host "Test job started, waiting up to $timeoutSeconds seconds..."
$completed = Wait-Job -Job $job -Timeout $timeoutSeconds

if ($completed) {
    Write-Host "Tests completed!"
    $result = Receive-Job -Job $job
    Write-Host $result
} else {
    Write-Host "Tests timed out after $timeoutSeconds seconds"
    Stop-Job -Job $job
}

Remove-Job -Job $job -Force
Write-Host "Done"
