import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CareHomeForm } from './care-home-form';

describe('CareHomeForm', () => {
  let component: CareHomeForm;
  let fixture: ComponentFixture<CareHomeForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CareHomeForm],
    }).compileComponents();

    fixture = TestBed.createComponent(CareHomeForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
