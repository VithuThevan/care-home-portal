import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PagedResult } from '../../../../core/models';

@Component({
  selector: 'app-audit-list',
  imports: [FormsModule],
  templateUrl: './audit-list.html',
})
export class AuditListPage implements OnInit {
  private readonly http = inject(HttpClient);
  items: any[] = [];
  totalCount = 0;
  entityType = '';
  page = 1;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    let params = new HttpParams().set('page', this.page).set('pageSize', 50);
    if (this.entityType) params = params.set('entityType', this.entityType);
    this.http.get<PagedResult<any>>('/api/audit', { params }).subscribe((x) => {
      this.items = x.items;
      this.totalCount = x.totalCount;
    });
  }
}
