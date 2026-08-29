# UAT checklist (operator)

Use a **UAT organisation** and a **UAT database**. Do not practise on a live customer database.

You need: the web address of the application, a TenantAdmin (or Administrator) login, and a PlatformAdmin login if you will create organisations. Ask IT for the UAT URL and passwords. Do not put passwords in email threads if your policy forbids it.

If something fails, write down: the screen, what you clicked, the message you saw, and the time.

---

## 1. Login

- [ ] Open the application. You see a login screen (not a blank page).
- [ ] Wrong password is rejected with a clear message.
- [ ] Correct TenantAdmin login opens the dashboard (or Companies). The organisation name appears in the header.
- [ ] Log out, then log in again. You are not stuck on a spinner.

## 2. Organisation settings

- [ ] Open **Organisation** (under the admin section). You see the organisation name, currency, invoice prefix, and payment terms.
- [ ] Change a harmless field (for example trading name) and Save. Refresh the page. The change is still there.
- [ ] A ReadOnly user must not be able to save (button hidden or error on save).

## 3. Company

- [ ] Open **Companies**. The list loads (empty is OK for a new organisation).
- [ ] Add a company. It appears in the list.
- [ ] Edit the name. The new name shows after save.
- [ ] You cannot add a second company with the **same name**.

## 4. Care Home

- [ ] Open **Care Homes**. Add a home linked to the company, with a unique code and a bed capacity.
- [ ] Open the home **Dashboard**. Occupancy and recent invoices area load (zeros are OK).
- [ ] Add a second home if you will test location permissions later.

## 5. Client

- [ ] Open **Clients**. Add a current client: Sage ID, client reference, name, care type, admission date, email.
- [ ] Sage ID and reference must be unique in this organisation.
- [ ] Open the client profile. Edit details and save.
- [ ] You cannot archive a **Current** client. Set status to Left (with discharge date) if you need to archive.

## 6. Funding Authority

- [ ] Open **Funding Authorities**. Add one (for example type Council, billing frequency Monthly).
- [ ] It appears in the list and can be selected on a funding contract.

## 7. Nominal Code

- [ ] Open **Nominal Codes**. Add a code (for example `4000`) and name.
- [ ] Duplicate codes are rejected.

## 8. Funding Contract

- [ ] On the client profile, add an **active** contract: authority, invoice category (usually General Care), nominal code, start date.
- [ ] After the client has a finalized invoice, you must not be able to rewrite the contract’s core identity. Close it and add a new contract instead.

## 9. Rate

- [ ] Add a weekly (or daily/monthly) rate from a start date. Amount is pounds and pence, not a blank or zero unless that is truly agreed.
- [ ] A second overlapping rate on the same contract is rejected.
- [ ] Open-ended rates can be closed when you add a later rate.

## 10. Invoice Template

- [ ] Open **Invoice Templates**. Add a template for General Care.
- [ ] Fill bank name, sort code, account number, footer, and a contact email (invoices cannot be emailed without a recipient).
- [ ] Save. The template appears in the list.

## 11. Billing Preview

- [ ] Open **Billing Workspace**. Select company, optional home, category, and a period the client was in residence.
- [ ] Preview. You see lines with days, rate, and amount — or a clear error (missing rate, template, and so on).
- [ ] If you preview a period that was **already invoiced in full**, generation is blocked and you see **ALREADY_FULLY_BILLED**.
- [ ] If you preview a period that **overlaps** an old invoice but has **new days**, you see requested period, already billed period, remaining billable period, and skipped days. That is allowed. It is not a fault.

## 12. Invoice generation

- [ ] Generate from a preview that is allowed. You get at least one invoice number (for example `INV-0001`).
- [ ] Generating the **same fully billed period again** does not create a second invoice for those days.
- [ ] Two people must not generate the same period at the same second and get two invoices. If you can, try Save twice quickly; you should get one success and one error, not two documents.

## 13. PDF

- [ ] Open the invoice and download the PDF. It opens as a PDF (not an error page).
- [ ] Check: organisation, company, care home, invoice number, invoice date, billing period, recipient/contact, client lines, rates/amounts, total, bank details, footer.
- [ ] Change the live client name or Sage ID. Re-open the **old** invoice PDF. The **old** name/Sage ID must still show on that historical invoice.

## 14. Email

- [ ] Send the invoice. In UAT, mail is often **simulated** (no real inbox). You should still see success, not a crash.
- [ ] If UAT uses real SMTP, confirm the message arrived and the PDF is attached.
- [ ] Sending without a recipient email is refused with a clear message.

## 15. Credit Note

- [ ] Open **Credit Notes**. Preview a period that covers **one** invoice. Generate with a reason. You get a credit number (for example `CN-0001`).
- [ ] A period that covers **two** invoices is refused. Credit each invoice separately.
- [ ] A credit larger than the remaining invoiced amount is refused.
- [ ] The original invoice is not rewritten; it stays in the invoice list.

## 16. Payment

- [ ] Mark an invoice **Paid**. The list shows Paid.
- [ ] Mark it **Not paid** again if you need to reverse the test flag.
- [ ] A void invoice cannot be marked paid.

## 17. Reports

- [ ] Open **Reports**. Run the available reports for your company/home/period.
- [ ] Totals look consistent with the invoices you generated (no blank screen, no API error).

## 18. Misc CSV

Columns: `ClientReference`, `UsedDate` (`yyyy-MM-dd`), `Description`, `Amount`, `NominalCode`.

- [ ] Preview a file with one good row and some bad rows. Errors mention the **row number**.
- [ ] Confirm is refused while any row is invalid. Nothing from that file is saved.
- [ ] Preview and confirm a **clean** file. The charge appears in import history.
- [ ] Another organisation cannot import using **your** client references.

## 19. Sage export

- [ ] Open **Sage50 Export**. Choose a date range that includes your invoices. Validate. Eligible rows need Sage ID and nominal on the invoice.
- [ ] Export CSV. Open the file. Check invoice number, date, Sage client ID, nominal, amount, and row count.
- [ ] Export the same range again **without** including already exported. Previously exported invoices are skipped.
- [ ] Another organisation cannot download your export file.

## 20. User permissions

Create users in **Users** (TenantAdmin / Administrator only):

- [ ] **Administrator** — can maintain data in this organisation.
- [ ] **LocationManager** — assign **only Care Home A**. They can open Home A, clients at A, dashboard A, invoices for A. Home B is not listed, and opening Home B by guess should fail cleanly.
- [ ] **ReadOnly** — can view lists. Add/Generate/Save/Import/Export are hidden or return “cannot change data”.
- [ ] TenantAdmin **cannot** create a PlatformAdmin.
- [ ] A user from organisation B cannot see organisation A invoices or clients.
- [ ] PlatformAdmin can open **Organisations** and cannot work inside a tenant’s billing screens without an organisation login.

On a phone-width window (narrow browser): menus and tables remain usable enough to log in, open dashboard, and open an invoice.

---

## When to stop and call IT

- Blank screens or endless loading after login
- Invoice totals that do not match the sum of lines
- Historical PDF that picks up a renamed client
- Duplicate invoice numbers
- Any success message after a CSV that still had errors
