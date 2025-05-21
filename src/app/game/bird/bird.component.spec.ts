import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BirdComponent } from './bird.component';

describe('BirdComponent', () => {
  let component: BirdComponent;
  let fixture: ComponentFixture<BirdComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BirdComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BirdComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
