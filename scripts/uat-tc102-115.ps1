# UAT TC-102 through TC-115 API tests (Invoice Templates & Funding Contracts)
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:5092'
$results = @()
$ts = Get-Date -Format 'yyyyMMddHHmmss'
$pastDob = '1980-01-15'
$admission = '2026-01-01'

function Add-Result($tc, $name, $passed, $detail) {
    $script:results += [pscustomobject]@{ TC = $tc; Name = $name; Result = $(if ($passed) { 'PASS' } else { 'FAIL' }); Detail = $detail }
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
    return Login $email 'QaTenantAdmin!99'
}

function Get-CategoryId($token, $code) {
    $cats = (Invoke-Json GET '/api/invoice-categories' $null $token).Json
    return ($cats | Where-Object { $_.code -eq $code } | Select-Object -First 1).id
}

function New-Company($token, $name) {
    return (Invoke-Json POST '/api/companies' (@{ name = $name } | ConvertTo-Json -Compress) $token).Json.id
}

function New-CareHome($token, $companyId, $code, $name) {
    $body = @{ companyId = $companyId; code = $code; name = $name; bedCapacity = 20; managerName = 'QA Manager' }
    return Invoke-Json POST '/api/care-homes' ($body | ConvertTo-Json -Compress) $token
}

function New-Client($token, $careHomeId, $sageId, $ref, $first, $last) {
    $body = @{
        careHomeId = $careHomeId; sageId = $sageId; referenceNumber = $ref
        firstName = $first; lastName = $last; careType = 'Residential'
        admissionDate = $admission; dateOfBirth = $pastDob
    }
    return Invoke-Json POST '/api/clients' ($body | ConvertTo-Json -Compress) $token
}

function New-FundingAuthority($token, $code, $name) {
    return Invoke-Json POST '/api/funding-authorities' (@{ code = $code; name = $name; type = 'Council'; billingFrequency = 'Weekly' } | ConvertTo-Json -Compress) $token
}

function New-Nominal($token, $code, $name) {
    return Invoke-Json POST '/api/nominal-codes' (@{ code = $code; name = $name } | ConvertTo-Json -Compress) $token
}

function New-Template($token, $body) {
    return Invoke-Json POST '/api/invoice-templates' ($body | ConvertTo-Json -Compress) $token
}

function New-Contract($token, $clientId, $faId, $catId, $nomId, $start, $end) {
    $body = @{
        fundingAuthorityId = $faId; invoiceCategoryId = $catId; nominalCodeId = $nomId
        contractStartDate = $start
    }
    if ($null -ne $end) { $body.contractEndDate = $end }
    return Invoke-Json POST "/api/clients/$clientId/funding-contracts" ($body | ConvertTo-Json -Compress) $token
}

function Add-Rate($token, $contractId, $from, $amount = 100) {
    return Invoke-Json POST "/api/funding-contracts/$contractId/rates" (@{
        effectiveFrom = $from; frequency = 'Daily'; amount = $amount
    } | ConvertTo-Json -Compress) $token
}

function Billing-Preview($token, $companyId, $careHomeId, $start, $end, $clientIds) {
    return Invoke-Json POST '/api/billing/preview' (@{
        companyId = $companyId; careHomeId = $careHomeId
        periodStart = $start; periodEnd = $end; clientIds = $clientIds
    } | ConvertTo-Json -Compress) $token
}

# --- Login & provision ---
$pt = Login 'admin@localhost' 'DevAdmin!12345'
if (-not $pt) { throw 'Platform login failed' }
$ta = Provision-Tenant $pt "QA Templates A $ts" "qa-tc102-a-$ts@uat.test"
$tb = Provision-Tenant $pt "QA Templates B $ts" "qa-tc102-b-$ts@uat.test"

