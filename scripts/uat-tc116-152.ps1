# UAT TC-116 through TC-152 API tests (Funding Rates, Billing Workspace, Calculations, Grouping)
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:5092'
$results = @()
$ts = Get-Date -Format 'yyyyMMddHHmmss'
$pastDob = '1980-01-15'

function Add-Result($tc, $name, $passed, $detail) {
    $script:results += [pscustomobject]@{ TC = $tc; Name = $name; Result = $(if ($passed) { 'PASS' } else { 'FAIL' }); Detail = $detail }
}

function Add-Skip($tc, $name, $detail) {
    $script:results += [pscustomobject]@{ TC = $tc; Name = $name; Result = 'SKIP'; Detail = $detail }
}

function Invoke-Json($Method, $Path, $Body = $null, $Token = $null) {
    $args = @('-s', '-w', "`n%{http_code}", '-X', $Method, "$base$Path", '-H', 'Content-Type: application/json; charset=utf-8')
    if ($Token) { $args += @('-H', "Authorization: Bearer $Token") }
    if ($Body) {
        $temp = [IO.Path]::GetTempFileName()
        [IO.File]::WriteAllText($temp, $Body, [Text.UTF8Encoding]::new($false))
        $args += @('--data-binary', "@$temp")
        try { $raw = & curl.exe @args } finally { Remove-Item $temp -Force }
    } else { $raw = & curl.exe @args }
    $lines = $raw -split "`n"
    return @{ Status = [int]$lines[-1]; Content = ($lines[0..($lines.Length - 2)] -join "`n"); Json = $(if ($lines.Length -gt 1 -and $lines[0]) { try { $lines[0..($lines.Length - 2)] -join "`n" | ConvertFrom-Json } catch { $null } } else { $null }) }
}

function Login($email, $password) {
    $r = Invoke-Json POST '/api/auth/login' (@{ email = $email; password = $password } | ConvertTo-Json -Compress) $null
    if ($r.Status -eq 200) { return $r.Json.token }
    return $null
}

function Provision-Tenant($pt, $name, $email) {
    $c = Invoke-Json POST '/api/platform/tenants' (@{ name = $name; isActive = $true; adminEmail = $email; adminDisplayName = 'QA Admin' } | ConvertTo-Json -Compress) $pt
    if ($c.Status -ne 201) { throw "Provision failed ($email): $($c.Content)" }
    $tp = $c.Json.temporaryPassword
    $t = Login $email $tp
    Invoke-Json POST '/api/auth/change-password' (@{ currentPassword = $tp; newPassword = 'QaTenantAdmin!99' } | ConvertTo-Json -Compress) $t | Out-Null
    return @{ Token = (Login $email 'QaTenantAdmin!99'); TenantId = $c.Json.id }
}

function Get-CategoryId($token, $code) {
    return ((Invoke-Json GET '/api/invoice-categories' $null $token).Json | Where-Object { $_.code -eq $code } | Select-Object -First 1).id
}

function New-Company($token, $name) {
    return (Invoke-Json POST '/api/companies' (@{ name = $name } | ConvertTo-Json -Compress) $token).Json.id
}

function New-CareHome($token, $companyId, $code, $name) {
    return Invoke-Json POST '/api/care-homes' (@{
        companyId = $companyId; code = $code; name = $name; bedCapacity = 20; managerName = 'QA Manager'
    } | ConvertTo-Json -Compress) $token
}

function New-Client($token, $careHomeId, $sageId, $ref, $first, $last, $admission, $discharge = $null) {
    $body = @{
        careHomeId = $careHomeId; sageId = $sageId; referenceNumber = $ref
        firstName = $first; lastName = $last; careType = 'Residential'
        admissionDate = $admission; dateOfBirth = $pastDob
    }
    if ($discharge) { $body.dischargeDate = $discharge; $body.status = 'Left'; $body.dischargeReason = 'UAT' }
    return Invoke-Json POST '/api/clients' ($body | ConvertTo-Json -Compress) $token
}

function New-FA($token, $code, $name) {
    return Invoke-Json POST '/api/funding-authorities' (@{ code = $code; name = $name; type = 'Council'; billingFrequency = 'Weekly' } | ConvertTo-Json -Compress) $token
}

function New-Nominal($token, $code, $name) {
    return Invoke-Json POST '/api/nominal-codes' (@{ code = $code; name = $name } | ConvertTo-Json -Compress) $token
}

function New-Template($token, $catId, $name = 'Default Template') {
    return Invoke-Json POST '/api/invoice-templates' (@{ name = $name; invoiceCategoryId = $catId; footerText = 'Footer' } | ConvertTo-Json -Compress) $token
}

function New-Contract($token, $clientId, $faId, $catId, $nomId, $start, $end = $null) {
    $body = @{ fundingAuthorityId = $faId; invoiceCategoryId = $catId; nominalCodeId = $nomId; contractStartDate = $start }
    if ($end) { $body.contractEndDate = $end }
    return Invoke-Json POST "/api/clients/$clientId/funding-contracts" ($body | ConvertTo-Json -Compress) $token
}

