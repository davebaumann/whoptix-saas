using Microsoft.EntityFrameworkCore.Migrations;

namespace SkuVaultSaaS.Infrastructure.Migrations
{
    public partial class AddUniqueIndexOnPurchaseOrderReceives_SKU : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PurchaseOrderReceives_CustomerId_PONumber",
                table: "PurchaseOrderReceives");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderReceives_CustomerId_PONumber_SKU_ReceiptDate",
                table: "PurchaseOrderReceives",
                columns: new[] { "CustomerId", "PONumber", "SKU", "ReceiptDate" },
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PurchaseOrderReceives_CustomerId_PONumber_SKU_ReceiptDate",
                table: "PurchaseOrderReceives");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderReceives_CustomerId_PONumber",
                table: "PurchaseOrderReceives",
                columns: new[] { "CustomerId", "PONumber" },
                unique: true);
        }
    }
}