# --- Shared master data tenant A ---
$coA = New-Company $ta 'QA Billing Co A'
$chA = New-CareHome $ta $coA 'BILL01' 'Billing Home A'
$homeAId = $chA.Json.id
$clientA = New-Client $ta $homeAId 'SAGE-T102' 'CLI-T102' 'Bill' 'Client'
$clientAId = $clientA.Json.id
$faA = New-FundingAuthority $ta 'EASTCC' 'East County Council'
$faAId = $faA.Json.id
$nomA = New-Nominal $ta '4000' 'Care Revenue'
$nomAId = $nomA.Json.id
$catGeneral = Get-CategoryId $ta 'GENERAL_CARE'

# --- TC-102 Create invoice template ---
$tplBody = @{
    name = 'General Care Standard'
    invoiceCategoryId = $catGeneral
    headerText1 = 'Care Home Services'
    headerText2 = 'Invoice Header Line 2'
    footerText = 'Thank you for your business'
    bankAccountName = 'QA Care Account'
    sortCode = '12-34-56'
    accountNumber = '12345678'
    contactName = 'Finance Team'
    contactJobTitle = 'Billing Manager'
    contactEmail = 'finance@qa.test'
    contactPhone = '02011112222'
    emailSubjectTemplate = 'Invoice {InvoiceNumber}'
    emailBodyTemplate = 'Please find attached invoice {InvoiceNumber}.'
}
$tplCreate = New-Template $ta $tplBody
$tplId = $tplCreate.Json.id
Add-Result 'TC-102' 'Create invoice template' (
    $tplCreate.Status -eq 201 -and
    $tplCreate.Json.name -eq 'General Care Standard' -and
    $tplCreate.Json.footerText -eq 'Thank you for your business' -and
    $tplCreate.Json.bankAccountName -eq 'QA Care Account'
) "status=$($tplCreate.Status); id=$tplId"

# --- TC-103 Edit template ---
$updBody = $tplBody.Clone()
$updBody.name = 'General Care Standard'
$updBody.footerText = 'Updated footer'
$updBody.bankAccountName = 'Updated Bank Account'
$tplUpdate = Invoke-Json PUT "/api/invoice-templates/$tplId" ($updBody | ConvertTo-Json -Compress) $ta
$tplReload = Invoke-Json GET "/api/invoice-templates/$tplId" $null $ta
Add-Result 'TC-103' 'Edit template persists' (
    $tplUpdate.Status -eq 200 -and
    $tplReload.Json.footerText -eq 'Updated footer' -and
    $tplReload.Json.bankAccountName -eq 'Updated Bank Account'
) "footer=$($tplReload.Json.footerText)"

# --- TC-104 Authority-specific template precedence ---
$tplDefault = New-Template $ta @{
    name = 'Default General'; invoiceCategoryId = $catGeneral
    footerText = 'DEFAULT-TEMPLATE-FOOTER'
}
$tplAuth = New-Template $ta @{
    name = 'EASTCC template'; invoiceCategoryId = $catGeneral
    fundingAuthorityId = $faAId; footerText = 'EASTCC-TEMPLATE-FOOTER'
}
$contract104 = New-Contract $ta $clientAId $faAId $catGeneral $nomAId '2026-01-01' $null
Add-Rate $ta $contract104.Json.id '2026-01-01' | Out-Null
$preview104 = Billing-Preview $ta $coA $homeAId '2026-01-01' '2026-01-07' @($clientAId)
$line104 = $preview104.Json.lines | Select-Object -First 1
Add-Result 'TC-104' 'Authority-specific template selected' (
    $preview104.Status -eq 200 -and
    $line104.invoiceTemplateId -eq $tplAuth.Json.id
) "templateId=$($line104.invoiceTemplateId); expected=$($tplAuth.Json.id)"

