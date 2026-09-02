# UAT TC-053 through TC-081 API tests (TC-079/080 are UI-only)
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:5092'
$results = @()
$today = Get-Date -Format 'yyyy-MM-dd'
$futureDob = (Get-Date).AddDays(1).ToString('yyyy-MM-dd')
$pastDob = '1980-01-15'
$admission = '2026-05-10'
$dischargeValid = '2026-05-20'
$dischargeInvalid = '2026-05-01'

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
    $tp = $c.Json.temporaryPassword
    $t = Login $email $tp
    Invoke-Json POST '/api/auth/change-password' (@{ currentPassword = $tp; newPassword = 'QaTenantAdmin!99' } | ConvertTo-Json -Compress) $t | Out-Null
    return Login $email 'QaTenantAdmin!99'
}

function New-Company($token, $name) {
    $r = Invoke-Json POST '/api/companies' (@{ name = $name } | ConvertTo-Json -Compress) $token
    return $r.Json.id
}

function New-CareHome($token, $companyId, $code, $name, $capacity = 20, $managerEmail = $null) {
    $body = @{
        companyId = $companyId; code = $code; name = $name; bedCapacity = $capacity
        managerName = 'QA Manager'; managerPhone = '0200000000'
    }
    if ($managerEmail) { $body.managerEmail = $managerEmail }
    $r = Invoke-Json POST '/api/care-homes' ($body | ConvertTo-Json -Compress) $token
    return $r
}

function Update-CareHome($token, $id, $companyId, $code, $name, $capacity, $isActive = $true, $managerEmail = $null) {
    $body = @{
        companyId = $companyId; code = $code; name = $name; bedCapacity = $capacity; isActive = $isActive
        managerName = 'QA Manager Updated'
    }
    if ($managerEmail) { $body.managerEmail = $managerEmail }
    return Invoke-Json PUT "/api/care-homes/$id" ($body | ConvertTo-Json -Compress) $token
}