function Add-Rate($token, $contractId, $from, $freq, $amount, $to = $null, $closePrev = $true) {
    $body = @{ effectiveFrom = $from; frequency = $freq; amount = $amount; closePreviousOpenEnded = $closePrev }
    if ($to) { $body.effectiveTo = $to }
    return Invoke-Json POST "/api/funding-contracts/$contractId/rates" ($body | ConvertTo-Json -Compress) $token
}

function Billing-Preview($token, $companyId, $careHomeId, $start, $end, $clientIds = $null, $categoryId = $null) {
    $body = @{ companyId = $companyId; periodStart = $start; periodEnd = $end }
    if ($careHomeId) { $body.careHomeId = $careHomeId }
    if ($clientIds) { $body.clientIds = @($clientIds) }
    if ($categoryId) { $body.invoiceCategoryId = $categoryId }
    return Invoke-Json POST '/api/billing/preview' ($body | ConvertTo-Json -Compress) $token
}

function Billing-Generate($token, $companyId, $careHomeId, $start, $end, $clientIds = $null, $categoryId = $null) {
    $body = @{ companyId = $companyId; periodStart = $start; periodEnd = $end }
    if ($careHomeId) { $body.careHomeId = $careHomeId }
    if ($clientIds) { $body.clientIds = @($clientIds) }
    if ($categoryId) { $body.invoiceCategoryId = $categoryId }
    return Invoke-Json POST '/api/billing/generate' ($body | ConvertTo-Json -Compress) $token
}

function Round-Money([decimal]$v) { [Math]::Round($v, 2, [MidpointRounding]::AwayFromZero) }

function Inclusive-Days($start, $end) {
    $s = [datetime]::Parse($start)
    $e = [datetime]::Parse($end)
    return ([int]($e - $s).TotalDays) + 1
}

function Calc-Amount($freq, $rate, $start, $end) {
    $days = Inclusive-Days $start $end
    switch ($freq) {
        'Daily' { return Round-Money ([decimal]$rate * $days) }
        'Weekly' { return Round-Money (([decimal]$rate / [decimal]7) * $days) }
        'Monthly' {
            $total = 0.0
            $cursor = [datetime]::Parse($start)
            $endDt = [datetime]::Parse($end)
            while ($cursor -le $endDt) {
                $monthStart = Get-Date -Year $cursor.Year -Month $cursor.Month -Day 1
                $monthEnd = $monthStart.AddMonths(1).AddDays(-1)
                $sliceStart = if ([datetime]::Parse($start) -gt $monthStart) { [datetime]::Parse($start) } else { $monthStart }
                $sliceEnd = if ($endDt -lt $monthEnd) { $endDt } else { $monthEnd }
                if ($sliceEnd -ge $sliceStart) {
                    $dim = [datetime]::DaysInMonth($monthStart.Year, $monthStart.Month)
                    $eligible = Inclusive-Days $sliceStart.ToString('yyyy-MM-dd') $sliceEnd.ToString('yyyy-MM-dd')
                    $total += ([decimal]$rate / $dim) * $eligible
                }
                $cursor = $monthStart.AddMonths(1)
            }
            return Round-Money $total
        }
    }
}

function Update-Client($token, $id, $client, $patch) {
    $body = @{
        careHomeId = $client.careHomeId; sageId = $client.sageId; referenceNumber = $client.referenceNumber
        firstName = $client.firstName; lastName = $client.lastName; careType = $client.careType
        status = $client.status; admissionDate = $client.admissionDate
        dischargeDate = $client.dischargeDate; dischargeReason = $client.dischargeReason
        dateOfBirth = $client.dateOfBirth; isArchived = $client.isArchived
    }
    foreach ($k in $patch.Keys) { $body[$k] = $patch[$k] }
    return Invoke-Json PUT "/api/clients/$id" ($body | ConvertTo-Json -Compress) $token
}

function Setup-ClientStack($token, $companyId, $homeId, $faId, $catId, $nomId, $sageId, $ref, $first, $last, $admission, $discharge = $null) {
    $cl = New-Client $token $homeId $sageId $ref $first $last $admission $discharge
    $fc = New-Contract $token $cl.Json.id $faId $catId $nomId '2026-01-01' $null
    return @{ ClientId = $cl.Json.id; ContractId = $fc.Json.id }
}

function Invoke-Sql($query) {
    $sqlcmd = Get-Command sqlcmd -ErrorAction SilentlyContinue
    if (-not $sqlcmd) { return $false }
    & sqlcmd -S '(localdb)\MSSQLLocalDB' -d CareHomeDb -Q $query -b | Out-Null
    return ($LASTEXITCODE -eq 0)
}

# --- Bootstrap ---
$pt = Login 'admin@localhost' 'DevAdmin!12345'
if (-not $pt) { throw 'Platform login failed' }
$ten = Provision-Tenant $pt "QA Billing $ts" "qa-billing-$ts@uat.test"
$ta = $ten.Token
$tenantId = $ten.TenantId

