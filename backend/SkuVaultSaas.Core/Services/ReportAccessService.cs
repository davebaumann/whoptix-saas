using SkuVaultSaaS.Core.Enums;

namespace SkuVaultSaaS.Core.Services
{
    public interface IReportAccessService
    {
        bool CanAccessReport(MembershipLevel membershipLevel, string reportName);
        IEnumerable<string> GetAvailableReports(MembershipLevel membershipLevel);
        MembershipLevel GetRequiredMembershipLevel(string reportName);
    }

    public class ReportAccessService : IReportAccessService
    {
        private readonly Dictionary<string, MembershipLevel> _reportRequirements = new()
        {
            // Basic reports - available to all membership levels
            { "inventory", MembershipLevel.Basic },
            
            // Standard reports - Standard and above
            { "low-stock", MembershipLevel.Standard },
            
            // Premium reports - Premium and above
            { "aging-inventory", MembershipLevel.Premium },
            { "financial-warehouse", MembershipLevel.Premium },
            { "locations", MembershipLevel.Premium },
            
            // Enterprise reports - Enterprise only
            { "performance", MembershipLevel.Enterprise }
        };

        public bool CanAccessReport(MembershipLevel membershipLevel, string reportName)
        {
            if (!_reportRequirements.ContainsKey(reportName))
                return false;

            var requiredLevel = _reportRequirements[reportName];
            return membershipLevel >= requiredLevel;
        }

        public IEnumerable<string> GetAvailableReports(MembershipLevel membershipLevel)
        {
            return _reportRequirements
                .Where(kvp => membershipLevel >= kvp.Value)
                .Select(kvp => kvp.Key)
                .ToList();
        }

        public MembershipLevel GetRequiredMembershipLevel(string reportName)
        {
            return _reportRequirements.GetValueOrDefault(reportName, MembershipLevel.Enterprise);
        }
    }
}