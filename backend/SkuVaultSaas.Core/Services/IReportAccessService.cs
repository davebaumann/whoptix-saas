using System.Collections.Generic;
using System.Threading.Tasks;

namespace SkuVaultSaaS.Core.Services
{
    public interface IReportAccessService
    {
        Dictionary<string, int> GetReportAccessConfig();
        void SetReportAccessConfig(Dictionary<string, int> config);
        List<string> GetAvailableReports(int membershipLevel);
        bool CanAccessReport(int membershipLevel, string reportName);
        int GetRequiredMembershipLevel(string reportName);
    }
}
