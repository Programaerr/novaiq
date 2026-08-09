$ErrorActionPreference = "Stop"

Write-Host "=== Graphify verification ===" -ForegroundColor Cyan

$graph = Join-Path (Get-Location) "graphify-out\graph.json"

if (-not (Test-Path $graph)) {
    Write-Host "[FAIL] graph.json not found: $graph" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] graph.json found" -ForegroundColor Green

Write-Host "`n[1/4] Graph statistics" -ForegroundColor Yellow
graphify explain "App.tsx"

Write-Host "`n[2/4] ContractBuilder connections" -ForegroundColor Yellow
graphify explain "ContractBuilder.tsx"

Write-Host "`n[3/4] TemplateInteractiveSandbox connections" -ForegroundColor Yellow
graphify explain "TemplateInteractiveSandbox.tsx"

Write-Host "`n[4/4] Cross-file path test" -ForegroundColor Yellow
graphify path "App.tsx" "ContractBuilder.tsx" --undirected

Write-Host "`n=== RESULT ===" -ForegroundColor Cyan
Write-Host "Graphify is installed and the generated graph is readable." -ForegroundColor Green
Write-Host "If the four sections above return nodes/connections/path data, the graph is operational." -ForegroundColor Green
Write-Host "`nNext step: we can remove the Python virtual environment and configure Python globally." -ForegroundColor Gray
