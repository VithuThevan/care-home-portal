# Existing customer migration

This repository’s historical migrations still insert Sovereign Care Homes, Care Pro, and thirteen care homes (including Ampersand House) via `HasData` in old migration files. **Do not edit those files.**

## What `AddMultiTenancy` does

`AddMultiTenancy` (`20260829072440_AddMultiTenancy`):

1. Creates `Tenants` and `TenantSettings`
2. Inserts tenant Id=1, name **Existing Organisation**, fixed `PublicId`
3. Adds `TenantId` as nullable, backfills `1`, then makes it required with Restrict FKs
4. Replaces global unique indexes with tenant-composite indexes
5. Reshapes `DocumentSequences` to `(TenantId, DocumentType)` with prefix and length; maps existing Invoice / CreditNote rows to tenant 1
6. Sets `AspNetUsers.TenantId = 1` except SuperAdmin / PlatformAdmin users (those stay null)
7. Copies SuperAdmin role assignments to PlatformAdmin
8. Adds `SnapshotTenantName` on invoices and backfills the tenant name
9. **Does not** `DeleteData` companies, care homes, invoice categories, or sequences

After update, existing operational data belongs to organisation **Existing Organisation**. Rename it in Organisation settings if needed.

## Historical company seed cleanup (forward-only)

`InitialCreate` still inserts **Sovereign Care Homes** and **Care Pro** onto tenant 1. That file is not rewritten.

Migration `RemoveUnusedHistoricalCustomerSeedCompanies` then deletes those two companies **only when they are unused**:

- tenant is `1`
- name is exactly `Sovereign Care Homes` or `Care Pro`
- no care homes, invoices, invoice templates, or Sage export batches point at the company

This preserves existing customer databases that already attached homes or financial documents to those companies. It does **not** try to guess whether a used record is “historical seed” or “real customer data”.

**Limitation:** if tenant 1 has unused companies with those exact names that an operator created on purpose (no homes, no invoices), they are also removed. Recreate them after migration if that happens. Names on any other tenant are never deleted.

New organisations created with `POST /api/platform/tenants` never receive these names.

Apply yourself (this changes the database):

```powershell
cd backend\CareHome.Api
dotnet ef database update
```

New customers after this point are onboarded with `POST /api/platform/tenants`. They do not share invoice categories or sequences with tenant 1.

Leftover Sovereign / Care Pro / Ampersand strings in old `Migrations/*.cs` and Designer files are **migration compatibility**, not product seed.
