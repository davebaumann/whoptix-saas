using SkuVaultSaaS.Core.Enums;

namespace SkuVaultSaaS.Api.Models
{
    public class MembershipInfoDto
    {
        public MembershipLevel CurrentLevel { get; set; }
        public string CurrentLevelName { get; set; } = null!;
        public IEnumerable<string> AvailableReports { get; set; } = new List<string>();
        public IEnumerable<MembershipTierDto> AllTiers { get; set; } = new List<MembershipTierDto>();
    }

    public class MembershipTierDto
    {
        public MembershipLevel Level { get; set; }
        public string Name { get; set; } = null!;
        public string Description { get; set; } = null!;
        public IEnumerable<string> Features { get; set; } = new List<string>();
        public bool IsCurrentTier { get; set; }
        public bool CanUpgrade { get; set; }
    }

    public class UpdateMembershipRequest
    {
        public int CustomerId { get; set; }
        public MembershipLevel NewLevel { get; set; }
        public string? Reason { get; set; }
    }
}