using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SkuVaultSaaS.Api.Data
{
    [Table("Sales")]
    public class SaleEntity
    {
        [Key]
        public int Id { get; set; }
        public string SaleId { get; set; } = string.Empty;
        public string Sku { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public DateTime SaleDate { get; set; }
        public string Channel { get; set; } = string.Empty;
        public string OrderNumber { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerEmail { get; set; } = string.Empty;
    }
}
