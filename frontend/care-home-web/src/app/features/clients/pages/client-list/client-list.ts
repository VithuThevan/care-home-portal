import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Client } from '../../models/client.model';
import { ClientService } from '../../services/client.service';
import { CareHomeLocation } from '../../../care-homes/models/care-home.model';
import { CareHomeService } from '../../../care-homes/services/care-home.service';
import { getApiErrorMessage } from '../../../../core/api-error';
import { AuthService } from '../../../../core/auth.service';

@Component({
  selector: 'app-client-list',
  imports: [FormsModule, RouterLink],
  templateUrl: './client-list.html',
  styleUrl: './client-list.scss',
})
export class ClientList implements OnInit {
  private readonly clientService = inject(ClientService);
  private readonly careHomeService = inject(CareHomeService);
  readonly auth = inject(AuthService);

  readonly clients = signal<Client[]>([]);
  readonly totalCount = signal(0);
  readonly careHomes = signal<CareHomeLocation[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  searchText = '';
  selectedCareHomeId = 0;
  showArchived = false;

  ngOnInit(): void {
    this.loadCareHomes();
    this.loadClients();
  }

  loadCareHomes(): void {
    this.careHomeService.getCareHomes().subscribe({
      next: (careHomes) => this.careHomes.set(careHomes.filter((x) => x.isActive)),
      error: (error) => console.error(error),
    });
  }

  loadClients(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.clientService
      .getClients(
        this.searchText.trim() || undefined,
        this.selectedCareHomeId || undefined,
        this.showArchived,
      )
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (page) => {
          this.clients.set(page.items);
          this.totalCount.set(page.totalCount);
        },
        error: (error) => {
          console.error(error);
          this.errorMessage.set(getApiErrorMessage(error, 'Unable to load clients.'));
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
      next: () => this.loadClients(),
      error: (error) => {
        console.error(error);
        this.errorMessage.set(getApiErrorMessage(error, 'Unable to archive client.'));
      },
    });
  }
}
