# UAT TC-082 through TC-101 API tests
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:5092'
$results = @()

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
    if ($c.Status -ne 201) { throw "Provision failed: $($c.Content)" }
    $tp = $c.Json.temporaryPassword
    $t = Login $email $tp
    Invoke-Json POST '/api/auth/change-password' (@{ currentPassword = $tp; newPassword = 'QaTenantAdmin!99' } | ConvertTo-Json -Compress) $t | Out-Null
    return Login $email 'QaTenantAdmin!99'
}

function New-FundingAuthority($token, $code, $name, $type, $frequency, $intervalDays = $null, $email = $null) {
    $body = @{ code = $code; name = $name; type = $type; billingFrequency = $frequency }
    if ($null -ne $intervalDays) { $body.billingIntervalDays = $intervalDays }
    if ($email) { $body.email = $email }
    return Invoke-Json POST '/api/funding-authorities' ($body | ConvertTo-Json -Compress) $token
}

function Update-FundingAuthority($token, $id, $auth, $patch) {
    $body = @{
        code = $auth.code; name = $auth.name; type = $auth.type; billingFrequency = $auth.billingFrequency
        billingIntervalDays = $auth.billingIntervalDays; isActive = $auth.isActive
        contactName = $auth.contactName; phone = $auth.phone; email = $auth.email; address = $auth.address
    }
    foreach ($k in $patch.Keys) { $body[$k] = $patch[$k] }
    return Invoke-Json PUT "/api/funding-authorities/$id" ($body | ConvertTo-Json -Compress) $token
}

function Has-Category($token, $code) {
    $cats = (Invoke-Json GET '/api/invoice-categories' $null $token).Json
    return @($cats | Where-Object { $_.code -eq $code -and $_.isActive -eq $true }).Count -gt 0
}

$pt = Login 'admin@localhost' 'DevAdmin!12345'
if (-not $pt) { throw 'Platform login failed' }
$ta = Provision-Tenant $pt 'QA Funding Tenant A' 'qa-funding-a@uat.test'
$tb = Provision-Tenant $pt 'QA Funding Tenant B' 'qa-funding-b@uat.test'

# TC-082
$fa = New-FundingAuthority $ta 'EASTCC' 'East County Council' 'Council' 'Weekly' $null 'council@east.test'
Add-Result 'TC-082' 'Create council authority' ($fa.Status -eq 201 -and $fa.Json.type -eq 'Council') "status=$($fa.Status)"

# TC-083
$nhs = New-FundingAuthority $ta 'NHS01' 'QA NHS Trust' 'NHS' 'Monthly'
$priv = New-FundingAuthority $ta 'PRIV01' 'QA Private Funder' 'Private' 'Monthly'
Add-Result 'TC-083' 'Create NHS/private authority' ($nhs.Status -eq 201 -and $priv.Status -eq 201 -and $nhs.Json.type -eq 'NHS' -and $priv.Json.type -eq 'Private') "nhs=$($nhs.Status) priv=$($priv.Status)"

# TC-084
$dupFa = New-FundingAuthority $ta 'EASTCC' 'Duplicate Council' 'Council' 'Weekly'
Add-Result 'TC-084' 'Duplicate authority code same tenant' ($dupFa.Status -eq 400) "status=$($dupFa.Status)"

# TC-085
$faB = New-FundingAuthority $tb 'EASTCC' 'East County Council B' 'Council' 'Weekly'
Add-Result 'TC-085' 'Same authority code across tenants' ($faB.Status -eq 201) "status=$($faB.Status)"

# TC-086
$badFaEmail = New-FundingAuthority $ta 'BADEML' 'Bad Email FA' 'Other' 'Weekly' $null 'abc'
Add-Result 'TC-086' 'Invalid contact email' ($badFaEmail.Status -eq 400) "status=$($badFaEmail.Status)"

# TC-087 Weekly persists
$weekly = New-FundingAuthority $ta 'WEEK01' 'Weekly Authority' 'Other' 'Weekly'
$weeklyGet = Invoke-Json GET "/api/funding-authorities/$($weekly.Json.id)" $null $ta
Add-Result 'TC-087' 'Weekly frequency' ($weeklyGet.Json.billingFrequency -eq 'Weekly') "freq=$($weeklyGet.Json.billingFrequency)"

# TC-088 Monthly persists
$monthly = New-FundingAuthority $ta 'MON01' 'Monthly Authority' 'Other' 'Monthly'
$monthlyGet = Invoke-Json GET "/api/funding-authorities/$($monthly.Json.id)" $null $ta
Add-Result 'TC-088' 'Monthly frequency' ($monthlyGet.Json.billingFrequency -eq 'Monthly') "freq=$($monthlyGet.Json.billingFrequency)"

# TC-089 CustomDays 28
$custom = New-FundingAuthority $ta 'CUST28' 'Custom 28 Days' 'Other' 'CustomDays' 28
$customGet = Invoke-Json GET "/api/funding-authorities/$($custom.Json.id)" $null $ta
Add-Result 'TC-089' 'Custom days valid (28)' ($customGet.Json.billingFrequency -eq 'CustomDays' -and $customGet.Json.billingIntervalDays -eq 28) "days=$($customGet.Json.billingIntervalDays)"

