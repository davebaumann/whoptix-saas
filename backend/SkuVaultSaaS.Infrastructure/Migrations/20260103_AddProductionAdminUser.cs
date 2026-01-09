using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkuVaultSaaS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProductionAdminUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Generate IDs for the new records
            var adminUserId = System.Guid.NewGuid().ToString();
            var adminRoleId = System.Guid.NewGuid().ToString();

            // Create Admin role if it doesn't exist
            migrationBuilder.InsertData(
                table: "AspNetRoles",
                columns: new[] { "Id", "Name", "NormalizedName", "ConcurrencyStamp" },
                values: new object[] { 
                    adminRoleId, 
                    "Admin", 
                    "ADMIN", 
                    System.Guid.NewGuid().ToString() 
                },
                schema: null);

            // Create Admin user
            // NOTE: PasswordHash will be set via seeding logic in Program.cs
            // This migration just creates the user record with default password
            migrationBuilder.InsertData(
                table: "AspNetUsers",
                columns: new[] { 
                    "Id", 
                    "UserName", 
                    "NormalizedUserName", 
                    "Email", 
                    "NormalizedEmail", 
                    "EmailConfirmed", 
                    "PasswordHash", 
                    "SecurityStamp", 
                    "ConcurrencyStamp",
                    "PhoneNumberConfirmed",
                    "TwoFactorEnabled",
                    "LockoutEnabled",
                    "AccessFailedCount",
                    "CustomerRole",
                    "CustomerId"
                },
                values: new object[] { 
                    adminUserId, 
                    "admin@justsku.com", 
                    "ADMIN@JUSTSKU.COM", 
                    "admin@justsku.com", 
                    "ADMIN@JUSTSKU.COM", 
                    true,  // EmailConfirmed
                    null,  // PasswordHash - will be set by DbSeeder with proper hashing
                    System.Guid.NewGuid().ToString(),
                    System.Guid.NewGuid().ToString(),
                    false, // PhoneNumberConfirmed
                    false, // TwoFactorEnabled
                    true,  // LockoutEnabled
                    0,     // AccessFailedCount
                    0,     // CustomerRole = Owner (0)
                    null   // CustomerId - Admin has no customer
                },
                schema: null);

            // Assign Admin role to the user
            migrationBuilder.InsertData(
                table: "AspNetUserRoles",
                columns: new[] { "UserId", "RoleId" },
                values: new object[] { adminUserId, adminRoleId },
                schema: null);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Remove user role assignment
            migrationBuilder.DeleteData(
                table: "AspNetUserRoles",
                keyColumns: new[] { "UserId", "RoleId" },
                keyValues: new object[] { "admin@justsku.com", "Admin" },
                schema: null);

            // Remove admin user
            migrationBuilder.DeleteData(
                table: "AspNetUsers",
                keyColumn: "Email",
                keyValue: "admin@justsku.com",
                schema: null);

            // Remove Admin role
            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Name",
                keyValue: "Admin",
                schema: null);
        }
    }
}
