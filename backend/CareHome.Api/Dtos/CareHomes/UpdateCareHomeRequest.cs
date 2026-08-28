using System.ComponentModel.DataAnnotations;

namespace CareHome.Api.Dtos.CareHomes;

public class UpdateCareHomeRequest
{
    public int CompanyId { get; set; }

    [Required]
    [MaxLength(30)]
    public string Code { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    public int BedCapacity { get; set; }

    public string? Address { get; set; }

    public string? Phone { get; set; }

    public string? Email { get; set; }

    public string? ManagerName { get; set; }

    public string? ManagerPhone { get; set; }

    public string? ManagerEmail { get; set; }

    public bool IsActive { get; set; }
}