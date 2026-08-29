# Open business decisions

These choices are **implemented so the product works**. They are **not** stakeholder-approved.

| Topic | Provisional choice | Where to change |
|---|---|---|
| Weekly proration | weekly amount / 7 × eligible days | `Billing/RateCalculator.cs` |
| Monthly proration | amount / days-in-month × days in that month | `Billing/RateCalculator.cs` |
| Rounding | MidpointAwayFromZero, 2 dp | `Common/Money.cs` |
| Invoice numbering scope | Per tenant, prefix + padded length (default `INV-0001`) | `DocumentSequence` `(TenantId, DocumentType)` |
| Invoice date | Period end | `BillingService.GenerateAsync` |
| Due date | Invoice date + `TenantSettings.PaymentTermsDays` (default 30) | same |
| Identifier uniqueness | Tenant-scoped (not company-scoped); two companies in one org cannot share `CLIENT001` | unique indexes |
| “Due” payment status | Derived, not stored | Invoice DTOs |
| VAT / tax | Not applied. Sage TaxCode placeholder `T0` | `Sage50ColumnMap` |
| Invoice grouping | One invoice per company+home+authority+category | `BillingService` |
| Credit override | Not allowed above remaining invoiced amount | `CreditNoteService` |
| Sage50 CSV columns | See `SAGE50_EXPORT.md` | `Sage50ColumnMap.cs` |
| Email provider | SMTP adapter + Development simulation | `Email/ConfigurableEmailSender.cs` |
| Document retention | Local folder under `tenants/{publicId}/...`, no purge job | `LocalDocumentStore` |
| Approval workflows | None | — |
| Care home bed capacity seed | Operators enter real figures; Development demo uses Sunrise House | `DevelopmentMasterDataSeeder` |
| Template extra step | Company+Category between home and category-default, filtered by tenant | `InvoiceTemplateResolver` |

When a stakeholder confirms a rule, change the isolated class above and update this file.

## Not implemented (commercial / later)

| Topic | Notes |
|---|---|
| SaaS vs dedicated | Isolation is Tenant in one database. Dedicated DB per customer is not implemented. |
| Subscriptions / Stripe | Not implemented. |
| Custom domains | Not implemented. |
| Per-tenant SMTP secrets | Platform SMTP via env; tenant may store non-secret from-name/from-address only. |
| GDPR erasure tooling | Not implemented. |
| Tenant impersonation | Not implemented. PlatformAdmin cannot open operational data. |
| Per-plan feature flags | Not implemented. |
