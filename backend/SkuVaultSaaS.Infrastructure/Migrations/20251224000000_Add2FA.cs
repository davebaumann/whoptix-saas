using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkuVaultSaaS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Add2FA : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BackupCodes",
                table: "AspNetUsers",
                type: "json",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastTwoFactorVerified",
                table: "AspNetUsers",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "TwoFactorEnabled",
                table: "AspNetUsers",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "TwoFactorSecret",
                table: "AspNetUsers",
                type: "varchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "TwoFactorVerified",
                table: "AspNetUsers",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BackupCodes",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "LastTwoFactorVerified",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "TwoFactorEnabled",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "TwoFactorSecret",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "TwoFactorVerified",
                table: "AspNetUsers");
        }
    }
}