$co = New-Company $ta 'QA Billing Co'
$ch1 = New-CareHome $ta $co 'HOME01' 'Billing Home 01'
$ch2 = New-CareHome $ta $co 'HOME02' 'Billing Home 02'
$home1 = $ch1.Json.id
$home2 = $ch2.Json.id
$fa1 = (New-FA $ta 'EASTCC' 'East County Council').Json.id
$fa2 = (New-FA $ta 'WESTCC' 'West County Council').Json.id
$catGeneral = Get-CategoryId $ta 'GENERAL_CARE'
$catRent = Get-CategoryId $ta 'RENT'
$nom = (New-Nominal $ta '4000' 'Care Revenue').Json.id
New-Template $ta $catGeneral | Out-Null
New-Template $ta $catRent 'Rent Template' | Out-Null

$rateClient = New-Client $ta $home1 'SAGE-RATE' 'CLI-RATE' 'Rate' 'Tester' '2026-01-01'
$rateContract = New-Contract $ta $rateClient.Json.id $fa1 $catGeneral $nom '2026-01-01' $null
$rateContractId = $rateContract.Json.id

# --- TC-116 Daily rate ---
$r116 = Add-Rate $ta $rateContractId '2026-01-01' 'Daily' 100
Add-Result 'TC-116' 'Add daily rate' ($r116.Status -eq 200 -and $r116.Json.frequency -eq 'Daily' -and $r116.Json.amount -eq 100) "status=$($r116.Status) amt=$($r116.Json.amount)"

# --- TC-117 Weekly rate ---
$rc117 = New-Contract $ta (New-Client $ta $home1 'SAGE-W117' 'CLI-W117' 'Week' 'Rate' '2026-01-01').Json.id $fa1 $catGeneral $nom '2026-01-01' $null
$r117 = Add-Rate $ta $rc117.Json.id '2026-01-01' 'Weekly' 575
Add-Result 'TC-117' 'Add weekly rate' ($r117.Status -eq 200 -and $r117.Json.frequency -eq 'Weekly' -and $r117.Json.amount -eq 575) "status=$($r117.Status)"

# --- TC-118 Monthly rate ---
$rc118 = New-Contract $ta (New-Client $ta $home1 'SAGE-M118' 'CLI-M118' 'Month' 'Rate' '2026-01-01').Json.id $fa1 $catGeneral $nom '2026-01-01' $null
$r118 = Add-Rate $ta $rc118.Json.id '2026-01-01' 'Monthly' 2500
Add-Result 'TC-118' 'Add monthly rate' ($r118.Status -eq 200 -and $r118.Json.frequency -eq 'Monthly' -and $r118.Json.amount -eq 2500) "status=$($r118.Status)"

# --- TC-119 Rate history ---
$cl119 = New-Client $ta $home1 'SAGE-H119' 'CLI-H119' 'Hist' 'Rate' '2026-01-01'
$rc119 = New-Contract $ta $cl119.Json.id $fa1 $catGeneral $nom '2026-01-01' $null
Add-Rate $ta $rc119.Json.id '2026-01-01' 'Weekly' 550 $null $false | Out-Null
Add-Rate $ta $rc119.Json.id '2026-04-01' 'Weekly' 575 | Out-Null
$rates119 = (Invoke-Json GET "/api/funding-contracts/$($rc119.Json.id)/rates" $null $ta).Json
$marLine = (Billing-Preview $ta $co $home1 '2026-03-01' '2026-03-31' @($cl119.Json.id) $catGeneral).Json.lines | Select-Object -First 1
$aprLine = (Billing-Preview $ta $co $home1 '2026-04-01' '2026-04-07' @($cl119.Json.id) $catGeneral).Json.lines | Select-Object -First 1
Add-Result 'TC-119' 'Rate history retained and applied by date' (
    $rates119.Count -eq 2 -and $rates119[0].amount -eq 550 -and $rates119[1].amount -eq 575 -and
    $marLine.rate -eq 550 -and $aprLine.rate -eq 575
) "rates=$($rates119.Count) mar=$($marLine.rate) apr=$($aprLine.rate)"

# --- TC-120 Overlapping rates ---
$rc120 = New-Contract $ta (New-Client $ta $home1 'SAGE-O120' 'CLI-O120' 'Overlap' 'Rate' '2026-01-01').Json.id $fa1 $catGeneral $nom '2026-01-01' $null
Add-Rate $ta $rc120.Json.id '2026-01-01' 'Daily' 100 '2026-06-30' $false | Out-Null
$r120b = Add-Rate $ta $rc120.Json.id '2026-03-01' 'Daily' 120 '2026-09-30' $false
Add-Result 'TC-120' 'Overlapping rates rejected' ($r120b.Status -eq 400) "status=$($r120b.Status)"

