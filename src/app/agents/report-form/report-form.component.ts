import { Component, Inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { AgentService } from '../../services/agent.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatGridListModule } from '@angular/material/grid-list';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { DialogRef } from '@angular/cdk/dialog';

import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-report-form',
  standalone: true,
  imports: [
    FormsModule,
    MatNativeDateModule,

    MatDatepickerModule,

    MatSelectModule,
    ReactiveFormsModule,

    MatRadioModule,
    CommonModule,
    NgxMaterialTimepickerModule,
    FormsModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatDialogModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatGridListModule,
  ],
  templateUrl: './report-form.component.html',
  styleUrl: './report-form.component.css',
})
export class ReportFormComponent {
  reportForm!: FormGroup;
  agentId: number;

  constructor(
    private fb: FormBuilder,
    private _agents: AgentService,
    private _dialog: DialogRef,
    private _toaster: ToastrService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.agentId = data.agentId;
    console.log('Agent ID received:', this.agentId);
  }

  ngOnInit(): void {
    this.reportForm = this.fb.group({
      reportType: ['', Validators.required],
      fromDate: [null],
      toDate: [null],
    });

    this.reportForm.get('reportType')?.valueChanges.subscribe((value) => {
      if (value === 'full') {
        this.reportForm.patchValue({ fromDate: null, toDate: null });
        this.reportForm.get('fromDate')?.clearValidators();
        this.reportForm.get('toDate')?.clearValidators();
      } else if (value === 'partial') {
        this.reportForm.get('fromDate')?.setValidators(Validators.required);
        this.reportForm.get('toDate')?.setValidators(Validators.required);
      }
      this.reportForm.get('fromDate')?.updateValueAndValidity();
      this.reportForm.get('toDate')?.updateValueAndValidity();
    });
  }

  submitDisabled(): boolean {
    if (!this.reportForm.valid) return true;
    if (this.reportForm.get('reportType')?.value === 'partial') {
      return !(
        this.reportForm.get('fromDate')?.value &&
        this.reportForm.get('toDate')?.value
      );
    }
    return false;
  }

  onSubmit() {
    if (this.reportForm.invalid) return;

    const { reportType, fromDate, toDate } = this.reportForm.value;

    let fromDateStr = fromDate
      ? new Date(
          fromDate.getTime() - fromDate.getTimezoneOffset() * 60000
        ).toLocaleDateString('en-CA')
      : undefined;

    let toDateStr = toDate
      ? new Date(
          toDate.getTime() - toDate.getTimezoneOffset() * 60000
        ).toLocaleDateString('en-CA')
      : undefined;

    this._agents
      .downloadAgentReport(this.agentId, fromDateStr, toDateStr)
      .subscribe({
        next: async (blob: Blob) => {
          if (Capacitor.isNativePlatform()) {
            const base64Data = await this.blobToBase64(blob);
            await Filesystem.writeFile({
              path: `Agent_${this.agentId}_Report.pdf`,
              data: base64Data,
              directory: Directory.External,
              recursive: true,
            });
            this._toaster.success('✅ PDF saved in device Documents folder');
          } else {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Agent_${this.agentId}_Report.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
            this._toaster.success('✅ PDF saved in device Documents folder');
          }

          this._dialog.close();
        },
        error: (err) => {
          this._toaster.error('PDF download failed', err);
        },
      });
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
