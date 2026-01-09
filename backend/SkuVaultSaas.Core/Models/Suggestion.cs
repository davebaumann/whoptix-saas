using System;
using System.ComponentModel.DataAnnotations;

namespace SkuVaultSaaS.Core.Models;

public class Suggestion
{
    [Key]
    public int Id { get; set; }

    [Required]
    public string Message { get; set; } = string.Empty;

    [Required]
    public string UserEmail { get; set; } = string.Empty;

    public int? CustomerId { get; set; }

    public Customer? Customer { get; set; }

    [Required]
    public DateTime SubmittedAt { get; set; }

    public string? UserAgent { get; set; }

    public bool IsRead { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