function New-Client($token, $careHomeId, $sageId, $ref, $first, $last, $admissionDate = $admission, $dob = $pastDob, $email = $null) {
    $body = @{
        careHomeId = $careHomeId; sageId = $sageId; referenceNumber = $ref
        firstName = $first; lastName = $last; careType = 'Residential'
        admissionDate = $admissionDate; dateOfBirth = $dob
    }
    if ($email) { $body.email = $email }
    return Invoke-Json POST '/api/clients' ($body | ConvertTo-Json -Compress) $token
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

$pt = Login 'admin@localhost' 'DevAdmin!12345'
if (-not $pt) { throw 'Platform login failed' }
$ta = Provision-Tenant $pt 'QA Homes Tenant A' 'qa-homes-a@uat.test'
$tb = Provision-Tenant $pt 'QA Homes Tenant B' 'qa-homes-b@uat.test'

$coA = New-Company $ta 'QA Company A'
$coB = New-Company $tb 'QA Company B'

# TC-053 Create care home
$ch = New-CareHome $ta $coA 'HOME01' 'Oak Lodge QA' 20 'manager@qa.test'
$home1Id = $ch.Json.id
Add-Result 'TC-053' 'Create care home' ($ch.Status -eq 201 -and $ch.Json.code -eq 'HOME01') "status=$($ch.Status); id=$home1Id"

# TC-054 Edit care home
$edit = Update-CareHome $ta $home1Id $coA 'HOME01' 'Oak Lodge QA Updated' 25 $true 'manager.updated@qa.test'
$getHome = Invoke-Json GET "/api/care-homes/$home1Id" $null $ta
Add-Result 'TC-054' 'Edit care home' ($getHome.Json.name -eq 'Oak Lodge QA Updated' -and $getHome.Json.bedCapacity -eq 25) "name=$($getHome.Json.name)"

# TC-055 duplicate code same tenant
$dup = New-CareHome $ta $coA 'HOME01' 'Duplicate Home' 10
Add-Result 'TC-055' 'Duplicate care-home code same tenant' ($dup.Status -eq 400) "status=$($dup.Status)"

# TC-056 same code second tenant
$chB = New-CareHome $tb $coB 'HOME01' 'Oak Lodge Tenant B' 15
Add-Result 'TC-056' 'Same care-home code in second tenant' ($chB.Status -eq 201) "status=$($chB.Status)"

# TC-057 negative capacity
$neg = Invoke-Json POST '/api/care-homes' (@{ companyId = $coA; code = 'NEGCAP'; name = 'Neg Cap'; bedCapacity = -1 } | ConvertTo-Json -Compress) $ta
Add-Result 'TC-057' 'Negative capacity' ($neg.Status -eq 400) "status=$($neg.Status)"

# TC-058 zero capacity
$zero = New-CareHome $ta $coA 'ZERO01' 'Zero Cap Home' 0
Add-Result 'TC-058' 'Zero capacity' ($zero.Status -eq 201) "status=$($zero.Status)"

# TC-059 invalid manager email
$badEmail = Invoke-Json POST '/api/care-homes' (@{ companyId = $coA; code = 'BADEML'; name = 'Bad Email Home'; bedCapacity = 5; managerEmail = 'abc' } | ConvertTo-Json -Compress) $ta
Add-Result 'TC-059' 'Invalid manager email' ($badEmail.Status -eq 400) "status=$($badEmail.Status)"

# TC-060 deactivate home without current clients
$emptyHome = New-CareHome $ta $coA 'EMPTY1' 'Empty Home' 10
$emptyId = $emptyHome.Json.id
$deact = Invoke-Json DELETE "/api/care-homes/$emptyId" $null $ta
$emptyAfter = Invoke-Json GET "/api/care-homes/$emptyId" $null $ta
Add-Result 'TC-060' 'Deactivate home without current clients' ($deact.Status -eq 204 -and $emptyAfter.Json.isActive -eq $false) "status=$($deact.Status)"

# TC-061 deactivate with current clients
$busyHome = New-CareHome $ta $coA 'BUSY01' 'Busy Home' 10
$busyId = $busyHome.Json.id
New-Client $ta $busyId 'SAGE-BUSY' 'CLIENT-BUSY' 'Busy' 'Client' | Out-Null
$blockDeact = Invoke-Json DELETE "/api/care-homes/$busyId" $null $ta
Add-Result 'TC-061' 'Deactivate home with current clients' ($blockDeact.Status -eq 400) "status=$($blockDeact.Status)"

# TC-062 dashboard metrics
$dash = Invoke-Json GET "/api/dashboard/care-homes/$busyId" $null $ta
Add-Result 'TC-062' 'Care-home dashboard metrics' ($dash.Status -eq 200 -and $dash.Json.capacity -eq 10 -and $dash.Json.occupied -eq 1 -and $dash.Json.available -eq 9) "cap=$($dash.Json.capacity) occ=$($dash.Json.occupied) avail=$($dash.Json.available)"

# TC-063 LocationManager access
$home2 = New-CareHome $ta $coA 'HOME02' 'Second Home' 12
$home2Id = $home2.Json.id
$userCreate = Invoke-Json POST '/api/users' (@{
    email = 'locmgr@uat.test'; displayName = 'Loc Mgr'; password = 'LocMgrPass!12345'
    role = 'LocationManager'; careHomeIds = @($home1Id)
} | ConvertTo-Json -Compress) $ta
$locToken = Login 'locmgr@uat.test' 'LocMgrPass!12345'
$allowed = Invoke-Json GET "/api/care-homes/$home1Id" $null $locToken
$denied = Invoke-Json GET "/api/care-homes/$home2Id" $null $locToken
Add-Result 'TC-063' 'Unassigned home inaccessible' ($allowed.Status -eq 200 -and $denied.Status -eq 404) "home1=$($allowed.Status) home2=$($denied.Status)"

# TC-064 create client
$cl = New-Client $ta $home1Id 'SAGE001' 'CLIENT001' 'Alice' 'QA'
$clientId = $cl.Json.id
Add-Result 'TC-064' 'Create current client' ($cl.Status -eq 201 -and $cl.Json.status -eq 'Current') "status=$($cl.Status); id=$clientId"

# TC-065 edit client
$cur = (Invoke-Json GET "/api/clients/$clientId" $null $ta).Json
$upd = Update-Client $ta $clientId $cur @{ firstName = 'Alicia'; lastName = 'Updated' }
$after = (Invoke-Json GET "/api/clients/$clientId" $null $ta).Json
Add-Result 'TC-065' 'Edit client' ($after.firstName -eq 'Alicia') "firstName=$($after.firstName)"

# TC-066 search by name
$searchName = Invoke-Json GET '/api/clients?search=Alicia' $null $ta
Add-Result 'TC-066' 'Search by name' ($searchName.Json.items.Count -ge 1 -and $searchName.Json.items[0].firstName -eq 'Alicia') "count=$($searchName.Json.items.Count)"

# TC-067 search by Sage/reference
$searchSage = Invoke-Json GET '/api/clients?search=SAGE001' $null $ta
Add-Result 'TC-067' 'Search by Sage ID/reference' ($searchSage.Json.items.Count -eq 1) "count=$($searchSage.Json.items.Count)"

# TC-068 filter by home/status
$filter = Invoke-Json GET "/api/clients?careHomeId=$home1Id&status=Current" $null $ta
Add-Result 'TC-068' 'Filter by care home/status' ($filter.Json.items.Count -ge 1 -and ($filter.Json.items | Where-Object { $_.status -ne 'Current' }).Count -eq 0) "count=$($filter.Json.items.Count)"

# TC-069 duplicate Sage ID
$dupSage = New-Client $ta $home1Id 'SAGE001' 'CLIENT-DUP1' 'Dup' 'Sage'
Add-Result 'TC-069' 'Duplicate Sage ID' ($dupSage.Status -eq 400) "status=$($dupSage.Status)"

# TC-070 duplicate reference
$dupRef = New-Client $ta $home1Id 'SAGE-DUP2' 'CLIENT001' 'Dup' 'Ref'
Add-Result 'TC-070' 'Duplicate reference number' ($dupRef.Status -eq 400) "status=$($dupRef.Status)"

# TC-071 future DOB
$future = New-Client $ta $home1Id 'SAGE-FUT' 'CLIENT-FUT' 'Future' 'Dob' $admission $futureDob
Add-Result 'TC-071' 'Future date of birth' ($future.Status -eq 400) "status=$($future.Status)"

# TC-072 invalid email
$badClientEmail = New-Client $ta $home1Id 'SAGE-EML' 'CLIENT-EML' 'Bad' 'Email' $admission $pastDob 'invalid-email'
Add-Result 'TC-072' 'Invalid client email' ($badClientEmail.Status -eq 400) "status=$($badClientEmail.Status)"

# TC-073 Left without discharge
$cur = (Invoke-Json GET "/api/clients/$clientId" $null $ta).Json
$leftNoDate = Update-Client $ta $clientId $cur @{ status = 'Left'; dischargeDate = $null }
Add-Result 'TC-073' 'Current to Left requires discharge date' ($leftNoDate.Status -eq 400) "status=$($leftNoDate.Status)"

# TC-074 Left with valid discharge
$cur = (Invoke-Json GET "/api/clients/$clientId" $null $ta).Json
$leftOk = Update-Client $ta $clientId $cur @{ status = 'Left'; dischargeDate = $dischargeValid }
$leftClient = (Invoke-Json GET "/api/clients/$clientId" $null $ta).Json
Add-Result 'TC-074' 'Current to Left with valid discharge' ($leftOk.Status -eq 200 -and $leftClient.status -eq 'Left') "status=$($leftClient.status)"

# TC-075 Deceased without date
$live = New-Client $ta $home1Id 'SAGE-DEC' 'CLIENT-DEC' 'Dec' 'Case'
$liveId = $live.Json.id
$liveCur = (Invoke-Json GET "/api/clients/$liveId" $null $ta).Json
$deceasedNoDate = Update-Client $ta $liveId $liveCur @{ status = 'Deceased'; dischargeDate = $null }
Add-Result 'TC-075' 'Deceased requires discharge/end date' ($deceasedNoDate.Status -eq 400) "status=$($deceasedNoDate.Status)"

# TC-076 discharge before admission
$live2 = New-Client $ta $home1Id 'SAGE-DIS' 'CLIENT-DIS' 'Dis' 'Charge'
$live2Id = $live2.Json.id
$live2Cur = (Invoke-Json GET "/api/clients/$live2Id" $null $ta).Json
$badDischarge = Update-Client $ta $live2Id $live2Cur @{ status = 'Left'; dischargeDate = $dischargeInvalid }
Add-Result 'TC-076' 'Discharge before admission' ($badDischarge.Status -eq 400) "status=$($badDischarge.Status)"

# TC-077 archive Current client
$archiveCurrent = Invoke-Json DELETE "/api/clients/$live2Id" $null $ta
Add-Result 'TC-077' 'Archive Current client' ($archiveCurrent.Status -eq 400) "status=$($archiveCurrent.Status)"

# TC-078 archive Left client
$archiveLeft = Invoke-Json DELETE "/api/clients/$clientId" $null $ta
$listNormal = Invoke-Json GET '/api/clients' $null $ta
$listArchived = Invoke-Json GET '/api/clients?includeArchived=true' $null $ta
$archivedVisible = ($listArchived.Json.items | Where-Object { $_.id -eq $clientId -and $_.isArchived }).Count -eq 1
$hiddenNormal = ($listNormal.Json.items | Where-Object { $_.id -eq $clientId }).Count -eq 0
Add-Result 'TC-078' 'Archive Left client' ($archiveLeft.Status -eq 204 -and $archivedVisible -and $hiddenNormal) "archive=$($archiveLeft.Status)"

Add-Result 'TC-079' 'Navigate between client IDs (UI)' $false 'UI-only; not executed via API'
Add-Result 'TC-080' 'Non-existent client Not Found (UI)' $false 'UI-only; not executed via API'

# TC-081 same identifiers second tenant (Tenant A already has SAGE001/CLIENT001 from TC-064)
$sameB = New-Client $tb $chB.Json.id 'SAGE001' 'CLIENT001' 'TenantB' 'Client'
$existsA = (Invoke-Json GET '/api/clients?search=SAGE001' $null $ta).Json.items.Count -ge 1
Add-Result 'TC-081' 'Same Sage/reference in second tenant' ($existsA -and $sameB.Status -eq 201) "tenantA has record=$existsA; tenantB status=$($sameB.Status)"

$results | Format-Table -AutoSize
$pass = ($results | Where-Object Result -eq 'PASS').Count
$fail = ($results | Where-Object Result -eq 'FAIL').Count
Write-Output "SUMMARY: $pass PASS, $fail FAIL"
if ($fail -gt 0) { exit 1 }
