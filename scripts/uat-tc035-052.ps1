# UAT TC-035 through TC-052 API smoke tests
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:5092'
$results = @()

function Add-Result($tc, $name, $passed, $detail) {
    $script:results += [pscustomobject]@{
        TC = $tc; Name = $name; Result = $(if ($passed) { 'PASS' } else { 'FAIL' }); Detail = $detail
    }
}

function Invoke-Json {
    param(
        [string]$Method,
        [string]$Path,
        [string]$Body = $null,
        [string]$Token = $null
    )
    $args = @('-s', '-w', "`n%{http_code}", '-X', $Method, "$base$Path", '-H', 'Content-Type: application/json; charset=utf-8')
    if ($Token) { $args += @('-H', "Authorization: Bearer $Token") }
    if ($Body) {
        $temp = [System.IO.Path]::GetTempFileName()
        [System.IO.File]::WriteAllText($temp, $Body, [System.Text.UTF8Encoding]::new($false))
        $args += @('--data-binary', "@$temp")
        try {
            $raw = & curl.exe @args
        } finally {
            Remove-Item $temp -Force
        }
    } else {
        $raw = & curl.exe @args
    }
    $lines = $raw -split "`n"
    $status = [int]$lines[-1]
    $content = ($lines[0..($lines.Length - 2)] -join "`n")
    return @{ Status = $status; Content = $content; Json = $(if ($content) { try { $content | ConvertFrom-Json } catch { $null } } else { $null }) }
}

function Login([string]$email, [string]$password) {
    $body = (@{ email = $email; password = $password } | ConvertTo-Json -Compress)
    $r = Invoke-Json -Method POST -Path '/api/auth/login' -Body $body
    if ($r.Status -eq 200) { return $r.Json.token }
    return $null
}

function Provision-Tenant([string]$platformToken, [string]$orgName, [string]$adminEmail) {
    $body = (@{
            name = $orgName; isActive = $true; adminEmail = $adminEmail; adminDisplayName = 'QA Admin'
        } | ConvertTo-Json -Compress)
    $create = Invoke-Json -Method POST -Path '/api/platform/tenants' -Body $body -Token $platformToken
    if ($create.Status -ne 201) { throw "Provision failed: $($create.Content)" }
    $tempPwd = $create.Json.temporaryPassword
    $token = Login $adminEmail $tempPwd
    $chgBody = (@{ currentPassword = $tempPwd; newPassword = 'QaTenantAdmin!99' } | ConvertTo-Json -Compress)
    $chg = Invoke-Json -Method POST -Path '/api/auth/change-password' -Body $chgBody -Token $token
    if ($chg.Status -ne 200) { throw "Password change failed: $($chg.Content)" }
    return @{ Token = (Login $adminEmail 'QaTenantAdmin!99'); TenantId = $create.Json.id }
}

function Get-OrgSettings([string]$token) {
    $r = Invoke-Json -Method GET -Path '/api/settings/organisation' -Token $token
    return $r
}

function Build-OrgBody($settings, $patch) {
    $obj = [ordered]@{
        name               = $settings.name
        tradingName        = $settings.tradingName
        registrationNumber = $settings.registrationNumber
        address            = $settings.address
        phone              = $settings.phone
        email              = $settings.email
        website            = $settings.website
        currencyCode       = if ($settings.currencyCode) { $settings.currencyCode } else { 'GBP' }
        currencySymbol     = 'GBP'
        timeZoneId         = $settings.timeZoneId
        invoicePrefix      = $settings.invoicePrefix
        creditNotePrefix   = $settings.creditNotePrefix
        numberLength       = [int]$settings.numberLength
        paymentTermsDays   = [int]$settings.paymentTermsDays
        emailFromName      = $settings.emailFromName
        emailFromAddress   = $settings.emailFromAddress
        primaryColour      = $settings.primaryColour
    }
    foreach ($key in $patch.Keys) { $obj[$key] = $patch[$key] }
    return ($obj | ConvertTo-Json -Compress)
}

function Put-OrgSettings([string]$token, $settings, $patch) {
    $body = Build-OrgBody $settings $patch
    return Invoke-Json -Method PUT -Path '/api/settings/organisation' -Body $body -Token $token
}

$platformToken = Login 'admin@localhost' 'DevAdmin!12345'
if (-not $platformToken) { throw 'Platform admin login failed.' }