# --- TC-105 Care-home-specific template ---
$clientB = New-Client $ta $homeAId 'SAGE-T105' 'CLI-T105' 'Scoped' 'Client'
$clientBId = $clientB.Json.id
$faB = New-FundingAuthority $ta 'PRIV01' 'Private Funder'
$tplHome = New-Template $ta @{
    name = 'Scoped template'; invoiceCategoryId = $catGeneral
    careHomeId = $homeAId; footerText = 'HOME-SCOPED-FOOTER'
}
$contract105 = New-Contract $ta $clientBId $faB.Json.id $catGeneral $nomAId '2026-01-01' $null
Add-Rate $ta $contract105.Json.id '2026-01-01' | Out-Null
$preview105 = Billing-Preview $ta $coA $homeAId '2026-01-01' '2026-01-07' @($clientBId)
$line105 = $preview105.Json.lines | Select-Object -First 1
Add-Result 'TC-105' 'Care-home scoped template applied' (
    $preview105.Status -eq 200 -and
    $line105.invoiceTemplateId -eq $tplHome.Json.id
) "templateId=$($line105.invoiceTemplateId); expected=$($tplHome.Json.id)"

# --- TC-106 Missing template blocks billing ---
$catRespite = (Invoke-Json POST '/api/invoice-categories' (@{ code = "RESP$ts"; name = 'Respite No Template' } | ConvertTo-Json -Compress) $ta).Json.id
$clientC = New-Client $ta $homeAId 'SAGE-T106' 'CLI-T106' 'NoTpl' 'Client'
$contract106 = New-Contract $ta $clientC.Json.id $faAId $catRespite $nomAId '2026-01-01' $null
Add-Rate $ta $contract106.Json.id '2026-01-01' | Out-Null
$preview106 = Billing-Preview $ta $coA $homeAId '2026-01-01' '2026-01-07' @($clientC.Json.id)
$missingTpl = @($preview106.Json.exceptions | Where-Object { $_.code -eq 'MISSING_TEMPLATE' }).Count -gt 0
Add-Result 'TC-106' 'Missing template blocks generation' (
    $preview106.Status -eq 200 -and $missingTpl -and $preview106.Json.canGenerate -eq $false
) "canGenerate=$($preview106.Json.canGenerate); missing=$missingTpl"

# --- TC-107 Template tenant isolation ---
$coB = New-Company $tb 'QA Billing Co B'
$chB = New-CareHome $tb $coB 'BILL01' 'Billing Home B'
$catB = Get-CategoryId $tb 'GENERAL_CARE'
$tplA = New-Template $ta @{ name = 'Tenant A Bank Tpl'; invoiceCategoryId = $catGeneral; bankAccountName = 'TENANT-A-BANK-ONLY'; accountNumber = '11111111' }
$tplB = New-Template $tb @{ name = 'Tenant B Bank Tpl'; invoiceCategoryId = $catB; bankAccountName = 'TENANT-B-BANK-ONLY'; accountNumber = '22222222' }
$listA = (Invoke-Json GET '/api/invoice-templates' $null $ta).Json
$listB = (Invoke-Json GET '/api/invoice-templates' $null $tb).Json
$crossGet = Invoke-Json GET "/api/invoice-templates/$($tplB.Json.id)" $null $ta
$noLeakA = @($listA | Where-Object { $_.bankAccountName -eq 'TENANT-B-BANK-ONLY' }).Count -eq 0
$noLeakB = @($listB | Where-Object { $_.bankAccountName -eq 'TENANT-A-BANK-ONLY' }).Count -eq 0
$hasOwnA = @($listA | Where-Object { $_.bankAccountName -eq 'TENANT-A-BANK-ONLY' }).Count -ge 1
$hasOwnB = @($listB | Where-Object { $_.bankAccountName -eq 'TENANT-B-BANK-ONLY' }).Count -ge 1
Add-Result 'TC-107' 'Template tenant isolation' (
    $noLeakA -and $noLeakB -and $hasOwnA -and $hasOwnB -and $crossGet.Status -eq 404
) "crossGet=$($crossGet.Status); leakA=$noLeakA leakB=$noLeakB"

