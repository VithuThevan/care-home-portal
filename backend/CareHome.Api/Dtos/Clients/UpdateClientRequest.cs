using System.ComponentModel.DataAnnotations;

namespace CareHome.Api.Dtos.Clients;

public class UpdateClientRequest
{
    [Range(1, int.MaxValue)]
    public int CareHomeId { get; set; }

    [Required]
    [MaxLength(20)]
    public string SageId { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string ReferenceNumber { get; set; } = string.Empty;

    [MaxLength(10)]
    public string? Title { get; set; }

    [Required]
    [MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    public DateTime? DateOfBirth { get; set; }

    [Required]
    public string CareType { get; set; } = string.Empty;

    [Required]
    public string Status { get; set; } = "Current";

    public DateTime AdmissionDate { get; set; }

    public DateTime? DischargeDate { get; set; }

    public string? DischargeReason { get; set; }

    public string? Email { get; set; }

    public string? Phone { get; set; }

    public string? Notes { get; set; }

    public bool IsArchived { get; set; }
}