$tenantA = Provision-Tenant $platformToken 'QA Org Test A4' 'qa-org-a4@uat.test'
$tenantB = Provision-Tenant $platformToken 'QA Org Test B4' 'qa-org-b4@uat.test'
$ta = $tenantA.Token
$tb = $tenantB.Token

# TC-035
$s = (Get-OrgSettings $ta).Json
$r = Put-OrgSettings $ta $s @{ name = 'QA Care Group Ltd' }
$g = (Get-OrgSettings $ta).Json
Add-Result 'TC-035' 'Update organisation name' ($r.Status -eq 200 -and $g.name -eq 'QA Care Group Ltd') "status=$($r.Status); name=$($g.name)"

# TC-036
$s = (Get-OrgSettings $ta).Json
$r = Put-OrgSettings $ta $s @{ tradingName = 'QA Care' }
$g = (Get-OrgSettings $ta).Json
Add-Result 'TC-036' 'Update trading name' ($g.tradingName -eq 'QA Care') "tradingName=$($g.tradingName)"

# TC-037
$s = (Get-OrgSettings $ta).Json
$r = Put-OrgSettings $ta $s @{ email = 'finance@qacare.test' }
$g = (Get-OrgSettings $ta).Json
Add-Result 'TC-037' 'Update contact email' ($g.email -eq 'finance@qacare.test') "email=$($g.email)"

# TC-038
$s = (Get-OrgSettings $ta).Json
$r = Put-OrgSettings $ta $s @{ email = 'not-an-email' }
$g = (Get-OrgSettings $ta).Json
Add-Result 'TC-038' 'Reject invalid contact email' ($r.Status -ge 400) "status=$($r.Status); persisted=$($g.email)"

# TC-039
$s = (Get-OrgSettings $ta).Json
$r = Put-OrgSettings $ta $s @{ phone = '020 0000 0000'; address = 'Test Address' }
$g = (Get-OrgSettings $ta).Json
Add-Result 'TC-039' 'Update phone/address' ($g.phone -eq '020 0000 0000' -and $g.address -eq 'Test Address') "phone=$($g.phone)"

# TC-040
$s = (Get-OrgSettings $ta).Json
$r = Put-OrgSettings $ta $s @{ invoicePrefix = 'QA-INV-' }
$g = (Get-OrgSettings $ta).Json
Add-Result 'TC-040' 'Update invoice prefix' ($g.invoicePrefix -eq 'QA-INV-') "prefix=$($g.invoicePrefix)"

# TC-041
$s = (Get-OrgSettings $ta).Json
$r = Put-OrgSettings $ta $s @{ creditNotePrefix = 'QA-CN-' }
$g = (Get-OrgSettings $ta).Json
Add-Result 'TC-041' 'Update credit-note prefix' ($g.creditNotePrefix -eq 'QA-CN-') "prefix=$($g.creditNotePrefix)"

# TC-042
$s = (Get-OrgSettings $ta).Json
$r = Put-OrgSettings $ta $s @{ paymentTermsDays = 45 }
$g = (Get-OrgSettings $ta).Json
Add-Result 'TC-042' 'Update payment terms' ($g.paymentTermsDays -eq 45) "days=$($g.paymentTermsDays)"

# TC-043
$s = (Get-OrgSettings $ta).Json
$r = Put-OrgSettings $ta $s @{ name = '' }
$g = (Get-OrgSettings $ta).Json
Add-Result 'TC-043' 'Required field cleared' ($r.Status -eq 400 -and $g.name -ne '') "status=$($r.Status)"

# TC-044
$bBefore = (Get-OrgSettings $tb).Json
$s = (Get-OrgSettings $ta).Json
Put-OrgSettings $ta $s @{ name = 'QA Care Group Ltd ISOLATED' } | Out-Null
$bAfter = (Get-OrgSettings $tb).Json
Add-Result 'TC-044' 'Organisation B settings unchanged' ($bAfter.name -eq $bBefore.name) "tenantB=$($bAfter.name)"

