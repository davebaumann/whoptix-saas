using SkuVaultSaaS.Core.Enums;

namespace SkuVaultSaaS.Core.Models
{
    public class UserInvitation
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public Customer Customer { get; set; } = null!;
        public string Email { get; set; } = null!;
        public CustomerRole Role { get; set; }
        public string InvitationToken { get; set; } = null!;
        public string InvitedByUserId { get; set; } = null!;
        public ApplicationUser InvitedBy { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
        public bool IsAccepted { get; set; }
        public DateTime? AcceptedAt { get; set; }
        public string? AcceptedByUserId { get; set; }
    }
}