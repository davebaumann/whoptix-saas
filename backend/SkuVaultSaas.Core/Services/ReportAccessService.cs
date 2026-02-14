using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace SkuVaultSaaS.Core.Services
{
    public class ReportAccessService : IReportAccessService
    {
        private readonly string _configFile;
        private readonly ILogger<ReportAccessService>? _logger;
        private Dictionary<string, int> _config;

        public ReportAccessService(ILogger<ReportAccessService>? logger = null)
        {
            _logger = logger;
            
            // Try AppData first, fall back to /tmp (Docker) then current directory
            string? configPath = null;
            
            // Try 1: AppData (Windows production)
            try
            {
                var appDataPath = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                    "SkuVault",
                    "Config"
                );
                Directory.CreateDirectory(appDataPath);
                configPath = Path.Combine(appDataPath, "reportAccessConfig.json");
                _logger?.LogInformation("ReportAccessService: Using AppData path: {ConfigPath}", configPath);
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "ReportAccessService: AppData path not available");
            }
            
            // Try 2: /tmp (Docker/Linux)
            if (string.IsNullOrEmpty(configPath) || !IsPathWritable(Path.GetDirectoryName(configPath) ?? configPath))
            {
                try
                {
                    var tmpPath = Path.Combine(Path.GetTempPath(), "SkuVault", "Config");
                    Directory.CreateDirectory(tmpPath);
                    configPath = Path.Combine(tmpPath, "reportAccessConfig.json");
                    _logger?.LogInformation("ReportAccessService: Using temp path: {ConfigPath}", configPath);
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(ex, "ReportAccessService: Temp path not available");
                }
            }
            
            // Try 3: Current directory (last resort)
            if (string.IsNullOrEmpty(configPath))
            {
                configPath = Path.Combine(Directory.GetCurrentDirectory(), "reportAccessConfig.json");
                _logger?.LogInformation("ReportAccessService: Using current directory path: {ConfigPath}", configPath);
            }
            
            _configFile = configPath;
            _logger?.LogInformation("ReportAccessService: Final config file path: {ConfigPath}", _configFile);
            
            try
            {
                if (File.Exists(_configFile))
                {
                    // LOAD FROM FILE - File is the source of truth
                    var json = File.ReadAllText(_configFile);
                    _config = JsonSerializer.Deserialize<Dictionary<string, int>>(json) ?? new();
                    _logger?.LogInformation("ReportAccessService: Loaded config from file with {ReportCount} reports", _config.Count);
                    
                    // IMPORTANT: Do NOT merge or override with defaults
                    // The file is the single source of truth once it exists
                    // New reports must be added manually via UI or migration
                }
                else
                {
                    // FIRST TIME ONLY: Create file from defaults
                    _config = GetDefaultConfig();
                    _logger?.LogInformation("ReportAccessService: Config file not found, creating with defaults at {ConfigPath}", _configFile);
                    SaveConfig();
                }
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "ReportAccessService: Error loading config, using defaults as fallback");
                _config = GetDefaultConfig();
            }
        }

        private bool IsPathWritable(string path)
        {
            try
            {
                var testFile = Path.Combine(path, ".writetest");
                File.WriteAllText(testFile, "test");
                File.Delete(testFile);
                return true;
            }
            catch
            {
                return false;
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
                { "lead-time", 4 },  // Enterprise tier - available to all paid plans
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
                File.WriteAllText(_configFile, json);
                _logger?.LogInformation("ReportAccessService: Successfully saved config to {ConfigPath}", _configFile);
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "ReportAccessService: Failed to save config to {ConfigPath}", _configFile);
                // If file write fails, continue with in-memory configuration
                // This allows the service to function even if file system access is restricted
            }
        }
    }
}