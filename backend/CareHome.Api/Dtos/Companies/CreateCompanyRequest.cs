using System.ComponentModel.DataAnnotations;

namespace CareHome.Api.Dtos.Companies;

public class CreateCompanyRequest
{
    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;
}