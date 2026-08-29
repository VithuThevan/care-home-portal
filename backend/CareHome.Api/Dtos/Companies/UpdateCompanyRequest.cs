using System.ComponentModel.DataAnnotations;

namespace CareHome.Api.Dtos.Companies
{
    public class UpdateCompanyRequest
    {
        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        public bool IsActive { get; set; }
    }
}