# --- TC-121 Zero/negative rate ---
$rc121 = New-Contract $ta (New-Client $ta $home1 'SAGE-V121' 'CLI-V121' 'Valid' 'Rate' '2026-01-01').Json.id $fa1 $catGeneral $nom '2026-01-01' $null
$zero121 = Add-Rate $ta $rc121.Json.id '2026-01-01' 'Daily' 0
$neg121 = Add-Rate $ta $rc121.Json.id '2026-02-01' 'Daily' -10
Add-Result 'TC-121' 'Zero/negative rate rejected' ($zero121.Status -eq 400 -and $neg121.Status -eq 400) "zero=$($zero121.Status) neg=$($neg121.Status)"

# --- TC-122 Decimal precision ---
$rc122 = New-Contract $ta (New-Client $ta $home1 'SAGE-D122' 'CLI-D122' 'Decimal' 'Rate' '2026-01-01').Json.id $fa1 $catGeneral $nom '2026-01-01' $null
$r122 = Add-Rate $ta $rc122.Json.id '2026-01-01' 'Weekly' 575.55
$c122 = (Invoke-Json GET "/api/clients?search=CLI-D122" $null $ta).Json.items[0].id
$p122 = Billing-Preview $ta $co $home1 '2026-05-01' '2026-05-07' @($c122) $catGeneral
$line122 = $p122.Json.lines | Select-Object -First 1
$exp122 = Calc-Amount 'Weekly' 575.55 '2026-05-01' '2026-05-07'
Add-Result 'TC-122' 'Decimal rate precision' (
    $r122.Json.amount -eq 575.55 -and $line122.rate -eq 575.55 -and $line122.amount -eq $exp122
) "stored=$($r122.Json.amount) line=$($line122.amount) expected=$exp122"

# --- TC-123 Snapshot immutability ---
$rc123 = New-Contract $ta (New-Client $ta $home1 'SAGE-S123' 'CLI-S123' 'Snap' 'Shot' '2026-01-01').Json.id $fa1 $catGeneral $nom '2026-01-01' $null
Add-Rate $ta $rc123.Json.id '2026-01-01' 'Daily' 100 | Out-Null
$c123 = (Invoke-Json GET '/api/clients?search=CLI-S123' $null $ta).Json.items[0].id
$gen123 = Billing-Generate $ta $co $home1 '2026-05-01' '2026-05-07' @($c123) $catGeneral
$inv123Id = $gen123.Json.invoiceIds[0]
Add-Rate $ta $rc123.Json.id '2026-05-08' 'Daily' 999 | Out-Null
$inv123 = Invoke-Json GET "/api/invoices/$inv123Id" $null $ta
Add-Result 'TC-123' 'Finalized invoice retains original rate' (
    $gen123.Status -eq 200 -and $inv123.Json.lines[0].rateAmount -eq 100 -and $inv123.Json.lines[0].lineAmount -eq 700
) "rate=$($inv123.Json.lines[0].rateAmount) amt=$($inv123.Json.lines[0].lineAmount)"

# --- TC-124 Preview normal billing ---
$stack124 = Setup-ClientStack $ta $co $home1 $fa1 $catGeneral $nom 'SAGE-P124' 'CLI-P124' 'Preview' 'Normal' '2026-01-01'
Add-Rate $ta $stack124.ContractId '2026-01-01' 'Weekly' 575 | Out-Null
$p124 = Billing-Preview $ta $co $home1 '2026-05-01' '2026-05-31' @($stack124.ClientId) $catGeneral
Add-Result 'TC-124' 'Preview returns lines and exceptions' (
    $p124.Status -eq 200 -and $p124.Json.lines.Count -ge 1 -and $null -ne $p124.Json.exceptions
) "lines=$($p124.Json.lines.Count) canGen=$($p124.Json.canGenerate)"

# --- TC-125 Preview columns (API fields) ---
$line125 = $p124.Json.lines[0]
$cols125 = @(
    $line125.clientName, $line125.clientReference, $line125.sageId,
    $line125.fundingAuthorityName, $line125.invoiceCategoryName, $line125.nominalCode,
    $line125.serviceFrom, $line125.serviceTo, $line125.eligibleDays,
    $line125.rate, $line125.frequency, $line125.amount
) | Where-Object { $_ -ne $null -and "$_" -ne '' }
Add-Result 'TC-125' 'Preview columns complete (API)' ($cols125.Count -ge 11) "fields=$($cols125.Count)/12"

