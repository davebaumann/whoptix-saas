using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkuVaultSaaS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveUniqueConstraintFromPurchaseOrderReceives : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop the unique constraint on (CustomerId, PONumber)
            // This allows storing multiple line items and receipt events per PO
            migrationBuilder.DropIndex(
                name: "IX_PurchaseOrderReceives_CustomerId_PONumber",
                table: "PurchaseOrderReceives");

            // Recreate as a non-unique index for query performance
            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderReceives_CustomerId_PONumber",
                table: "PurchaseOrderReceives",
                columns: new[] { "CustomerId", "PONumber" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Revert: drop non-unique index and recreate as unique
            migrationBuilder.DropIndex(
                name: "IX_PurchaseOrderReceives_CustomerId_PONumber",
                table: "PurchaseOrderReceives");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderReceives_CustomerId_PONumber",
                table: "PurchaseOrderReceives",
                columns: new[] { "CustomerId", "PONumber" },
                unique: true);
        }
    }
}