# TC-090 CustomDays invalid
$blank = New-FundingAuthority $ta 'CUSTB' 'Custom Blank' 'Other' 'CustomDays' $null
$zero = New-FundingAuthority $ta 'CUST0' 'Custom Zero' 'Other' 'CustomDays' 0
$neg = New-FundingAuthority $ta 'CUSTN' 'Custom Negative' 'Other' 'CustomDays' -1
Add-Result 'TC-090' 'Custom days missing/zero/negative' ($blank.Status -eq 400 -and $zero.Status -eq 400 -and $neg.Status -eq 400) "blank=$($blank.Status) zero=$($zero.Status) neg=$($neg.Status)"

# TC-091 Deactivate authority
$deactId = $fa.Json.id
Invoke-Json DELETE "/api/funding-authorities/$deactId" $null $ta | Out-Null
$afterDeact = Invoke-Json GET "/api/funding-authorities/$deactId" $null $ta
$hiddenActive = (Invoke-Json GET '/api/funding-authorities?activeOnly=true' $null $ta).Json
$stillListedInactive = (Invoke-Json GET '/api/funding-authorities' $null $ta).Json | Where-Object { $_.id -eq $deactId -and $_.isActive -eq $false }
Add-Result 'TC-091' 'Deactivate authority' ($afterDeact.Json.isActive -eq $false -and $stillListedInactive) "inactive=$($afterDeact.Json.isActive)"

# TC-092-095 default categories (fresh tenant has provisioning defaults)
Add-Result 'TC-092' 'Default GENERAL_CARE' (Has-Category $ta 'GENERAL_CARE') 'checked active category'
Add-Result 'TC-093' 'Default OUTREACH' (Has-Category $ta 'OUTREACH') 'checked active category'
Add-Result 'TC-094' 'Default RENT' (Has-Category $ta 'RENT') 'checked active category'
Add-Result 'TC-095' 'Default MISC' (Has-Category $ta 'MISC') 'checked active category'

# TC-096 create custom category
$cat = Invoke-Json POST '/api/invoice-categories' (@{ code = 'RESPITE'; name = 'Respite Care'; description = 'Respite charges' } | ConvertTo-Json -Compress) $ta
Add-Result 'TC-096' 'Create custom category' ($cat.Status -eq 201) "status=$($cat.Status)"

# TC-097 duplicate category
$dupCat = Invoke-Json POST '/api/invoice-categories' (@{ code = 'GENERAL_CARE'; name = 'Dup' } | ConvertTo-Json -Compress) $ta
Add-Result 'TC-097' 'Duplicate category code' ($dupCat.Status -eq 400) "status=$($dupCat.Status)"

# TC-098 create nominal
$nom = Invoke-Json POST '/api/nominal-codes' (@{ code = '4000'; name = 'General Care'; description = 'Care revenue' } | ConvertTo-Json -Compress) $ta
$nomId = $nom.Json.id
Add-Result 'TC-098' 'Create nominal code' ($nom.Status -eq 201) "status=$($nom.Status)"

# TC-099 duplicate nominal same tenant
$dupNom = Invoke-Json POST '/api/nominal-codes' (@{ code = '4000'; name = 'Dup Nominal' } | ConvertTo-Json -Compress) $ta
Add-Result 'TC-099' 'Duplicate nominal same tenant' ($dupNom.Status -eq 400) "status=$($dupNom.Status)"

# TC-100 same nominal across tenants
$nomB = Invoke-Json POST '/api/nominal-codes' (@{ code = '4000'; name = 'General Care B' } | ConvertTo-Json -Compress) $tb
Add-Result 'TC-100' 'Same nominal across tenants' ($nom.Status -eq 201 -and $nomB.Status -eq 201) "A=$($nom.Status) B=$($nomB.Status)"

# TC-101 deactivate nominal
Invoke-Json DELETE "/api/nominal-codes/$nomId" $null $ta | Out-Null
$nomAfter = Invoke-Json GET "/api/nominal-codes/$nomId" $null $ta
$nomHiddenActive = @((Invoke-Json GET '/api/nominal-codes?activeOnly=true' $null $ta).Json | Where-Object { $_.id -eq $nomId }).Count -eq 0
Add-Result 'TC-101' 'Deactivate nominal' ($nomAfter.Json.isActive -eq $false -and $nomAfter.Status -eq 200 -and $nomHiddenActive) "inactive=$($nomAfter.Json.isActive); hiddenFromActiveOnly=$nomHiddenActive"

$results | Format-Table -AutoSize
$pass = ($results | Where-Object Result -eq 'PASS').Count
$fail = ($results | Where-Object Result -eq 'FAIL').Count
Write-Output "SUMMARY: $pass PASS, $fail FAIL"
if ($fail -gt 0) { exit 1 }
