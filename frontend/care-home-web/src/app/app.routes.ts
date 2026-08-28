import { Routes } from '@angular/router';

import { CompanyList } from './features/companies/pages/company-list/company-list';

import { CompanyForm } from './features/companies/pages/company-form/company-form';

import { CareHomeList } from './features/care-homes/pages/care-home-list/care-home-list';

import { CareHomeForm } from './features/care-homes/pages/care-home-form/care-home-form';

import { ClientList } from './features/clients/pages/client-list/client-list';

import { ClientForm } from './features/clients/pages/client-form/client-form';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'companies',
    pathMatch: 'full',
  },

  {
    path: 'companies',
    component: CompanyList,
  },

  {
    path: 'companies/new',
    component: CompanyForm,
  },

  {
    path: 'companies/:id/edit',
    component: CompanyForm,
  },

  {
    path: 'care-homes',
    component: CareHomeList,
  },

  {
    path: 'care-homes/new',
    component: CareHomeForm,
  },

  {
    path: 'care-homes/:id/edit',
    component: CareHomeForm,
  },

  {
    path: 'clients',
    component: ClientList,
  },

  {
    path: 'clients/new',
    component: ClientForm,
  },

  {
    path: 'clients/:id/edit',
    component: ClientForm,
  },
];
