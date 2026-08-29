# UAT remediation report

**Date:** 29 August 2026  
**Database:** disposable `CareHomeRemediationDb` on `(localdb)\MSSQLLocalDB` (CareHomeDb was not used or wiped)  
**API:** `http://localhost:5092`  
**This pass did not start production hardening.**

---

# 1. Summary

Original:

P0: 1  
P1: 1  
P2: 3  
P3: 2

After remediation:

Open P0: 0  
Open P1: 0  
Open P2: 0  
Open P3: 0

---

# 2. UAT-001

**Root cause:** Create/update of `ClientFundingContract` did not reject overlapping inclusive periods on the same funding stream. Billing preview looped every Active contract independently, so two Active contracts for the same client + funding authority + invoice category produced two invoice lines for the same occupancy days.

**Contract overlap rule:** Stream identity is Tenant + Client + Funding Authority + Invoice Category. Nominal Code is **not** identity. Historical contracts on that stream are allowed only when inclusive dates do not overlap. Null `ContractEndDate` is open-ended. Adjacent periods (`01-Jan → 31-Mar` then `01-Apr → open`) are allowed. Create/update of an **Active** contract returns `400` / `OVERLAPPING_FUNDING_CONTRACT`. Inactivating a mistaken duplicate is allowed so operators can repair data; billing ignores Inactive contracts.

**Database:** A UNIQUE index cannot express arbitrary date-range exclusion. Overlap remains business logic (`DateRanges.Overlaps` / `FundingContractOverlap`). Customer DBs should be identified with the query in `docs/BUSINESS_RULES.md`; do not auto-delete contracts.

**Billing defensive protection:** Applicable Active contracts are grouped by authority + category. If any pair overlaps, preview/generate add `OVERLAPPING_FUNDING_CONTRACTS` with client, authority, category, contract IDs, and overlapping dates. `CanGenerate = false`. No first-contract pick, no sum, no silent de-dupe.

**Tests:** Four unit tests on period overlap. API: overlapping create rejected; adjacent create allowed; SQL-inserted overlapping Active pair blocked generate; after extras inactivated, May 2026 grouped invoice succeeded.

**Final result:** PASS.

---

# 3. UAT-002

**Actual Angular change-detection root cause:** Accidental zoneless behaviour. Angular 22 had no `zone.js` import and no `provideZoneChangeDetection`. Components use conventional mutable fields and `HttpClient.subscribe`. Auth used a signal (shell updated); list/detail pages did not.

**Solution chosen:** Application-wide Zone.js restoration (`zone.js` dependency, `import 'zone.js'` in `main.ts`, `provideZoneChangeDetection()` in `app.config.ts`). No scattered `detectChanges()` / `setTimeout` hacks.

**Pages audited:** Dashboard, companies, care homes, care-home dashboard, clients, client profile, funding authorities, invoice categories, nominal codes, invoice templates, billing, invoices, invoice details, credit notes, misc charges, reports, Sage exports, users, audit, organisation settings, platform tenants. Loading/saving flags already cleared on error; invoice detail and dashboard now also clear loading on 404/error. Write controls use `AuthService.canWrite()`.

**Live/browser result:** Frontend production build succeeded. Dev server rebuilt with Zone.js. Playwright/Chrome/Edge were not present in this remediation environment, so click-through screenshots were not repeated here. HTTP 404 on a missing invoice is returned by the API and the detail page sets `isLoading = false` with an error message. Confirm `/clients`, `/invoices`, `/invoices/:id`, client profile, `/billing`, `/dashboard` in UAT retest.

---

# 4. UAT-003

Preview DTO already included `nominalCode` / `nominalCodeId`. The Billing Workspace table now has a Nominal column. May preview lines showed `4000`. Missing nominal remains a blocking billing error (`MISSING_NOMINAL`).

---

# 5. UAT-004

GET `/api/invoices/1` snapshot header included invoice number, invoice date `2026-05-31`, due date `2026-06-30`, period, company, home, East County Council, General Care, status, payment, total. Lines included client name, reference, Sage ID, description, service from/to, 31 days, Weekly, rate 575, nominal 4000, line amount. ReadOnly generate returned **403**. Write buttons are hidden/disabled via `canWrite()`.

---

# 6. UAT-005

GET `/api/invoices/1/pdf` returned `%PDF-1.7` (56,875 bytes). Layout now includes due date, company/home/authority/category, and line Sage ID, service dates, days, rate/frequency, nominal, amount. Logo is optional: rendered from a readable template/home/tenant file at first PDF materialization; omitted if absent. After a further live client rename to Zelda Snapshot / SAGE999, stored invoice lines remained Alicia Renamed / CHANGED1 (generate-time snapshot). Cached PDF is not rebuilt from live rates.

---

# 7. P3

**UAT-006:** Collapsible mobile nav (Menu toggle). Not a billing/security change. PASS.

**UAT-007:** Billing display names are FirstName + LastName (Title dropped from snapshots). Preview: Alice Brown / David Smith / Mary Jones. PASS. Historical invoice rows were not rewritten.

---

# 8. Financial regression

| | Expected | Actual |
|---|---|---|
| Grouped invoice | One invoice, three clients, Oak Lodge / East County Council / GENERAL_CARE | **INV-0001** |
| Line count | 3 | **3** |
| Total | £7,639.29 (3 × £2,546.43 for 31 weekly days at £575) | **£7,639.29** |
| Total = sum(lines) | Yes | **Yes** (2546.43 × 3) |
| Duplicate clients / Sage IDs | None | **None** |
| Sage preview | Each intended transaction once | **3 eligible rows** (CHANGED1, SAGE002, SAGE003 — Alice’s Sage ID on this disposable invoice is the post-rename snapshot from generate time; still one row, not the six-line SAGE001–003 duplicate) |

---

# 9. Security regression

Organisation B (Sunrise Health Group) GET Org A company, invoice `1`, and invoice PDF: **404**. ReadOnly POST generate: **403**. Same-looking codes (HOME01, 4000, CLIENT001) remain tenant-scoped. No cross-tenant leakage found in this pass.

---

# 10. Build result

| | Result |
|---|---|
| Backend | `dotnet build` CareHome.Api — succeeded, 0 warnings |
| Tests | `FundingContractOverlapTests` — 4 passed |
| Frontend | `npm run build` — succeeded (bundle budget warning only, pre-existing class) |
| EF | `dotnet ef migrations has-pending-model-changes` — **No changes have been made to the model since the last migration.** No new migration required (logo is resolved at first PDF render from configured paths, then the PDF file is cached). |

---

# 11. Remaining business decisions

Still provisional / awaiting finance confirmation (unchanged):

- Weekly proration
- Monthly proration
- Inclusive billing-day rule
- Sage CSV mapping

---

# 12. Recommendation

READY FOR UAT RETEST
