# Run single debug test
$job = Start-Job -ScriptBlock {
    Set-Location "D:\Work\project_school"
    npx playwright test tests/browser/debug-login.spec.js --project=chromium --timeout=30000 --workers=1 --reporter=list 2>&1
}

Write-Host "Debug test started..."
$result = Wait-Job -Job $job -Timeout 90
if ($result) {
    $output = Receive-Job -Job $job
    Write-Host $output
} else {
    Write-Host "Timed out - checking state..."
    Receive-Job -Job $job
}

Remove-Job -Job $job -Force