# --- TC-108 Create funding contract ---
$clientFc = New-Client $ta $homeAId 'SAGE-FC01' 'CLI-FC01' 'Fund' 'Contract'
$clientFcId = $clientFc.Json.id
$fc108 = New-Contract $ta $clientFcId $faAId $catGeneral $nomAId '2026-01-01' '2026-12-31'
$fc108Get = Invoke-Json GET "/api/funding-contracts/$($fc108.Json.id)" $null $ta
Add-Result 'TC-108' 'Create funding contract' (
    $fc108.Status -eq 201 -and
    $fc108Get.Json.contractStartDate -eq '2026-01-01' -and
    $fc108Get.Json.contractEndDate -eq '2026-12-31' -and
    $fc108Get.Json.status -eq 'Active'
) "status=$($fc108.Status); id=$($fc108.Json.id)"

# --- TC-109 End date before start ---
$fc109 = New-Contract $ta $clientFcId $faAId $catGeneral $nomAId '2026-06-01' '2026-05-31'
Add-Result 'TC-109' 'End date before start rejected' ($fc109.Status -eq 400) "status=$($fc109.Status)"

# --- TC-110 Missing authority/category/nominal ---
$missAuth = Invoke-Json POST "/api/clients/$clientFcId/funding-contracts" (@{
    fundingAuthorityId = 0; invoiceCategoryId = $catGeneral; nominalCodeId = $nomAId; contractStartDate = '2026-01-01'
} | ConvertTo-Json -Compress) $ta
$missCat = Invoke-Json POST "/api/clients/$clientFcId/funding-contracts" (@{
    fundingAuthorityId = $faAId; invoiceCategoryId = 0; nominalCodeId = $nomAId; contractStartDate = '2026-01-01'
} | ConvertTo-Json -Compress) $ta
$missNom = Invoke-Json POST "/api/clients/$clientFcId/funding-contracts" (@{
    fundingAuthorityId = $faAId; invoiceCategoryId = $catGeneral; nominalCodeId = 0; contractStartDate = '2026-01-01'
} | ConvertTo-Json -Compress) $ta
Add-Result 'TC-110' 'Missing authority/category/nominal blocked' (
    $missAuth.Status -eq 400 -and $missCat.Status -eq 400 -and $missNom.Status -eq 400
) "auth=$($missAuth.Status) cat=$($missCat.Status) nom=$($missNom.Status)"

# --- TC-111 Adjacent contracts allowed ---
$clientAdj = New-Client $ta $homeAId 'SAGE-ADJ1' 'CLI-ADJ1' 'Adj' 'One'
$clientAdjId = $clientAdj.Json.id
$fc111a = New-Contract $ta $clientAdjId $faAId $catGeneral $nomAId '2026-01-01' '2026-03-31'
$fc111b = New-Contract $ta $clientAdjId $faAId $catGeneral $nomAId '2026-04-01' $null
Add-Result 'TC-111' 'Adjacent contracts allowed' (
    $fc111a.Status -eq 201 -and $fc111b.Status -eq 201
) "first=$($fc111a.Status) second=$($fc111b.Status)"

# --- TC-112 Overlapping contract rejected on create ---
$clientOvl = New-Client $ta $homeAId 'SAGE-OVL1' 'CLI-OVL1' 'Overlap' 'Create'
$clientOvlId = $clientOvl.Json.id
$fc112a = New-Contract $ta $clientOvlId $faAId $catGeneral $nomAId '2026-01-01' '2026-12-31'
$fc112b = New-Contract $ta $clientOvlId $faAId $catGeneral $nomAId '2026-06-01' $null
$overlapCode = $null
try { $overlapCode = ($fc112b.Content | ConvertFrom-Json).code } catch { }
Add-Result 'TC-112' 'Overlapping contract rejected on create' (
    $fc112a.Status -eq 201 -and $fc112b.Status -eq 400 -and $overlapCode -eq 'OVERLAPPING_FUNDING_CONTRACT'
) "status=$($fc112b.Status); code=$overlapCode"

