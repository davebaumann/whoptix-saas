using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkuVaultSaaS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPurchaseOrderReceivesHistoryTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PurchaseOrderReceives",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    CustomerId = table.Column<int>(type: "int", nullable: false),
                    PONumber = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PartNumber = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    SKU = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Code = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    Quantity3PL = table.Column<int>(type: "int", nullable: false),
                    QuantityToLocation = table.Column<int>(type: "int", nullable: false),
                    ReceiptDate = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    ReceivedDate = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    Location = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Warehouse = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Username = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedDateUtc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedDateUtc = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseOrderReceives", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseOrderReceives_Customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "PurchaseOrderReceiveCorrections",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    CustomerId = table.Column<int>(type: "int", nullable: false),
                    PONumber = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PartNumber = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    SKU = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Code = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    OldQuantity = table.Column<int>(type: "int", nullable: false),
                    NewQuantity = table.Column<int>(type: "int", nullable: false),
                    OldQuantity3PL = table.Column<int>(type: "int", nullable: false),
                    NewQuantity3PL = table.Column<int>(type: "int", nullable: false),
                    CorrectedDate = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    ReceivedDate = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    Username = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedDateUtc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedDateUtc = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseOrderReceiveCorrections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseOrderReceiveCorrections_Customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderReceiveCorrections_CorrectedDate",
                table: "PurchaseOrderReceiveCorrections",
                column: "CorrectedDate");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderReceiveCorrections_CustomerId_PONumber",
                table: "PurchaseOrderReceiveCorrections",
                columns: new[] { "CustomerId", "PONumber" });

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderReceiveCorrections_SKU",
                table: "PurchaseOrderReceiveCorrections",
                column: "SKU");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderReceives_CustomerId_PONumber",
                table: "PurchaseOrderReceives",
                columns: new[] { "CustomerId", "PONumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderReceives_ReceiptDate",
                table: "PurchaseOrderReceives",
                column: "ReceiptDate");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseOrderReceives_SKU",
                table: "PurchaseOrderReceives",
                column: "SKU");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PurchaseOrderReceiveCorrections");

            migrationBuilder.DropTable(
                name: "PurchaseOrderReceives");
        }
    }
}
