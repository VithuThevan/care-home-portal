using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CareHome.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMultiTenancy : Migration
    {
        private const string ExistingOrganisationPublicId = "9E4F2C11-7A8B-4D3E-9C10-1B2A3C4D5E6F";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Tenants",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PublicId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    TradingName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    RegistrationNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Address = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Phone = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Website = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    LogoPath = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tenants", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Tenants_PublicId",
                table: "Tenants",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tenants_Name",
                table: "Tenants",
                column: "Name");

            migrationBuilder.CreateTable(
                name: "TenantSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TenantId = table.Column<int>(type: "int", nullable: false),
                    CurrencyCode = table.Column<string>(type: "nvarchar(3)", maxLength: 3, nullable: false),
                    CurrencySymbol = table.Column<string>(type: "nvarchar(8)", maxLength: 8, nullable: false),
                    TimeZoneId = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    InvoicePrefix = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreditNotePrefix = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    NumberLength = table.Column<int>(type: "int", nullable: false),
                    PaymentTermsDays = table.Column<int>(type: "int", nullable: false),
                    EmailFromName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    EmailFromAddress = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    PrimaryColour = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TenantSettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TenantSettings_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TenantSettings_TenantId",
                table: "TenantSettings",
                column: "TenantId",
                unique: true);

            migrationBuilder.Sql($"""
                SET IDENTITY_INSERT Tenants ON;
                INSERT INTO Tenants (Id, PublicId, Name, IsActive, CreatedAt)
                VALUES (1, '{ExistingOrganisationPublicId}', N'Existing Organisation', 1, SYSDATETIMEOFFSET());
                SET IDENTITY_INSERT Tenants OFF;

                INSERT INTO TenantSettings (
                    TenantId, CurrencyCode, CurrencySymbol, TimeZoneId,
                    InvoicePrefix, CreditNotePrefix, NumberLength, PaymentTermsDays)
                VALUES (1, 'GBP', N'£', 'Europe/London', 'INV-', 'CN-', 4, 30);
                """);

            AddNullableTenantId(migrationBuilder, "Companies");
            AddNullableTenantId(migrationBuilder, "CareHomes");
            AddNullableTenantId(migrationBuilder, "Clients");
            AddNullableTenantId(migrationBuilder, "FundingAuthorities");
            AddNullableTenantId(migrationBuilder, "InvoiceCategories");
            AddNullableTenantId(migrationBuilder, "NominalCodes");
            AddNullableTenantId(migrationBuilder, "ClientFundingContracts");
            AddNullableTenantId(migrationBuilder, "InvoiceTemplates");
            AddNullableTenantId(migrationBuilder, "Invoices");
            AddNullableTenantId(migrationBuilder, "CreditNotes");
            AddNullableTenantId(migrationBuilder, "MiscChargeImportBatches");
            AddNullableTenantId(migrationBuilder, "MiscCharges");
            AddNullableTenantId(migrationBuilder, "SageExportBatches");
            AddNullableTenantId(migrationBuilder, "AuditLogs");
            AddNullableTenantId(migrationBuilder, "BillingExceptionLogs");
            AddNullableTenantId(migrationBuilder, "EmailSendLogs");

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "AspNetUsers",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SnapshotTenantName",
                table: "Invoices",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "InvoiceNumber",
                table: "Invoices",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<string>(
                name: "CreditNoteNumber",
                table: "CreditNotes",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20);

            migrationBuilder.DropIndex(
                name: "IX_DocumentSequences_Name",
                table: "DocumentSequences");

            migrationBuilder.RenameColumn(
                name: "Name",
                table: "DocumentSequences",
                newName: "DocumentType");

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "DocumentSequences",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Prefix",
                table: "DocumentSequences",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "NumberLength",
                table: "DocumentSequences",
                type: "int",
                nullable: false,
                defaultValue: 4);

            migrationBuilder.Sql("""
                UPDATE Companies SET TenantId = 1 WHERE TenantId IS NULL;
                UPDATE CareHomes SET TenantId = 1 WHERE TenantId IS NULL;
                UPDATE Clients SET TenantId = 1 WHERE TenantId IS NULL;
                UPDATE FundingAuthorities SET TenantId = 1 WHERE TenantId IS NULL;
                UPDATE InvoiceCategories SET TenantId = 1 WHERE TenantId IS NULL;
                UPDATE NominalCodes SET TenantId = 1 WHERE TenantId IS NULL;
                UPDATE ClientFundingContracts SET TenantId = 1 WHERE TenantId IS NULL;
                UPDATE InvoiceTemplates SET TenantId = 1 WHERE TenantId IS NULL;
                UPDATE Invoices SET TenantId = 1 WHERE TenantId IS NULL;
                UPDATE CreditNotes SET TenantId = 1 WHERE TenantId IS NULL;
                UPDATE MiscChargeImportBatches SET TenantId = 1 WHERE TenantId IS NULL;
                UPDATE MiscCharges SET TenantId = 1 WHERE TenantId IS NULL;
                UPDATE SageExportBatches SET TenantId = 1 WHERE TenantId IS NULL;
                UPDATE AuditLogs SET TenantId = 1 WHERE TenantId IS NULL;
                UPDATE BillingExceptionLogs SET TenantId = 1 WHERE TenantId IS NULL;
                UPDATE EmailSendLogs SET TenantId = 1 WHERE TenantId IS NULL;
                UPDATE DocumentSequences
                SET TenantId = 1,
                    Prefix = CASE WHEN DocumentType = 'Invoice' THEN 'INV-' ELSE 'CN-' END,
                    NumberLength = 4
                WHERE TenantId IS NULL;
                UPDATE Invoices SET SnapshotTenantName = N'Existing Organisation'
                WHERE SnapshotTenantName = '' OR SnapshotTenantName IS NULL;
                """);

            migrationBuilder.Sql("""
                IF NOT EXISTS (SELECT 1 FROM AspNetRoles WHERE NormalizedName = 'PLATFORMADMIN')
                BEGIN
                    INSERT INTO AspNetRoles (Id, Name, NormalizedName, ConcurrencyStamp)
                    VALUES (NEWID(), 'PlatformAdmin', 'PLATFORMADMIN', NEWID());
                END

                IF NOT EXISTS (SELECT 1 FROM AspNetRoles WHERE NormalizedName = 'TENANTADMIN')
                BEGIN
                    INSERT INTO AspNetRoles (Id, Name, NormalizedName, ConcurrencyStamp)
                    VALUES (NEWID(), 'TenantAdmin', 'TENANTADMIN', NEWID());
                END

                INSERT INTO AspNetUserRoles (UserId, RoleId)
                SELECT ur.UserId, pa.Id
                FROM AspNetUserRoles ur
                INNER JOIN AspNetRoles sa ON sa.Id = ur.RoleId AND sa.NormalizedName = 'SUPERADMIN'
                CROSS JOIN AspNetRoles pa
                WHERE pa.NormalizedName = 'PLATFORMADMIN'
                  AND NOT EXISTS (
                      SELECT 1 FROM AspNetUserRoles existing
                      WHERE existing.UserId = ur.UserId AND existing.RoleId = pa.Id);

                UPDATE AspNetUsers
                SET TenantId = 1
                WHERE TenantId IS NULL
                  AND Id NOT IN (
                      SELECT ur.UserId
                      FROM AspNetUserRoles ur
                      INNER JOIN AspNetRoles r ON r.Id = ur.RoleId
                      WHERE r.NormalizedName IN ('SUPERADMIN', 'PLATFORMADMIN'));
                """);

            MakeTenantIdRequired(migrationBuilder, "Companies", "FK_Companies_Tenants_TenantId");
            MakeTenantIdRequired(migrationBuilder, "CareHomes", "FK_CareHomes_Tenants_TenantId");
            MakeTenantIdRequired(migrationBuilder, "Clients", "FK_Clients_Tenants_TenantId");
            MakeTenantIdRequired(migrationBuilder, "FundingAuthorities", "FK_FundingAuthorities_Tenants_TenantId");
            MakeTenantIdRequired(migrationBuilder, "InvoiceCategories", "FK_InvoiceCategories_Tenants_TenantId");
            MakeTenantIdRequired(migrationBuilder, "NominalCodes", "FK_NominalCodes_Tenants_TenantId");
            MakeTenantIdRequired(migrationBuilder, "ClientFundingContracts", "FK_ClientFundingContracts_Tenants_TenantId");
            MakeTenantIdRequired(migrationBuilder, "InvoiceTemplates", "FK_InvoiceTemplates_Tenants_TenantId");
            MakeTenantIdRequired(migrationBuilder, "Invoices", "FK_Invoices_Tenants_TenantId");
            MakeTenantIdRequired(migrationBuilder, "CreditNotes", "FK_CreditNotes_Tenants_TenantId");
            MakeTenantIdRequired(migrationBuilder, "MiscChargeImportBatches", "FK_MiscChargeImportBatches_Tenants_TenantId");
            MakeTenantIdRequired(migrationBuilder, "MiscCharges", "FK_MiscCharges_Tenants_TenantId");
            MakeTenantIdRequired(migrationBuilder, "SageExportBatches", "FK_SageExportBatches_Tenants_TenantId");
            MakeTenantIdRequired(migrationBuilder, "AuditLogs", "FK_AuditLogs_Tenants_TenantId");
            MakeTenantIdRequired(migrationBuilder, "BillingExceptionLogs", "FK_BillingExceptionLogs_Tenants_TenantId");
            MakeTenantIdRequired(migrationBuilder, "EmailSendLogs", "FK_EmailSendLogs_Tenants_TenantId");
            MakeTenantIdRequired(migrationBuilder, "DocumentSequences", "FK_DocumentSequences_Tenants_TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_TenantId",
                table: "AspNetUsers",
                column: "TenantId");

            migrationBuilder.AddForeignKey(
                name: "FK_AspNetUsers_Tenants_TenantId",
                table: "AspNetUsers",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            DropIndexIfExists(migrationBuilder, "IX_Companies_Name", "Companies");
            DropIndexIfExists(migrationBuilder, "IX_CareHomes_Code", "CareHomes");
            DropIndexIfExists(migrationBuilder, "IX_Clients_SageId", "Clients");
            DropIndexIfExists(migrationBuilder, "IX_Clients_ReferenceNumber", "Clients");
            DropIndexIfExists(migrationBuilder, "IX_FundingAuthorities_Code", "FundingAuthorities");
            DropIndexIfExists(migrationBuilder, "IX_InvoiceCategories_Code", "InvoiceCategories");
            DropIndexIfExists(migrationBuilder, "IX_NominalCodes_Code", "NominalCodes");
            DropIndexIfExists(migrationBuilder, "IX_Invoices_InvoiceNumber", "Invoices");
            DropIndexIfExists(migrationBuilder, "IX_CreditNotes_CreditNoteNumber", "CreditNotes");

            migrationBuilder.CreateIndex(
                name: "IX_Companies_TenantId_Name",
                table: "Companies",
                columns: new[] { "TenantId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Companies_TenantId_IsActive",
                table: "Companies",
                columns: new[] { "TenantId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_CareHomes_TenantId_Code",
                table: "CareHomes",
                columns: new[] { "TenantId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CareHomes_TenantId_IsActive",
                table: "CareHomes",
                columns: new[] { "TenantId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_Clients_TenantId_SageId",
                table: "Clients",
                columns: new[] { "TenantId", "SageId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Clients_TenantId_ReferenceNumber",
                table: "Clients",
                columns: new[] { "TenantId", "ReferenceNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Clients_TenantId",
                table: "Clients",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_FundingAuthorities_TenantId_Code",
                table: "FundingAuthorities",
                columns: new[] { "TenantId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InvoiceCategories_TenantId_Code",
                table: "InvoiceCategories",
                columns: new[] { "TenantId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NominalCodes_TenantId_Code",
                table: "NominalCodes",
                columns: new[] { "TenantId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_TenantId_InvoiceNumber",
                table: "Invoices",
                columns: new[] { "TenantId", "InvoiceNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_TenantId",
                table: "Invoices",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_CreditNotes_TenantId_CreditNoteNumber",
                table: "CreditNotes",
                columns: new[] { "TenantId", "CreditNoteNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CreditNotes_TenantId",
                table: "CreditNotes",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentSequences_TenantId_DocumentType",
                table: "DocumentSequences",
                columns: new[] { "TenantId", "DocumentType" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ClientFundingContracts_TenantId",
                table: "ClientFundingContracts",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_InvoiceTemplates_TenantId",
                table: "InvoiceTemplates",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_MiscChargeImportBatches_TenantId",
                table: "MiscChargeImportBatches",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_MiscCharges_TenantId",
                table: "MiscCharges",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_SageExportBatches_TenantId",
                table: "SageExportBatches",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_TenantId",
                table: "AuditLogs",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_BillingExceptionLogs_TenantId",
                table: "BillingExceptionLogs",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_EmailSendLogs_TenantId",
                table: "EmailSendLogs",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            throw new NotSupportedException(
                "AddMultiTenancy cannot be reversed without restoring global unique indexes and removing tenant isolation.");
        }

        private static void AddNullableTenantId(MigrationBuilder migrationBuilder, string table)
        {
            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: table,
                type: "int",
                nullable: true);
        }

        private static void MakeTenantIdRequired(MigrationBuilder migrationBuilder, string table, string foreignKeyName)
        {
            migrationBuilder.AlterColumn<int>(
                name: "TenantId",
                table: table,
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: foreignKeyName,
                table: table,
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        private static void DropIndexIfExists(MigrationBuilder migrationBuilder, string indexName, string table)
        {
            migrationBuilder.Sql($"""
                IF EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = '{indexName}' AND object_id = OBJECT_ID(N'{table}'))
                BEGIN
                    DROP INDEX [{indexName}] ON [{table}];
                END
                """);
        }
    }
}
