using System.Collections.Generic;
using System.IO;
using System.Text.Json;

namespace SkuVaultSaaS.Core.Services
{
    public class ReportAccessService : IReportAccessService
    {
        private const string ConfigFile = "reportAccessConfig.json";
        private Dictionary<string, int> _config;

        public ReportAccessService()
        {
            try
            {
                if (File.Exists(ConfigFile))
                {
                    var json = File.ReadAllText(ConfigFile);
                    _config = JsonSerializer.Deserialize<Dictionary<string, int>>(json) ?? GetDefaultConfig();
                }
                else
                {
                    _config = GetDefaultConfig();
                    SaveConfig();
                }
            }
            catch (Exception)
            {
                // If file operations fail, use default configuration
                _config = GetDefaultConfig();
            }
        }

        private Dictionary<string, int> GetDefaultConfig()
        {
            return new Dictionary<string, int>
            {
                { "inventory", 1 },
                { "low-stock", 2 },
                { "aging-inventory", 3 },
                { "financial-warehouse", 3 },
                { "locations", 3 },
                { "profitability", 3 },
                { "demand-forecast", 3 },
                { "performance", 4 },
                { "picker-analytics", 5 },
                { "lead-time", 5 },
                // Tier 5: Development/Testing tier for admin to test reports under development
                // Add new reports here with tier 5, then promote to tier 2/3/4 when ready
            };
        }

        public Dictionary<string, int> GetReportAccessConfig() => new(_config);

        public void SetReportAccessConfig(Dictionary<string, int> config)
        {
            _config = new(config);
            SaveConfig();
        }

        public List<string> GetAvailableReports(int membershipLevel)
        {
            var result = new List<string>();
            foreach (var kvp in _config)
            {
                if (membershipLevel >= kvp.Value)
                    result.Add(kvp.Key);
            }
            return result;
        }

        public bool CanAccessReport(int membershipLevel, string reportName)
        {
            if (!_config.ContainsKey(reportName))
                return false;
            return membershipLevel >= _config[reportName];
        }

        public int GetRequiredMembershipLevel(string reportName)
        {
            return _config.TryGetValue(reportName, out var level) ? level : 4;
        }

        private void SaveConfig()
        {
            try
            {
                var json = JsonSerializer.Serialize(_config, new JsonSerializerOptions { WriteIndented = true });
                File.WriteAllText(ConfigFile, json);
            }
            catch (Exception)
            {
                // If file write fails, continue with in-memory configuration
                // This allows the service to function even if file system access is restricted
            }
        }
    }
}