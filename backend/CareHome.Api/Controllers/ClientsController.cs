using CareHome.Api.Data;
using CareHome.Api.Dtos.Clients;
using CareHome.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CareHome.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ClientsController : ControllerBase
{
    private readonly CareHomeDbContext _dbContext;

    public ClientsController(CareHomeDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetClients(
        string? search = null,
        int? careHomeId = null,
        bool includeArchived = false)
    {
        var query = _dbContext.Clients
            .AsNoTracking()
            .Include(x => x.CareHome)
            .ThenInclude(x => x.Company)
            .AsQueryable();

        if (!includeArchived)
        {
            query = query.Where(x => !x.IsArchived);
        }

        if (careHomeId.HasValue)
        {
            query = query.Where(
                x => x.CareHomeId == careHomeId.Value
            );
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var value = search.Trim().ToLower();

            query = query.Where(x =>
                x.FirstName.ToLower().Contains(value) ||
                x.LastName.ToLower().Contains(value) ||
                x.SageId.ToLower().Contains(value) ||
                x.ReferenceNumber.ToLower().Contains(value));
        }

        var clients = await query
            .OrderBy(x => x.FirstName)
            .ThenBy(x => x.LastName)
            .Select(x => new
            {
                x.Id,
                x.CareHomeId,

                CareHomeName = x.CareHome.Name,
                CompanyName = x.CareHome.Company.Name,

                x.SageId,
                x.ReferenceNumber,
                x.Title,
                x.FirstName,
                x.LastName,
                x.DateOfBirth,
                x.CareType,
                x.Status,
                x.AdmissionDate,
                x.DischargeDate,
                x.DischargeReason,
                x.Email,
                x.Phone,
                x.Notes,
                x.IsArchived
            })
            .ToListAsync();

        return Ok(clients);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetClient(int id)
    {
        var client = await _dbContext.Clients
            .AsNoTracking()
            .Include(x => x.CareHome)
            .ThenInclude(x => x.Company)
            .Where(x => x.Id == id)
            .Select(x => new
            {
                x.Id,
                x.CareHomeId,

                CareHomeName = x.CareHome.Name,
                CompanyName = x.CareHome.Company.Name,

                x.SageId,
                x.ReferenceNumber,
                x.Title,
                x.FirstName,
                x.LastName,
                x.DateOfBirth,
                x.CareType,
                x.Status,
                x.AdmissionDate,
                x.DischargeDate,
                x.DischargeReason,
                x.Email,
                x.Phone,
                x.Notes,
                x.IsArchived
            })
            .FirstOrDefaultAsync();

        if (client is null)
        {
            return NotFound();
        }

        return Ok(client);
    }

    [HttpPost]
    public async Task<IActionResult> CreateClient(
        CreateClientRequest request)
    {
        var careHomeError =
            await ValidateSelectedCareHome(request.CareHomeId);

        if (careHomeError is not null)
        {
            return careHomeError;
        }

        var sageId = request.SageId.Trim();
        var referenceNumber =
            request.ReferenceNumber.Trim();

        if (await _dbContext.Clients.AnyAsync(
                x => x.SageId == sageId))
        {
            return BadRequest(new
            {
                message =
                    "A client with this Sage ID already exists."
            });
        }

        if (await _dbContext.Clients.AnyAsync(
                x => x.ReferenceNumber == referenceNumber))
        {
            return BadRequest(new
            {
                message =
                    "A client with this reference number already exists."
            });
        }

        if (request.CareType != "Nursing" &&
            request.CareType != "Residential")
        {
            return BadRequest(new
            {
                message =
                    "Care type must be Nursing or Residential."
            });
        }

        var dateError = ValidateClientDates(
            request.DateOfBirth,
            request.AdmissionDate);

        if (dateError is not null)
        {
            return dateError;
        }

        var client = new Client
        {
            CareHomeId = request.CareHomeId,

            SageId = sageId,
            ReferenceNumber = referenceNumber,

            Title = request.Title?.Trim(),

            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),

            DateOfBirth = request.DateOfBirth,

            CareType = request.CareType,

            Status = "Current",

            AdmissionDate = request.AdmissionDate,

            Email = request.Email?.Trim(),
            Phone = request.Phone?.Trim(),
            Notes = request.Notes?.Trim(),

            IsArchived = false
        };

        _dbContext.Clients.Add(client);

        await _dbContext.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetClient),
            new { id = client.Id },
            client);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateClient(
        int id,
        UpdateClientRequest request)
    {
        var client = await _dbContext.Clients
            .FirstOrDefaultAsync(x => x.Id == id);

        if (client is null)
        {
            return NotFound();
        }

        var careHomeError =
            await ValidateSelectedCareHome(
                request.CareHomeId,
                client.CareHomeId);

        if (careHomeError is not null)
        {
            return careHomeError;
        }

        var sageId = request.SageId.Trim();

        var referenceNumber =
            request.ReferenceNumber.Trim();

        var duplicateSageId =
            await _dbContext.Clients.AnyAsync(x =>
                x.Id != id &&
                x.SageId == sageId);

        if (duplicateSageId)
        {
            return BadRequest(new
            {
                message =
                    "A client with this Sage ID already exists."
            });
        }

        var duplicateReference =
            await _dbContext.Clients.AnyAsync(x =>
                x.Id != id &&
                x.ReferenceNumber == referenceNumber);

        if (duplicateReference)
        {
            return BadRequest(new
            {
                message =
                    "A client with this reference number already exists."
            });
        }

        if (request.CareType != "Nursing" &&
            request.CareType != "Residential")
        {
            return BadRequest(new
            {
                message =
                    "Care type must be Nursing or Residential."
            });
        }

        var allowedStatuses = new[]
        {
            "Current",
            "Left",
            "Deceased"
        };

        if (!allowedStatuses.Contains(request.Status))
        {
            return BadRequest(new
            {
                message = "Invalid client status."
            });
        }

        var dateError = ValidateClientDates(
            request.DateOfBirth,
            request.AdmissionDate,
            request.DischargeDate,
            request.Status);

        if (dateError is not null)
        {
            return dateError;
        }

        client.CareHomeId = request.CareHomeId;

        client.SageId = sageId;

        client.ReferenceNumber =
            referenceNumber;

        client.Title =
            request.Title?.Trim();

        client.FirstName =
            request.FirstName.Trim();

        client.LastName =
            request.LastName.Trim();

        client.DateOfBirth =
            request.DateOfBirth;

        client.CareType =
            request.CareType;

        client.Status =
            request.Status;

        client.AdmissionDate =
            request.AdmissionDate;

        if (request.Status == "Current")
        {
            client.DischargeDate = null;
            client.DischargeReason = null;
            client.IsArchived = false;
        }
        else
        {
            client.DischargeDate =
                request.DischargeDate;

            client.DischargeReason =
                request.DischargeReason?.Trim();

            client.IsArchived =
                request.IsArchived;
        }

        client.Email =
            request.Email?.Trim();

        client.Phone =
            request.Phone?.Trim();

        client.Notes =
            request.Notes?.Trim();

        await _dbContext.SaveChangesAsync();

        return Ok(client);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> ArchiveClient(int id)
    {
        var client = await _dbContext.Clients
            .FirstOrDefaultAsync(x => x.Id == id);

        if (client is null)
        {
            return NotFound();
        }

        if (client.Status == "Current")
        {
            return BadRequest(new
            {
                message =
                    "A current client must be discharged before being archived."
            });
        }

        client.IsArchived = true;

        await _dbContext.SaveChangesAsync();

        return NoContent();
    }

    private IActionResult? ValidateClientDates(
        DateOnly? dateOfBirth,
        DateOnly admissionDate,
        DateOnly? dischargeDate = null,
        string? status = null)
    {
        if (admissionDate == default)
        {
            return BadRequest(new
            {
                message = "Admission date is required."
            });
        }

        if (dateOfBirth.HasValue &&
            dateOfBirth.Value > DateOnly.FromDateTime(DateTime.Today))
        {
            return BadRequest(new
            {
                message =
                    "Date of birth cannot be in the future."
            });
        }

        if (status is not null &&
            status != "Current" &&
            dischargeDate is null)
        {
            return BadRequest(new
            {
                message =
                    "Discharge date is required when client is no longer current."
            });
        }

        if (status != "Current" &&
            dischargeDate.HasValue &&
            dischargeDate.Value < admissionDate)
        {
            return BadRequest(new
            {
                message =
                    "Discharge date cannot be before admission date."
            });
        }

        return null;
    }

    private async Task<IActionResult?> ValidateSelectedCareHome(
        int careHomeId,
        int? currentCareHomeId = null)
    {
        var careHome = await _dbContext.CareHomes
            .FirstOrDefaultAsync(x => x.Id == careHomeId);

        if (careHome is null)
        {
            return BadRequest(new
            {
                message =
                    "Selected care home does not exist or is inactive."
            });
        }

        var careHomeUnchanged =
            currentCareHomeId == careHomeId;

        if (!careHomeUnchanged && !careHome.IsActive)
        {
            return BadRequest(new
            {
                message =
                    "Selected care home does not exist or is inactive."
            });
        }

        return null;
    }
}