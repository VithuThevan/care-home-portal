using CareHome.Api.Data;
using CareHome.Api.Dtos.Companies;
using CareHome.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CareHome.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CompaniesController : ControllerBase
{
    private readonly CareHomeDbContext _dbContext;

    public CompaniesController(CareHomeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    // GET: api/companies
    [HttpGet]
    public async Task<ActionResult<List<Company>>> GetCompanies()
    {
        var companies = await _dbContext.Companies
            .OrderBy(company => company.Name)
            .ToListAsync();

        return Ok(companies);
    }

    // GET: api/companies/1
    [HttpGet("{id:int}")]
    public async Task<ActionResult<Company>> GetCompany(int id)
    {
        var company = await _dbContext.Companies
            .FirstOrDefaultAsync(company => company.Id == id);

        if (company is null)
        {
            return NotFound();
        }

        return Ok(company);
    }

    // POST: api/companies
    [HttpPost]
    public async Task<ActionResult<Company>> CreateCompany(
        CreateCompanyRequest request)
    {
        var companyName = request.Name.Trim();

        var companyExists = await _dbContext.Companies
            .AnyAsync(company =>
                company.Name == companyName);

        if (companyExists)
        {
            return BadRequest(new
            {
                message = "A company with this name already exists."
            });
        }

        var company = new Company
        {
            Name = companyName,
            IsActive = true
        };

        _dbContext.Companies.Add(company);

        await _dbContext.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetCompany),
            new { id = company.Id },
            company);
    }

    // PUT: api/companies/1
    [HttpPut("{id:int}")]
    public async Task<ActionResult<Company>> UpdateCompany(
        int id,
        UpdateCompanyRequest request)
    {
        var company = await _dbContext.Companies
            .FirstOrDefaultAsync(company => company.Id == id);

        if (company is null)
        {
            return NotFound();
        }

        var companyName = request.Name.Trim();

        var duplicateExists = await _dbContext.Companies
            .AnyAsync(existingCompany =>
                existingCompany.Id != id &&
                existingCompany.Name == companyName);

        if (duplicateExists)
        {
            return BadRequest(new
            {
                message = "A company with this name already exists."
            });
        }

        company.Name = companyName;
        company.IsActive = request.IsActive;

        await _dbContext.SaveChangesAsync();

        return Ok(company);
    }

    // DELETE: api/companies/1
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeactivateCompany(int id)
    {
        var company = await _dbContext.Companies
            .FirstOrDefaultAsync(company => company.Id == id);

        if (company is null)
        {
            return NotFound();
        }

        company.IsActive = false;

        await _dbContext.SaveChangesAsync();

        return NoContent();
    }
}