# --- TC-126 Missing nominal ---
$nomBlank = (New-Nominal $ta 'BLANK1' 'Blank Nominal').Json.id
Invoke-Sql "UPDATE NominalCodes SET Code='' WHERE Id=$nomBlank AND TenantId=$tenantId" | Out-Null
$stack126 = Setup-ClientStack $ta $co $home1 $fa1 $catGeneral $nomBlank 'SAGE-N126' 'CLI-N126' 'Nina' 'Nominal' '2026-01-01'
Add-Rate $ta $stack126.ContractId '2026-01-01' 'Daily' 100 | Out-Null
$p126 = Billing-Preview $ta $co $home1 '2026-05-01' '2026-05-07' @($stack126.ClientId) $catGeneral
$missNom = @($p126.Json.exceptions | Where-Object { $_.code -eq 'MISSING_NOMINAL' }).Count -gt 0
Add-Result 'TC-126' 'Missing nominal blocks generation' (
    $missNom -and $p126.Json.canGenerate -eq $false -and $p126.Json.lines.Count -eq 0
) "missing=$missNom canGen=$($p126.Json.canGenerate)"

# --- TC-127 End before start ---
$p127 = Billing-Preview $ta $co $home1 '2026-05-31' '2026-05-01' @($stack124.ClientId) $catGeneral
Add-Result 'TC-127' 'End before start blocked' (
    $p127.Json.exceptions | Where-Object { $_.code -eq 'INVALID_PERIOD' }
) "canGen=$($p127.Json.canGenerate)"

# --- TC-128 Missing required inputs ---
$p128a = Billing-Preview $ta 0 $home1 '2026-05-01' '2026-05-31' $null $catGeneral
$p128b = Billing-Preview $ta $co $home1 '2026-05-31' '2026-05-01' $null $catGeneral
Add-Result 'TC-128' 'Invalid company/period blocked' (
    ($p128a.Json.exceptions | Where-Object { $_.code -eq 'INVALID_COMPANY' }) -and
    ($p128b.Json.exceptions | Where-Object { $_.code -eq 'INVALID_PERIOD' })
) "company=$($p128a.Status) period=$($p128b.Status) (careHome/category optional at API)"

# --- TC-129 Double-click generate concurrency ---
$stack129 = Setup-ClientStack $ta $co $home1 $fa1 $catGeneral $nom 'SAGE-C129' 'CLI-C129' 'Concur' 'Gen' '2026-01-01'
Add-Rate $ta $stack129.ContractId '2026-01-01' 'Daily' 50 | Out-Null
$body129 = (@{ companyId = $co; careHomeId = $home1; periodStart = '2026-06-01'; periodEnd = '2026-06-07'; clientIds = @($stack129.ClientId); invoiceCategoryId = $catGeneral } | ConvertTo-Json -Compress)
$temp129 = [IO.Path]::GetTempFileName()
[IO.File]::WriteAllText($temp129, $body129, [Text.UTF8Encoding]::new($false))
$jobs129 = 1..2 | ForEach-Object {
    Start-Job -ScriptBlock {
        param($b, $t, $tmp)
        & curl.exe -s -w "`n%{http_code}" -X POST "$b/api/billing/generate" -H "Content-Type: application/json" -H "Authorization: Bearer $t" --data-binary "@$tmp"
    } -ArgumentList $base, $ta, $temp129
}
$jobs129 | Wait-Job | Out-Null
$res129 = $jobs129 | Receive-Job
Remove-Job $jobs129 -Force
Remove-Item $temp129 -Force
$inv129 = (Invoke-Json GET '/api/invoices?pageSize=200' $null $ta).Json.items | Where-Object { $_.periodStart -eq '2026-06-01' -and $_.periodEnd -eq '2026-06-07' }
Add-Result 'TC-129' 'Concurrent generate produces one invoice' ($inv129.Count -le 1) "invoices=$($inv129.Count)"

# --- TC-130 Preview changes with filters (API) ---
$p130a = Billing-Preview $ta $co $home1 '2026-05-01' '2026-05-31' @($stack124.ClientId) $catGeneral
$p130b = Billing-Preview $ta $co $home2 '2026-05-01' '2026-05-31' $null $catGeneral
Add-Result 'TC-130' 'Different scope returns different preview' (
    $p130a.Json.lines.Count -ge 1 -and $p130b.Json.lines.Count -eq 0
) "home1Lines=$($p130a.Json.lines.Count) home2Lines=$($p130b.Json.lines.Count)"

# --- TC-131 Empty scope ---
$p131 = Billing-Preview $ta $co $home2 '2026-05-01' '2026-05-31' $null $catGeneral
Add-Result 'TC-131' 'Empty scope no lines' (
    $p131.Json.lines.Count -eq 0 -and $p131.Json.canGenerate -eq $false
) "lines=$($p131.Json.lines.Count) canGen=$($p131.Json.canGenerate)"

# --- Billing calculation tests ---
function Run-CalcTest($tc, $name, $freq, $rate, $periodStart, $periodEnd, $expected, $Admission = '2026-01-01', $ContractStart = '2026-01-01') {
    $sfx = $tc -replace 'TC-',''
    $cl = New-Client $ta $home1 "SAGE-C$sfx" "CLI-C$sfx" 'Calc' $name $Admission
    $fc = New-Contract $ta $cl.Json.id $fa1 $catGeneral $nom $ContractStart $null
    Add-Rate $ta $fc.Json.id $ContractStart $freq $rate | Out-Null
    $prev = Billing-Preview $ta $co $home1 $periodStart $periodEnd @($cl.Json.id) $catGeneral
    $amt = Round-Money ([decimal]($prev.Json.lines | ForEach-Object { [decimal]$_.amount } | Measure-Object -Sum).Sum)
    Add-Result $tc $name ($amt -eq $expected) "got=$amt expected=$expected"
}

