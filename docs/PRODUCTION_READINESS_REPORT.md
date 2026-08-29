# Production readiness report

**Date:** 29 August 2026  
**Scope:** Production hardening of the UAT-passed Care Home Back-Office (no billing redesign).  
**Disposable databases:** `CareHomeHardeningDb` / `CareHomeHardeningRestoreDb` on `(localdb)\MSSQLLocalDB`. **`CareHomeDb` was not used and was not wiped.**

---

## 1. Executive result

**CONDITIONALLY READY** as a technical build.

**Recommendation (exact):**

```text
READY FOR CONTROLLED PILOT — BUSINESS SIGN-OFF REQUIRED
```

Do not describe this as “fully production ready”. Weekly/monthly proration, inclusive day counting, and Sage 50 mapping remain **PENDING** business decisions. A controlled pilot may proceed on a dedicated tenant/database once secrets, HTTPS, SMTP (or accepted simulation), and backups are in place — **live funder invoicing** should wait for sign-off in `docs/PRODUCTION_BUSINESS_SIGNOFF.md`.

---

## 2. Security

| Area | Result |
|---|---|
| Authentication | Generic 401 for unknown user, wrong password, inactive user, inactive tenant. Lockout 5/15 minutes. Login rate limit 10/min/IP. |
| Authorization | ReadOnly generate **403**. LocationManager unassigned home **404**. PlatformAdmin operational API **403**. |
| Tenant isolation | Org B invoice/PDF/Sage file **404**. Sage preview eligible **0** for the other org. |
| Secrets | `Jwt:Key` empty in shared appsettings. Production fail-fast if missing/placeholder/weak. DevAdmin seed rejected outside Development. No production secrets committed. |
| HTTPS | Production `UseHttpsRedirection` + HSTS when `Https:Redirect` is true (default). Forwarded proto honoured. |
| CORS | Configured origins only. No `AllowAnyOrigin`. Production rejects localhost origins. Empty list = same-origin. |
| Rate limiting | Login only. |
| Error handling | Generic 500 + correlation id. No stack/SQL/paths in the body. |
| Uploads/downloads | Misc CSV: 2 MB, `.csv` only, sanitized name. Documents: tenant folders, no `..`, authorized PDF/Sage endpoints. |

Login UI no longer prefills `admin@localhost`. Production Angular bundle has no `localhost` / `DevAdmin` strings.

---

## 3. Database

| Check | Result |
|---|---|
| Production connection | Must be supplied. LocalDB rejected outside Development (verified fail-fast). |
| Migrations at startup | **Not** applied automatically. |
| `has-pending-model-changes` | No pending model changes. |
| Indexes | Existing tenant/client/invoice/audit indexes cover the smoke queries. No new mechanical indexes. 303-client list ~123 ms. |
| Backup | SQL `COPY_ONLY` backup of `CareHomeHardeningDb`. |
| Restore | Restored to `CareHomeHardeningRestoreDb`. API login + invoice **£7,639.29** / 3 lines / credit / audit survived. |

---

## 4. Financial integrity

| Check | Expected | Actual |
|---|---|---|
| Grouped invoice | £7,639.29 | **£7,639.29** |
| Lines | 3 | **3** |
| Sage IDs | unique SAGE001–003 | **SAGE001, SAGE002, SAGE003** once each |
| Overlap create | 400 `OVERLAPPING_FUNDING_CONTRACT` | **400** |
| Invoice snapshots / PDF | `%PDF` | **%PDF**, 54,063 bytes |
| Credit | does not rewrite invoice | `CN-0001` **−2546.43**; invoice remained Generated after failed email |
| Sequence | not MAX+1 (existing UAT) | unchanged this pass |

Formulas were **not** changed.

---

## 5. External services

| Service | Result |
|---|---|
| Email | Smtp with unreachable host: send **400**, invoice **not** deleted, status still Generated, total unchanged. Simulation in Production logs a loud warning. Incomplete Smtp config fails fast. |
| Sage | Provisional map unchanged. Details neutralized for formula injection; machine columns left intact. Finance Sage50 import **not** done. |
| File storage | Configurable root, tenant-separated paths. Database backup does **not** include files. |

---

## 6. Deployment

| Check | Result |
|---|---|
| `dotnet build` | Succeeded (0 warnings to a side output when default bin was locked) |
| `dotnet publish -c Release` | Succeeded (`%TEMP%\carehome-publish`) |
| `npm run build` | Succeeded; no localhost/DevAdmin in `dist` |
| Health | `/health/live` 200, `/health/ready` 200 |
| Correlation | Echoed `hardening-corr-1` |
| Rollback | Documented: previous package; DB restore not `Down()` |

---

## 7. Data protection

See `docs/DATA_PROTECTION.md`. Authorization, HTTPS assumption, no secrets in logs, generic production errors. **Not** a GDPR certification. Retention, lawful basis, and erasure vs financial records need legal/business policy.

---

## 8. Business sign-off

| Item | Status |
|---|---|
| Weekly proration | PENDING |
| Monthly proration | PENDING |
| Inclusive dates | PENDING |
| Sage mapping | PENDING |

---

## 9. Remaining blockers

### Technical

None that block a **controlled pilot** on a dedicated environment. Not done in this pass: 20-home synthetic scale (3 homes + 303 clients used); live browser click-through of the emptied login field; target Sage 50 import; restore on the eventual Production SQL instance.

Cosmetic: UAT-005 overlapping PDF date glyph (not reopened).

### Business

Weekly proration, monthly proration, inclusive billing-day rule, Sage column map — all PENDING (`docs/PRODUCTION_BUSINESS_SIGNOFF.md`).

### Operational

Production SQL Server (not LocalDB), `Jwt__Key`, first-admin bootstrap (not DevAdmin), HTTPS/DNS, SMTP or accepted simulation, backup jobs for **database + documents**, monitoring (`docs/OPERATIONS_CHECKLIST.md`), restore test on the real host.

---

## 10. Recommendation

```text
READY FOR CONTROLLED PILOT — BUSINESS SIGN-OFF REQUIRED
```
