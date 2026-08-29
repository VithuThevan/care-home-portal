import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-care-home-dashboard',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './care-home-dashboard.html',
})
export class CareHomeDashboardPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  data: any = null;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.http.get(`/api/dashboard/care-homes/${id}`).subscribe((data) => (this.data = data));
  }
}
