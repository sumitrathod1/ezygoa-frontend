import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface RowError {
  row: number;
  messages: string[];
}

interface UploadResult {
  total: number;
  successful: number;
  failed: number;
  errors: RowError[];
}

type UploadType = 'booking' | 'expense' | 'document' | 'maintenance';

const TYPE_LABELS: Record<UploadType, string> = {
  booking: 'Bookings',
  expense: 'Vehicle Expenses',
  document: 'Documents',
  maintenance: 'Maintenance',
};

@Component({
  selector: 'app-bulk-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bulk-upload.component.html',
  styleUrl: './bulk-upload.component.css',
})
export class BulkUploadComponent {
  readonly baseUrl = `${environment.apiUrl}/BulkUpload`;

  selectedType: UploadType = 'booking';
  selectedFile: File | null = null;
  uploading = signal(false);
  downloading = signal(false);
  result = signal<UploadResult | null>(null);
  errorMessage = signal<string | null>(null);
  uploadProgress = signal(0);

  readonly typeOptions: { value: UploadType; label: string }[] = [
    { value: 'booking', label: 'Bookings' },
    { value: 'expense', label: 'Vehicle Expenses' },
    { value: 'document', label: 'Documents' },
    { value: 'maintenance', label: 'Maintenance' },
  ];

  constructor(private http: HttpClient) {}

  get typeLabel(): string {
    return TYPE_LABELS[this.selectedType];
  }

  onTypeChange(): void {
    this.selectedFile = null;
    this.result.set(null);
    this.errorMessage.set(null);
    this.uploadProgress.set(0);
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.xlsx')) {
      this.errorMessage.set('Only .xlsx files are supported.');
      this.selectedFile = null;
      return;
    }
    this.selectedFile = file;
    this.result.set(null);
    this.errorMessage.set(null);
  }

  downloadTemplate(): void {
    this.downloading.set(true);
    this.http
      .get(`${this.baseUrl}/template/${this.selectedType}`, { responseType: 'blob' })
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${this.selectedType}_template.xlsx`;
          a.click();
          URL.revokeObjectURL(url);
          this.downloading.set(false);
        },
        error: () => {
          this.errorMessage.set('Failed to download template. Make sure you are logged in.');
          this.downloading.set(false);
        },
      });
  }

  uploadFile(): void {
    if (!this.selectedFile) return;
    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.uploading.set(true);
    this.uploadProgress.set(0);
    this.result.set(null);
    this.errorMessage.set(null);

    this.http
      .post<{ data: UploadResult }>(`${this.baseUrl}/upload/${this.selectedType}`, formData, {
        reportProgress: true,
        observe: 'events',
      })
      .subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            this.uploadProgress.set(Math.round((event.loaded / event.total) * 100));
          } else if (event.type === HttpEventType.Response) {
            this.result.set(event.body?.data ?? null);
            this.uploading.set(false);
            this.uploadProgress.set(100);
          }
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.message ?? 'Upload failed. Please check the file and try again.');
          this.uploading.set(false);
        },
      });
  }

  downloadErrorReport(): void {
    const errors = this.result()?.errors;
    if (!errors?.length) return;
    const lines = ['Row,Messages'];
    for (const e of errors) {
      lines.push(`${e.row},"${e.messages.join('; ')}"`);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.selectedType}_errors.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  reset(): void {
    this.selectedFile = null;
    this.result.set(null);
    this.errorMessage.set(null);
    this.uploadProgress.set(0);
  }
}
