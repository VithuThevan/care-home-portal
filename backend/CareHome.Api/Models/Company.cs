using System.ComponentModel.DataAnnotations;

namespace CareHome.Api.Models;

public class Company
{
    public int Id { get; set; }

    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public ICollection<CareHomeLocation> CareHomes { get; set; }
    = new List<CareHomeLocation>();
}