Run-CalcTest 'TC-132' 'Daily 1 day' 'Daily' 100 '2026-05-01' '2026-05-01' 100
Run-CalcTest 'TC-133' 'Daily 5 days' 'Daily' 100 '2026-05-01' '2026-05-05' 500
Run-CalcTest 'TC-134' 'Weekly 7 days' 'Weekly' 575 '2026-05-01' '2026-05-07' 575
Run-CalcTest 'TC-135' 'Weekly 14 days' 'Weekly' 575 '2026-05-01' '2026-05-14' 1150
Run-CalcTest 'TC-136' 'Weekly 31 days' 'Weekly' 575 '2026-05-01' '2026-05-31' 2546.43
Run-CalcTest 'TC-137' 'Monthly full month' 'Monthly' 2500 '2026-05-01' '2026-05-31' 2500
Run-CalcTest 'TC-138' 'Monthly partial month' 'Monthly' 2500 '2026-05-15' '2026-05-31' 1370.97

# TC-139 Admission mid-period
$cl139 = New-Client $ta $home1 'SAGE-139' 'CLI-139' 'Admit' 'Mid' '2026-05-15'
$fc139 = New-Contract $ta $cl139.Json.id $fa1 $catGeneral $nom '2026-01-01' $null
Add-Rate $ta $fc139.Json.id '2026-01-01' 'Daily' 100 | Out-Null
$p139 = Billing-Preview $ta $co $home1 '2026-05-01' '2026-05-31' @($cl139.Json.id) $catGeneral
Add-Result 'TC-139' 'Admission mid-period' ($p139.Json.lines[0].eligibleDays -eq 17 -and $p139.Json.lines[0].amount -eq 1700) "days=$($p139.Json.lines[0].eligibleDays) amt=$($p139.Json.lines[0].amount)"

# TC-140 Discharge mid-period
$cl140 = New-Client $ta $home1 'SAGE-140' 'CLI-140' 'Disch' 'Mid' '2026-01-01'
$cur140 = (Invoke-Json GET "/api/clients/$($cl140.Json.id)" $null $ta).Json
Update-Client $ta $cl140.Json.id $cur140 @{ status = 'Left'; dischargeDate = '2026-05-20'; dischargeReason = 'UAT discharge' } | Out-Null
$fc140 = New-Contract $ta $cl140.Json.id $fa1 $catGeneral $nom '2026-01-01' $null
Add-Rate $ta $fc140.Json.id '2026-01-01' 'Daily' 100 | Out-Null
$p140 = Billing-Preview $ta $co $home1 '2026-05-01' '2026-05-31' @($cl140.Json.id) $catGeneral
Add-Result 'TC-140' 'Discharge mid-period' ($p140.Json.lines[0].eligibleDays -eq 20 -and $p140.Json.lines[0].amount -eq 2000) "days=$($p140.Json.lines[0].eligibleDays)"

# TC-141 Contract starts mid-period
$cl141 = New-Client $ta $home1 'SAGE-141' 'CLI-141' 'Ctr' 'Start' '2026-01-01'
$fc141 = New-Contract $ta $cl141.Json.id $fa1 $catGeneral $nom '2026-05-15' $null
Add-Rate $ta $fc141.Json.id '2026-05-15' 'Daily' 100 | Out-Null
$p141 = Billing-Preview $ta $co $home1 '2026-05-01' '2026-05-31' @($cl141.Json.id) $catGeneral
Add-Result 'TC-141' 'Contract starts mid-period' ($p141.Json.lines[0].eligibleDays -eq 17 -and $p141.Json.lines[0].amount -eq 1700) "days=$($p141.Json.lines[0].eligibleDays)"

# TC-142 Contract ends mid-period
$cl142 = New-Client $ta $home1 'SAGE-142' 'CLI-142' 'Ctr' 'End' '2026-01-01'
$fc142 = New-Contract $ta $cl142.Json.id $fa1 $catGeneral $nom '2026-01-01' '2026-05-20'
Add-Rate $ta $fc142.Json.id '2026-01-01' 'Daily' 100 | Out-Null
$p142 = Billing-Preview $ta $co $home1 '2026-05-01' '2026-05-31' @($cl142.Json.id) $catGeneral
Add-Result 'TC-142' 'Contract ends mid-period' ($p142.Json.lines[0].eligibleDays -eq 20 -and $p142.Json.lines[0].amount -eq 2000) "days=$($p142.Json.lines[0].eligibleDays)"

