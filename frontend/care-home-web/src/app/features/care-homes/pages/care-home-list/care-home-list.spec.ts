import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CareHomeList } from './care-home-list';

describe('CareHomeList', () => {
  let component: CareHomeList;
  let fixture: ComponentFixture<CareHomeList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CareHomeList],
    }).compileComponents();

    fixture = TestBed.createComponent(CareHomeList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
