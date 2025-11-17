namespace SkuVaultSaaS.Infrastructure.Configuration
{
    public class SyncSettings
    {
        public const string SectionName = "SyncSettings";

        /// <summary>
        /// Whether automatic sync is enabled
        /// </summary>
        public bool Enabled { get; set; } = true;

        /// <summary>
        /// Default sync interval in minutes for full sync
        /// </summary>
        public int IntervalMinutes { get; set; } = 60;

        /// <summary>
        /// Delay in minutes before starting first sync (to allow app startup)
        /// </summary>
        public int DelayStartMinutes { get; set; } = 2;

        /// <summary>
        /// Specific intervals for different data types
        /// </summary>
        public SpecificSyncIntervals SpecificIntervals { get; set; } = new();

        /// <summary>
        /// Get the sync interval as TimeSpan
        /// </summary>
        public TimeSpan SyncInterval => TimeSpan.FromMinutes(IntervalMinutes);

        /// <summary>
        /// Get the startup delay as TimeSpan
        /// </summary>
        public TimeSpan StartupDelay => TimeSpan.FromMinutes(DelayStartMinutes);
    }

    public class SpecificSyncIntervals
    {
        /// <summary>
        /// How often to sync transactions (most frequent - real-time inventory changes)
        /// </summary>
        public int TransactionsMinutes { get; set; } = 15;

        /// <summary>
        /// How often to sync inventory levels (moderate frequency)
        /// </summary>
        public int InventoryMinutes { get; set; } = 30;

        /// <summary>
        /// How often to sync products (less frequent - products change rarely)
        /// </summary>
        public int ProductsMinutes { get; set; } = 60;

        /// <summary>
        /// How often to sync locations (least frequent - locations change rarely)
        /// </summary>
        public int LocationsMinutes { get; set; } = 60;

        /// <summary>
        /// Get transactions sync interval as TimeSpan
        /// </summary>
        public TimeSpan TransactionsInterval => TimeSpan.FromMinutes(TransactionsMinutes);

        /// <summary>
        /// Get inventory sync interval as TimeSpan
        /// </summary>
        public TimeSpan InventoryInterval => TimeSpan.FromMinutes(InventoryMinutes);

        /// <summary>
        /// Get products sync interval as TimeSpan
        /// </summary>
        public TimeSpan ProductsInterval => TimeSpan.FromMinutes(ProductsMinutes);

        /// <summary>
        /// Get locations sync interval as TimeSpan
        /// </summary>
        public TimeSpan LocationsInterval => TimeSpan.FromMinutes(LocationsMinutes);
    }
}