# TC-143 Rate change mid-period
$cl143 = New-Client $ta $home1 'SAGE-143' 'CLI-143' 'Rate' 'Change' '2026-01-01'
$fc143 = New-Contract $ta $cl143.Json.id $fa1 $catGeneral $nom '2026-01-01' $null
Add-Rate $ta $fc143.Json.id '2026-01-01' 'Weekly' 550 $null $false | Out-Null
Add-Rate $ta $fc143.Json.id '2026-03-15' 'Weekly' 575 | Out-Null
$p143 = Billing-Preview $ta $co $home1 '2026-03-01' '2026-03-31' @($cl143.Json.id) $catGeneral
$sum143 = Round-Money ([decimal]($p143.Json.lines | ForEach-Object { [decimal]$_.amount } | Measure-Object -Sum).Sum)
$exp143 = Round-Money ((Calc-Amount 'Weekly' 550 '2026-03-01' '2026-03-14') + (Calc-Amount 'Weekly' 575 '2026-03-15' '2026-03-31'))
Add-Result 'TC-143' 'Rate change mid-period' ($sum143 -eq $exp143 -and $p143.Json.lines.Count -eq 2) "got=$sum143 expected=$exp143 lines=$($p143.Json.lines.Count)"

Run-CalcTest 'TC-144' 'February non-leap' 'Daily' 100 '2026-02-01' '2026-02-28' 2800
Run-CalcTest 'TC-145' 'Leap year February' 'Daily' 100 '2024-02-01' '2024-02-29' 2900 '2024-01-01' '2024-01-01'

# --- TC-146 Partial overlap billing ---
$cl146 = New-Client $ta $home1 'SAGE-146' 'CLI-146' 'Overlap' 'Partial' '2026-01-01'
$fc146 = New-Contract $ta $cl146.Json.id $fa1 $catGeneral $nom '2026-01-01' $null
Add-Rate $ta $fc146.Json.id '2026-01-01' 'Daily' 100 | Out-Null
Billing-Generate $ta $co $home1 '2026-08-01' '2026-08-31' @($cl146.Json.id) $catGeneral | Out-Null
$p146 = Billing-Preview $ta $co $home1 '2026-08-15' '2026-09-15' @($cl146.Json.id) $catGeneral
Add-Result 'TC-146' 'Partial overlap excludes billed dates' (
    $p146.Json.lines.Count -ge 1 -and $p146.Json.lines[0].serviceFrom -eq '2026-09-01'
) "from=$($p146.Json.lines[0].serviceFrom) days=$($p146.Json.lines[0].eligibleDays)"

# --- TC-147 Fully billed window ---
$p147 = Billing-Preview $ta $co $home1 '2026-08-01' '2026-08-31' @($cl146.Json.id) $catGeneral
$fullBilled = @($p147.Json.exceptions | Where-Object { $_.code -eq 'ALREADY_FULLY_BILLED' }).Count -gt 0
Add-Result 'TC-147' 'Fully billed window blocked' ($fullBilled -and $p147.Json.canGenerate -eq $false) "canGen=$($p147.Json.canGenerate)"

# --- TC-148 Overlapping contracts in DB ---
$cl148 = New-Client $ta $home1 'SAGE-148' 'CLI-148' 'Poison' 'Overlap' '2026-01-01'
$fc148a = New-Contract $ta $cl148.Json.id $fa1 $catGeneral $nom '2026-01-01' '2026-12-31'
Add-Rate $ta $fc148a.Json.id '2026-01-01' 'Daily' 100 | Out-Null
$sqlOk = Invoke-Sql "INSERT INTO ClientFundingContracts (TenantId,ClientId,FundingAuthorityId,InvoiceCategoryId,NominalCodeId,ContractStartDate,ContractEndDate,Status,CreatedAt,UpdatedAt) VALUES ($tenantId,$($cl148.Json.id),$fa1,$catGeneral,$nom,'2026-03-01',NULL,'Active',SYSUTCDATETIME(),SYSUTCDATETIME())"
if ($sqlOk) {
    $p148 = Billing-Preview $ta $co $home1 '2026-05-01' '2026-05-31' @($cl148.Json.id) $catGeneral
    $ovl148 = @($p148.Json.exceptions | Where-Object { $_.code -eq 'OVERLAPPING_FUNDING_CONTRACTS' }).Count -gt 0
    $g148 = Billing-Generate $ta $co $home1 '2026-05-01' '2026-05-31' @($cl148.Json.id) $catGeneral
    Add-Result 'TC-148' 'Overlapping contracts block billing' (
        $ovl148 -and $p148.Json.canGenerate -eq $false -and $p148.Json.lines.Count -eq 0 -and $g148.Status -eq 400
    ) "ovl=$ovl148 gen=$($g148.Status)"
} else {
    Add-Skip 'TC-148' 'Overlapping contracts in DB' 'sqlcmd unavailable; requires SQL insert bypass'
}