# TC-045
$cBody = (@{ name = 'Sovereign Care Homes QA' } | ConvertTo-Json -Compress)
$c = Invoke-Json -Method POST -Path '/api/companies' -Body $cBody -Token $ta
$list = (Invoke-Json -Method GET -Path '/api/companies' -Token $ta).Json
Add-Result 'TC-045' 'Create company' ($c.Status -eq 201 -and ($list.name -contains 'Sovereign Care Homes QA')) "status=$($c.Status)"

# TC-046
$companyId = $c.Json.id
$uBody = (@{ name = 'Sovereign Care Homes QA Updated'; isActive = $true } | ConvertTo-Json -Compress)
Invoke-Json -Method PUT -Path "/api/companies/$companyId" -Body $uBody -Token $ta | Out-Null
$g = (Invoke-Json -Method GET -Path "/api/companies/$companyId" -Token $ta).Json
Add-Result 'TC-046' 'Edit company' ($g.name -eq 'Sovereign Care Homes QA Updated') "name=$($g.name)"

# TC-047
$blank = Invoke-Json -Method POST -Path '/api/companies' -Body (@{ name = '   ' } | ConvertTo-Json -Compress) -Token $ta
Add-Result 'TC-047' 'Blank company name' ($blank.Status -eq 400) "status=$($blank.Status)"

# TC-048
$dup = Invoke-Json -Method POST -Path '/api/companies' -Body (@{ name = 'Sovereign Care Homes QA Updated' } | ConvertTo-Json -Compress) -Token $ta
Add-Result 'TC-048' 'Duplicate company name in same tenant' ($dup.Status -eq 400) "status=$($dup.Status)"

# TC-049
$trimDup = Invoke-Json -Method POST -Path '/api/companies' -Body (@{ name = ' sovereign care homes qa updated ' } | ConvertTo-Json -Compress) -Token $ta
$caseDup = Invoke-Json -Method POST -Path '/api/companies' -Body (@{ name = 'sovereign care homes qa updated' } | ConvertTo-Json -Compress) -Token $ta
Add-Result 'TC-049' 'Duplicate name case/spacing' ($trimDup.Status -eq 400 -and $caseDup.Status -eq 400) "trim=$($trimDup.Status); case=$($caseDup.Status) [case-insensitive SQL collation]"

# TC-050
$empty = Invoke-Json -Method POST -Path '/api/companies' -Body (@{ name = 'Empty Company QA2' } | ConvertTo-Json -Compress) -Token $ta
$emptyId = $empty.Json.id
$deact = Invoke-Json -Method DELETE -Path "/api/companies/$emptyId" -Token $ta
$emptyGet = (Invoke-Json -Method GET -Path "/api/companies/$emptyId" -Token $ta).Json
Add-Result 'TC-050' 'Deactivate empty company' ($deact.Status -eq 204 -and $emptyGet.isActive -eq $false) "status=$($deact.Status)"

# TC-051
$co = Invoke-Json -Method POST -Path '/api/companies' -Body (@{ name = 'Company With Home QA2' } | ConvertTo-Json -Compress) -Token $ta
$coId = $co.Json.id
$chBody = (@{ companyId = $coId; code = 'HOMEQA2'; name = 'Active Home QA2'; bedCapacity = 10 } | ConvertTo-Json -Compress)
Invoke-Json -Method POST -Path '/api/care-homes' -Body $chBody -Token $ta | Out-Null
$blocked = Invoke-Json -Method DELETE -Path "/api/companies/$coId" -Token $ta
Add-Result 'TC-051' 'Deactivate company with active homes' ($blocked.Status -eq 400) "status=$($blocked.Status)"

# TC-052
$sameA = Invoke-Json -Method POST -Path '/api/companies' -Body (@{ name = 'QA Care Ltd' } | ConvertTo-Json -Compress) -Token $ta
$sameB = Invoke-Json -Method POST -Path '/api/companies' -Body (@{ name = 'QA Care Ltd' } | ConvertTo-Json -Compress) -Token $tb
Add-Result 'TC-052' 'Same company name in different tenant' ($sameA.Status -eq 201 -and $sameB.Status -eq 201) "A=$($sameA.Status) B=$($sameB.Status)"

$results | Format-Table -AutoSize
$pass = ($results | Where-Object Result -eq 'PASS').Count
$fail = ($results | Where-Object Result -eq 'FAIL').Count
Write-Output "SUMMARY: $pass PASS, $fail FAIL"
if ($fail -gt 0) { exit 1 }
