using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkuVaultSaaS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMissingTransactionFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Code",
                table: "Transactions",
                type: "longtext",
                nullable: true,
                comment: "Product code from SkuVault")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "ScannedCode",
                table: "Transactions",
                type: "longtext",
                nullable: true,
                comment: "Barcode/scan identifier")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "Transactions",
                type: "longtext",
                nullable: true,
                comment: "Product title from SkuVault")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "ContextType",
                table: "Transactions",
                type: "longtext",
                nullable: true,
                comment: "Type of context (e.g., Sale)")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "ContextId",
                table: "Transactions",
                type: "longtext",
                nullable: true,
                comment: "ID from context (e.g., sale ID)")
                .Annotation("MySql:CharSet", "utf8mb4");

            // Drop the old Context column
            migrationBuilder.DropColumn(
                name: "Context",
                table: "Transactions");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Context",
                table: "Transactions",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.DropColumn(
                name: "Code",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "ScannedCode",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "Title",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "ContextType",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "ContextId",
                table: "Transactions");
        }
    }
}
