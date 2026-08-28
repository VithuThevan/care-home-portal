import { Component, inject, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { RouterLink } from '@angular/router';

import { Client } from '../../models/client.model';

import { ClientService } from '../../services/client.service';

import { CareHomeLocation } from '../../../care-homes/models/care-home.model';

import { CareHomeService } from '../../../care-homes/services/care-home.service';

@Component({
  selector: 'app-client-list',

  imports: [FormsModule, RouterLink],

  templateUrl: './client-list.html',

  styleUrl: './client-list.scss',
})
export class ClientList implements OnInit {
  private readonly clientService = inject(ClientService);

  private readonly careHomeService = inject(CareHomeService);

  clients: Client[] = [];

  careHomes: CareHomeLocation[] = [];

  searchText = '';

  selectedCareHomeId = 0;

  isLoading = false;

  errorMessage = '';

  ngOnInit(): void {
    this.loadCareHomes();

    this.loadClients();
  }

  loadCareHomes(): void {
    this.careHomeService.getCareHomes().subscribe({
      next: (careHomes) => {
        this.careHomes = careHomes.filter((x) => x.isActive);
      },

      error: (error) => {
        console.error(error);
      },
    });
  }

  loadClients(): void {
    this.isLoading = true;

    this.errorMessage = '';

    this.clientService
      .getClients(
        this.searchText.trim() || undefined,

        this.selectedCareHomeId || undefined,
      )
      .subscribe({
        next: (clients) => {
          this.clients = clients;

          this.isLoading = false;
        },

        error: (error) => {
          console.error(error);

          this.errorMessage = 'Unable to load clients.';

          this.isLoading = false;
        },
      });
  }

  search(): void {
    this.loadClients();
  }

  clearFilters(): void {
    this.searchText = '';

    this.selectedCareHomeId = 0;

    this.loadClients();
  }

  archiveClient(client: Client): void {
    const confirmed = window.confirm(`Archive ${client.firstName} ${client.lastName}?`);

    if (!confirmed) {
      return;
    }

    this.clientService.archiveClient(client.id).subscribe({
      next: () => {
        this.loadClients();
      },

      error: (error) => {
        console.error(error);

        this.errorMessage = 'Unable to archive client.';
      },
    });
  }
}
