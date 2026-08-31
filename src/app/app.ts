import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header.component';
import { GaugeGridComponent } from './components/gauge-grid/gauge-grid.component';
import { RightSidebarComponent } from './components/right-sidebar/right-sidebar.component';
import { ReportPdfComponent } from './components/report-pdf/report-pdf.component';

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
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  showReportModal = false;
}
