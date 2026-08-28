using CareHome.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CareHome.Api.Data;

public class CareHomeDbContext : DbContext
{
    public CareHomeDbContext(
        DbContextOptions<CareHomeDbContext> options)
        : base(options)
    {
    }

    public DbSet<Company> Companies => Set<Company>();
    public DbSet<CareHomeLocation> CareHomes =>
        Set<CareHomeLocation>();
    public DbSet<Client> Clients => Set<Client>();
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Company>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Name)
                .IsRequired()
                .HasMaxLength(150);

            entity.HasIndex(x => x.Name)
                .IsUnique();

            entity.HasData(
                new Company
                {
                    Id = 1,
                    Name = "Sovereign Care Homes",
                    IsActive = true
                },
                new Company
                {
                    Id = 2,
                    Name = "Care Pro",
                    IsActive = true
                }
            );
        });

        modelBuilder.Entity<CareHomeLocation>(entity =>
{
    entity.HasKey(x => x.Id);

    entity.Property(x => x.Code)
        .IsRequired()
        .HasMaxLength(30);

    entity.Property(x => x.Name)
        .IsRequired()
        .HasMaxLength(150);

    entity.HasIndex(x => x.Code)
        .IsUnique();

    entity.HasOne(x => x.Company)
        .WithMany(x => x.CareHomes)
        .HasForeignKey(x => x.CompanyId)
        .OnDelete(DeleteBehavior.Restrict);
});

        modelBuilder.Entity<Client>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.SageId)
                .IsRequired()
                .HasMaxLength(20);

            entity.Property(x => x.ReferenceNumber)
                .IsRequired()
                .HasMaxLength(20);

            entity.Property(x => x.FirstName)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(x => x.LastName)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(x => x.CareType)
                .IsRequired()
                .HasMaxLength(30);

            entity.Property(x => x.Status)
                .IsRequired()
                .HasMaxLength(30);

            entity.Property(x => x.DateOfBirth)
                .HasColumnType("date");

            entity.Property(x => x.AdmissionDate)
                .HasColumnType("date");

            entity.Property(x => x.DischargeDate)
                .HasColumnType("date");

            entity.HasIndex(x => x.SageId)
                .IsUnique();

            entity.HasIndex(x => x.ReferenceNumber)
                .IsUnique();

            entity.HasOne(x => x.CareHome)
                .WithMany(x => x.Clients)
                .HasForeignKey(x => x.CareHomeId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}