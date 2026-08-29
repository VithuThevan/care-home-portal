# Backup and restore

A restore was **verified** on 29 August 2026 against disposable LocalDB databases `CareHomeHardeningDb` → backup → `CareHomeHardeningRestoreDb`. `CareHomeDb` was not used and was not wiped.

Verified after restore (API pointed at the restored database):

| Check | Result |
|---|---|
| Login | PASS (`tenantadmin-a@hard.test`) |
| Client | PASS (`SAGE001` / Alice Brown) |
| Funding contract | PASS (1 contract) |
| Invoice | PASS (`INV-0001`, **£7,639.29**, 3 lines) |
| Invoice lines | PASS |
| Credit note | PASS (`CN-0001`) |
| Audit | PASS (tenant-scoped rows present) |

This proves the backup format and application compatibility. It is **not** a substitute for a restore test on the eventual Production SQL Server instance.

## What to back up

1. **SQL database** — tenants, users, clients, contracts, invoices, credits, audit, sequences.
2. **Document storage** — invoice PDFs, credit-note PDFs, Sage export CSVs under `DocumentStorage:RootPath` (or `App_Data/documents`). Paths are `tenants/{publicId}/invoices|credit-notes|sage-exports/`.

A database-only backup leaves PDFs and Sage files unrestorable. Invoice rows store a relative `PdfPath`; if the file is missing the API regenerates from **snapshots**, but Sage batch files and any logo files are not in SQL.

## Backup procedure (SQL Server)

Take this **before every migration/release**. Example (replace names):

```sql
BACKUP DATABASE [CareHome]
TO DISK = N'D:\backups\CareHome_predeploy.bak'
WITH COPY_ONLY, INIT, CHECKSUM, STATS = 10;
```

Copy the document root in the same change window, for example:

```powershell
robocopy D:\carehome-documents D:\backups\carehome-documents-predeploy /MIR
```

LocalDB (lab only):

```sql
BACKUP DATABASE [CareHomeHardeningDb]
TO DISK = N'C:\path\CareHomeHardeningDb.bak'
WITH COPY_ONLY, INIT;
```

## Restore procedure

Restore to a **different** database name first (never overwrite Production to “test” the restore).

```sql
RESTORE FILELISTONLY FROM DISK = N'D:\backups\CareHome_predeploy.bak';

RESTORE DATABASE [CareHomeRestoreCheck]
FROM DISK = N'D:\backups\CareHome_predeploy.bak'
WITH REPLACE,
  MOVE N'<logical_data>' TO N'D:\data\CareHomeRestoreCheck.mdf',
  MOVE N'<logical_log>' TO N'D:\data\CareHomeRestoreCheck_log.ldf',
  CHECKSUM;
```

Restore document files to a parallel folder. Point a **non-production** API instance at the restored database and restored document root:

```text
ConnectionStrings__DefaultConnection=...Database=CareHomeRestoreCheck...
DocumentStorage__RootPath=D:\backups\carehome-documents-predeploy
```

## Verification procedure

After pointing the API at the restored database:

1. `GET /health/ready` → Healthy
2. Login as a known tenant user
3. Open one client, its funding contract, one invoice (header + lines), one credit note, audit
4. Download that invoice PDF (file present **or** regenerated from snapshots)
5. Confirm another tenant cannot see the restored tenant’s invoice (404)

Do not claim a Production instance is recoverable until this has been done on **that** SQL Server with **that** backup tool.

## Recommended schedule (deployment-specific)

Mark as policy to agree with the operator. A reasonable starting point, not a legal retention rule:

| Item | Suggestion to review |
|---|---|
| Full database backup | Daily, plus immediately before migrations |
| Transaction-log backup | If the database is FULL recovery: hourly during business hours |
| Document storage | Daily copy or volume snapshot with the database job |
| Off-site copy | Yes |
| Restore test | At least once before pilot go-live, then periodically |
| Retention | Operator/legal decision — do not hard-code |

## Rollback after a failed release

If a migration was applied and the release must be abandoned: restore the **pre-deployment** database backup and the matching document copy. Do not run EF `Down()` on live financial data.
