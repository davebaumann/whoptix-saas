using SkuVaultSaaS.Core.Enums;
using System.ComponentModel.DataAnnotations;

namespace SkuVaultSaaS.Core.Models
{
    public class UserInvitation
    {
        public int Id { get; set; }
        
        [Required]
        public int CustomerId { get; set; }
        
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
        
        [Required]
        public CustomerRole Role { get; set; }
        
        [Required]
        public string InvitationToken { get; set; } = string.Empty;
        
        [Required]
        public string InvitedByUserId { get; set; } = string.Empty;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime ExpiresAt { get; set; }
        
        public bool IsAccepted { get; set; } = false;
        
        public DateTime? AcceptedAt { get; set; }
        
        public string? AcceptedByUserId { get; set; }
        
        // Navigation properties
        public Customer Customer { get; set; } = null!;
        public ApplicationUser InvitedBy { get; set; } = null!;
        public ApplicationUser? AcceptedBy { get; set; }
    }
}