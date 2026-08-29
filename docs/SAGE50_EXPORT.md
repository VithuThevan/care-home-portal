# Sage50 export

File-based CSV only. The API never writes to a Sage database.

## Flow

1. Operator chooses date range (optional company / care home / status).
2. `POST /api/sage-exports/preview` validates Sage ID and nominal code on **invoice line snapshots**.
3. `POST /api/sage-exports` writes a CSV via `IDocumentStore` under `tenants/{publicId}/sage-exports/` and records `SageExportBatch`. Export is tenant-scoped; download requires the same tenant plus care-home access.
4. Invoices are marked with `SageExportBatchId` / `SageExportedAt` to reduce accidental re-export.

## Column map

**PROVISIONAL** — lives in one class: `Export/Sage50ColumnMap.cs`

| Column | Source |
|---|---|
| AccountRef | Snapshot Sage ID |
| NominalCode | Snapshot nominal |
| InvoiceNumber | Invoice number |
| InvoiceDate | yyyy-MM-dd |
| Details | Line description |
| NetAmount | Line amount |
| TaxCode | `T0` (placeholder — VAT not agreed) |
| Department | Care home code snapshot |

Final Sage50 import specification **requires stakeholder confirmation**.