# --- TC-113 Overlapping contract rejected on edit ---
$clientOvlE = New-Client $ta $homeAId 'SAGE-OVL2' 'CLI-OVL2' 'Overlap' 'Edit'
$clientOvlEId = $clientOvlE.Json.id
$fc113a = New-Contract $ta $clientOvlEId $faAId $catGeneral $nomAId '2026-01-01' '2026-03-31'
$fc113b = New-Contract $ta $clientOvlEId $faAId $catGeneral $nomAId '2026-04-01' '2026-12-31'
$fc113bOrig = (Invoke-Json GET "/api/funding-contracts/$($fc113b.Json.id)" $null $ta).Json
$edit113 = Invoke-Json PUT "/api/funding-contracts/$($fc113b.Json.id)" (@{
    fundingAuthorityId = $faAId; invoiceCategoryId = $catGeneral; nominalCodeId = $nomAId
    contractStartDate = '2026-02-01'; contractEndDate = '2026-12-31'; status = 'Active'
} | ConvertTo-Json -Compress) $ta
$editCode = $null
try { $editCode = ($edit113.Content | ConvertFrom-Json).code } catch { }
$fc113bAfter = (Invoke-Json GET "/api/funding-contracts/$($fc113b.Json.id)" $null $ta).Json
Add-Result 'TC-113' 'Overlapping edit rejected unchanged' (
    $edit113.Status -eq 400 -and $editCode -eq 'OVERLAPPING_FUNDING_CONTRACT' -and
    $fc113bAfter.contractStartDate -eq $fc113bOrig.contractStartDate
) "edit=$($edit113.Status); startAfter=$($fc113bAfter.contractStartDate)"

# --- TC-114 Cross-tenant master-data IDs rejected ---
$faBId = (New-FundingAuthority $tb 'WESTCC' 'West Council').Json.id
$nomBId = (New-Nominal $tb '5000' 'Other Revenue').Json.id
$crossAuth = New-Contract $ta $clientFcId $faBId $catGeneral $nomAId '2027-01-01' '2027-12-31'
$crossNom = New-Contract $ta $clientFcId $faAId $catGeneral $nomBId '2027-01-01' '2027-12-31'
Add-Result 'TC-114' 'Cross-tenant IDs rejected' (
    $crossAuth.Status -eq 400 -and $crossNom.Status -eq 400
) "crossAuth=$($crossAuth.Status) crossNom=$($crossNom.Status)"

# --- TC-115 Inactive historical contract retained ---
$clientHist = New-Client $ta $homeAId 'SAGE-HIST' 'CLI-HIST' 'Hist' 'Contract'
$clientHistId = $clientHist.Json.id
$fc115 = New-Contract $ta $clientHistId $faAId $catGeneral $nomAId '2025-01-01' '2025-12-31'
$deact115 = Invoke-Json PUT "/api/funding-contracts/$($fc115.Json.id)" (@{
    fundingAuthorityId = $faAId; invoiceCategoryId = $catGeneral; nominalCodeId = $nomAId
    contractStartDate = '2025-01-01'; contractEndDate = '2025-12-31'; status = 'Inactive'
} | ConvertTo-Json -Compress) $ta
$history115 = Invoke-Json GET "/api/clients/$clientHistId/funding-contracts" $null $ta
$inactiveStillListed = @($history115.Json | Where-Object { $_.id -eq $fc115.Json.id -and $_.status -eq 'Inactive' }).Count -eq 1
Add-Result 'TC-115' 'Inactive contract retained in history' (
    $deact115.Status -eq 200 -and $inactiveStillListed
) "deact=$($deact115.Status); listed=$inactiveStillListed"

# --- Summary ---
$results | Format-Table -AutoSize
$pass = ($results | Where-Object Result -eq 'PASS').Count
$fail = ($results | Where-Object Result -eq 'FAIL').Count
Write-Host "`nSUMMARY: $pass PASS, $fail FAIL of $($results.Count) tests"
if ($fail -gt 0) { exit 1 }
