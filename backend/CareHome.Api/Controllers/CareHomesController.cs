using CareHome.Api.Data;
using CareHome.Api.Dtos.CareHomes;
using CareHome.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CareHome.Api.Controllers;

[ApiController]
[Route("api/care-homes")]
public class CareHomesController : ControllerBase
{
    private readonly CareHomeDbContext _dbContext;

    public CareHomesController(CareHomeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetCareHomes()
    {
        var careHomes = await _dbContext.CareHomes
            .Include(x => x.Company)
            .OrderBy(x => x.Name)
            .Select(x => new
            {
                x.Id,
                x.CompanyId,
                CompanyName = x.Company.Name,
                x.Code,
                x.Name,
                x.BedCapacity,
                x.Address,
                x.Phone,
                x.Email,
                x.ManagerName,
                x.ManagerPhone,
                x.ManagerEmail,
                x.IsActive
            })
            .ToListAsync();

        return Ok(careHomes);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetCareHome(int id)
    {
        var careHome = await _dbContext.CareHomes
            .Include(x => x.Company)
            .Where(x => x.Id == id)
            .Select(x => new
            {
                x.Id,
                x.CompanyId,
                CompanyName = x.Company.Name,
                x.Code,
                x.Name,
                x.BedCapacity,
                x.Address,
                x.Phone,
                x.Email,
                x.ManagerName,
                x.ManagerPhone,
                x.ManagerEmail,
                x.IsActive
            })
            .FirstOrDefaultAsync();

        if (careHome is null)
        {
            return NotFound();
        }

        return Ok(careHome);
    }

    [HttpPost]
    public async Task<IActionResult> CreateCareHome(
        CreateCareHomeRequest request)
    {
        var companyExists = await _dbContext.Companies
            .AnyAsync(x =>
                x.Id == request.CompanyId &&
                x.IsActive);

        if (!companyExists)
        {
            return BadRequest(new
            {
                message = "Selected company does not exist."
            });
        }

        var code = request.Code.Trim();

        var duplicateCode = await _dbContext.CareHomes
            .AnyAsync(x =>
                x.Code == code);

        if (duplicateCode)
        {
            return BadRequest(new
            {
                message = "Care home code already exists."
            });
        }

        var careHome = new CareHomeLocation
        {
            CompanyId = request.CompanyId,
            Code = code,
            Name = request.Name.Trim(),
            BedCapacity = request.BedCapacity,
            Address = request.Address?.Trim(),
            Phone = request.Phone?.Trim(),
            Email = request.Email?.Trim(),
            ManagerName = request.ManagerName?.Trim(),
            ManagerPhone = request.ManagerPhone?.Trim(),
            ManagerEmail = request.ManagerEmail?.Trim(),
            IsActive = true
        };

        _dbContext.CareHomes.Add(careHome);

        await _dbContext.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetCareHome),
            new { id = careHome.Id },
            careHome);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateCareHome(
        int id,
        UpdateCareHomeRequest request)
    {
        var careHome = await _dbContext.CareHomes
            .FirstOrDefaultAsync(x => x.Id == id);

        if (careHome is null)
        {
            return NotFound();
        }

        var companyExists = await _dbContext.Companies
            .AnyAsync(x =>
                x.Id == request.CompanyId &&
                x.IsActive);

        if (!companyExists)
        {
            return BadRequest(new
            {
                message = "Selected company does not exist."
            });
        }

        var code = request.Code.Trim();

        var duplicateCode = await _dbContext.CareHomes
            .AnyAsync(x =>
                x.Id != id &&
                x.Code == code);

        if (duplicateCode)
        {
            return BadRequest(new
            {
                message = "Care home code already exists."
            });
        }

        careHome.CompanyId = request.CompanyId;
        careHome.Code = code;
        careHome.Name = request.Name.Trim();
        careHome.BedCapacity = request.BedCapacity;
        careHome.Address = request.Address?.Trim();
        careHome.Phone = request.Phone?.Trim();
        careHome.Email = request.Email?.Trim();
        careHome.ManagerName = request.ManagerName?.Trim();
        careHome.ManagerPhone = request.ManagerPhone?.Trim();
        careHome.ManagerEmail = request.ManagerEmail?.Trim();
        careHome.IsActive = request.IsActive;

        await _dbContext.SaveChangesAsync();

        return Ok(careHome);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeactivateCareHome(int id)
    {
        var careHome = await _dbContext.CareHomes
            .FirstOrDefaultAsync(x => x.Id == id);

        if (careHome is null)
        {
            return NotFound();
        }

        careHome.IsActive = false;

        await _dbContext.SaveChangesAsync();

        return NoContent();
    }
}