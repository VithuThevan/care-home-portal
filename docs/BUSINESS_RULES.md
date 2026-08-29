# Business rules

## Client lifecycle

| Status | DischargeDate | IsArchived |
|---|---|---|
| Current | must be null | forced false |
| Left | required | optional |
| Deceased | required | optional |

- Status = occupancy. IsArchived = operational visibility.
- Current clients cannot be archived.
- Lists exclude archived clients unless `?includeArchived=true`.
- DOB cannot be in the future. Discharge cannot precede admission.
- Sage ID and Client Reference are unique **within a tenant** and never auto-generated.

## Parent deactivation

- Company cannot deactivate while it has active care homes.
- Care home cannot deactivate while it has Current non-archived clients.
- Funding authorities, categories, nominals, templates: soft deactivate only.

## Contracts and rates

- One client may have many funding contracts (Council + NHS + Private).
- After a contract is used on a non-void invoice, core identity fields cannot be rewritten. Close it and add a new contract instead.
- Rates are versioned. Adding a rate can close the previous open-ended row (`EffectiveTo = newFrom - 1`).
- Inclusive dates. Overlapping rates on one contract are rejected.
- `EffectiveTo < EffectiveFrom` is rejected.

## Billing

- Eligible period = requested period ∩ occupancy ∩ contract ∩ rate period, minus already finalized invoice coverage.
- Partial remaining fragments stay as separate lines. They are not merged into a later cycle.
- Missing rate/contract/nominal/template is a **critical error**. The engine does not invoice at a zero amount (messages use the organisation currency symbol).
- Miscellaneous billing uses tenant-scoped category **code** `MISC`, not a hardcoded category id.
- Due date is invoice date plus `TenantSettings.PaymentTermsDays` (default 30).
- Finalized invoice lines for the same client + contract + category cannot overlap service dates unless the existing document is Void.
- Generation runs in a database transaction (number + header + lines + totals + overlap check).

## Invoice immutability

- Generated invoices store **snapshots** (tenant name, company/home names, codes, rates, periods, amounts, template/bank text).
- Later master-data edits do not change old invoices or PDFs.
- PDFs are rebuilt from snapshots, never from live rates.
- There is no physical delete of finalized invoices. Use **Void**.
- Corrections: Void, or Credit Note then a new invoice.

## Credit notes

- Amounts are stored as **negative** adjustments.
- Credit cannot exceed remaining invoiced amount (invoiced + existing non-void credits).
- **PROVISIONAL:** no unrestricted override.

## Payment status

Stored: `NotPaid` | `Paid`.

`Due` is **derived**: unpaid, not void, and `DueDate < today`.

## Sage export

Already-exported invoices are skipped unless `IncludeAlreadyExported` is true. Eligibility requires Sage ID and nominal code on the **snapshot**.
