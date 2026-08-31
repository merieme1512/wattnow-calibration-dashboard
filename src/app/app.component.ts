import { Component, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { HeaderComponent } from './components/header/header.component';
import { GaugeGridComponent } from './components/gauge-grid/gauge-grid.component';
import { RightSidebarComponent } from './components/right-sidebar/right-sidebar.component';
import { ReportPdfComponent } from './components/report-pdf/report-pdf.component';
import { CalibrationStateService } from './services/calibration-state.service';
import { DeviceSlotState, TabMode } from './models/calibration.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    GaugeGridComponent,
    RightSidebarComponent,
    ReportPdfComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100vh; overflow: hidden; background-color: #060911; }
  `],
  template: `
    <div class="flex flex-col h-full bg-[#060911] text-slate-100 selection:bg-cyan-500 selection:text-white">

      <!-- Top Header Navigation -->
      <app-header class="shrink-0"></app-header>

      <!-- Main Layout: 5-Column Gauge Grid on Left + Right Sidebar Controls -->
      <div class="flex flex-1 overflow-hidden">

        <!-- Left Main Area: Gauge Grid (180° Semi-Circles) -->
        <main class="flex-1 overflow-y-auto bg-[#060911]">
          <app-gauge-grid></app-gauge-grid>
        </main>

        <!-- Right Sidebar Controls & Notifications -->
        <app-right-sidebar
          class="shrink-0"
          (openReportModal)="isReportModalOpen = true">
        </app-right-sidebar>

      </div>

      <!-- PDF Certification Report Modal -->
      <app-report-pdf
        [isOpen]="isReportModalOpen"
        [slots]="slots"
        [activeTab]="activeTab"
        (close)="isReportModalOpen = false">
      </app-report-pdf>

    </div>
  `
})
export class AppComponent implements OnDestroy {
  slots: DeviceSlotState[] = [];
  activeTab: TabMode = 'CT_10A';
  isReportModalOpen = false;
  private sub = new Subscription();

  constructor(
    private stateService: CalibrationStateService,
    private cdr: ChangeDetectorRef
  ) {
    this.sub.add(this.stateService.slots$.subscribe(s => {
      this.slots = [...s];
      this.cdr.markForCheck();
    }));

    this.sub.add(this.stateService.activeTab$.subscribe(t => {
      this.activeTab = t;
      this.cdr.markForCheck();
    }));
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