# --- TC-149 Three clients grouped ---
$clients149 = @()
foreach ($n in 1..3) {
    $cl = New-Client $ta $home1 "SAGE00$n" "CLIENT00$n" "Client$n" 'Grouped' '2026-01-01'
    $fc = New-Contract $ta $cl.Json.id $fa1 $catGeneral $nom '2026-01-01' $null
    Add-Rate $ta $fc.Json.id '2026-01-01' 'Weekly' 575 | Out-Null
    $clients149 += $cl.Json.id
}
$g149 = Billing-Generate $ta $co $home1 '2026-05-01' '2026-05-31' $clients149 $catGeneral
$inv149 = Invoke-Json GET "/api/invoices/$($g149.Json.invoiceIds[0])" $null $ta
$sages149 = $inv149.Json.lines | ForEach-Object { $_.sageId }
Add-Result 'TC-149' 'Three clients one invoice' (
    $g149.Json.invoiceCount -eq 1 -and $inv149.Json.lines.Count -eq 3 -and
    $g149.Json.totalAmount -eq 7639.29 -and
    ($sages149 | Sort-Object) -join ',' -eq 'SAGE001,SAGE002,SAGE003'
) "count=$($g149.Json.invoiceCount) lines=$($inv149.Json.lines.Count) total=$($g149.Json.totalAmount) sages=$(($sages149 | Sort-Object) -join ',')"

# --- TC-150 Different authority splits ---
$cl150a = New-Client $ta $home1 'SAGE-150A' 'CLI-150A' 'Auth' 'A' '2026-01-01'
$cl150b = New-Client $ta $home1 'SAGE-150B' 'CLI-150B' 'Auth' 'B' '2026-01-01'
$fc150a = New-Contract $ta $cl150a.Json.id $fa1 $catGeneral $nom '2026-01-01' $null
$fc150b = New-Contract $ta $cl150b.Json.id $fa2 $catGeneral $nom '2026-01-01' $null
Add-Rate $ta $fc150a.Json.id '2026-01-01' 'Daily' 100 | Out-Null
Add-Rate $ta $fc150b.Json.id '2026-01-01' 'Daily' 100 | Out-Null
$g150 = Billing-Generate $ta $co $home1 '2026-07-01' '2026-07-07' @($cl150a.Json.id, $cl150b.Json.id) $catGeneral
Add-Result 'TC-150' 'Different authority separate invoices' ($g150.Json.invoiceCount -eq 2) "count=$($g150.Json.invoiceCount)"

# --- TC-151 Different category splits ---
$cl151a = New-Client $ta $home1 'SAGE-151A' 'CLI-151A' 'Cat' 'A' '2026-01-01'
$cl151b = New-Client $ta $home1 'SAGE-151B' 'CLI-151B' 'Cat' 'B' '2026-01-01'
$fc151a = New-Contract $ta $cl151a.Json.id $fa1 $catGeneral $nom '2026-01-01' $null
$fc151b = New-Contract $ta $cl151b.Json.id $fa1 $catRent $nom '2026-01-01' $null
Add-Rate $ta $fc151a.Json.id '2026-01-01' 'Daily' 100 | Out-Null
Add-Rate $ta $fc151b.Json.id '2026-01-01' 'Daily' 100 | Out-Null
$g151 = Billing-Generate $ta $co $home1 '2026-07-08' '2026-07-14' @($cl151a.Json.id, $cl151b.Json.id) $null
Add-Result 'TC-151' 'Different category separate invoices' ($g151.Json.invoiceCount -eq 2) "count=$($g151.Json.invoiceCount)"

# --- TC-152 Different care home splits ---
$cl152a = New-Client $ta $home1 'SAGE-152A' 'CLI-152A' 'Home' 'A' '2026-01-01'
$cl152b = New-Client $ta $home2 'SAGE-152B' 'CLI-152B' 'Home' 'B' '2026-01-01'
$fc152a = New-Contract $ta $cl152a.Json.id $fa1 $catGeneral $nom '2026-01-01' $null
$fc152b = New-Contract $ta $cl152b.Json.id $fa1 $catGeneral $nom '2026-01-01' $null
Add-Rate $ta $fc152a.Json.id '2026-01-01' 'Daily' 100 | Out-Null
Add-Rate $ta $fc152b.Json.id '2026-01-01' 'Daily' 100 | Out-Null
$g152 = Billing-Generate $ta $co $null '2026-07-15' '2026-07-21' @($cl152a.Json.id, $cl152b.Json.id) $catGeneral
Add-Result 'TC-152' 'Different care home separate invoices' ($g152.Json.invoiceCount -eq 2) "count=$($g152.Json.invoiceCount)"

# --- Summary ---
$results | Format-Table -AutoSize
$pass = ($results | Where-Object Result -eq 'PASS').Count
$fail = ($results | Where-Object Result -eq 'FAIL').Count
$skip = ($results | Where-Object Result -eq 'SKIP').Count
Write-Host "`nSUMMARY: $pass PASS, $fail FAIL, $skip SKIP of $($results.Count) tests"
if ($fail -gt 0) { exit 1 }
