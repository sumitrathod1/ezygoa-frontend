import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Inject } from '@angular/core';
import { VehicleService } from '../../services/vehicle.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-document-form',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule, MatDialogModule],
  templateUrl: './document-form.component.html',
  styleUrl: './document-form.component.css',
})
export class DocumentFormComponent implements OnInit {
  documentForm!: FormGroup;
  vehicles: any[] = [];
  isSubmitting = false;
  isEditMode = false;
  editDocumentId: number | null = null;

  readonly vehicleDocTypes = [
    'Insurance', 'PUC', 'Registration', 'Permit', 'Fitness', 'Road Tax', 'Other',
  ];
  readonly driverDocTypes = [
    'Driving Licence', 'Aadhar Card', 'Police Verification', 'Badge', 'Other',
  ];
  readonly companyDocTypes = [
    'Business Permit', 'GST Certificate', 'Trade Licence', 'Other',
  ];

  get docTypes(): string[] {
    switch (this.documentForm.get('category')?.value) {
      case 'Driver':  return this.driverDocTypes;
      case 'Company': return this.companyDocTypes;
      default:        return this.vehicleDocTypes;
    }
  }

  get isVehicleCategory(): boolean { return this.documentForm.get('category')?.value === 'Vehicle'; }
  get isDriverCategory():  boolean { return this.documentForm.get('category')?.value === 'Driver'; }
  get hasExpiry(): boolean { return !!this.documentForm.get('hasExpiry')?.value; }

  constructor(
    _fb: FormBuilder,
    private _dialog: MatDialog,
    private _vehicleService: VehicleService,
    private _toastr: ToastrService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    const doc = data?.document;
    this.isEditMode = !!doc;
    if (this.isEditMode) this.editDocumentId = doc.documentID;

    const defaultCategory = data?.vehicleID ? 'Vehicle' : (doc?.category || 'Vehicle');

    this.documentForm = _fb.group({
      category:       [defaultCategory],
      vehicleID:      [doc?.vehicleID ?? data?.vehicleID ?? ''],
      driverName:     [doc?.driverName || ''],
      documentType:   [doc?.documentType || ''],
      title:          [doc?.title || ''],
      documentNumber: [doc?.documentNumber || ''],
      issuedBy:       [doc?.issuedBy || ''],
      issueDate:      [doc?.issueDate ? doc.issueDate.substring(0, 10) : ''],
      hasExpiry:      [doc?.hasExpiry !== false],
      expiryDate:     [doc?.expiryDate ? doc.expiryDate.substring(0, 10) : ''],
      description:    [doc?.description || ''],
    });
  }

  ngOnInit() {
    this._vehicleService.getAllVehicles().subscribe({
      next: (res: any) => {
        this.vehicles = Array.isArray(res) ? res : (res?.data ?? []);
      },
    });
  }

  onDocumentFormSubmit() {
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    const v = this.documentForm.value;
    const payload: any = {
      title:          v.title || v.documentType,
      category:       v.category,
      documentType:   v.documentType,
      documentNumber: v.documentNumber,
      issuedBy:       v.issuedBy,
      issueDate:      v.issueDate || null,
      hasExpiry:      v.hasExpiry,
      expiryDate:     v.hasExpiry ? (v.expiryDate || null) : null,
      description:    v.description,
      vehicleID:      this.isVehicleCategory ? (v.vehicleID || null) : null,
      driverName:     this.isDriverCategory  ? v.driverName : null,
    };

    if (this.isEditMode) {
      payload.documentID = this.editDocumentId;
      this._vehicleService.updateDocument(payload).subscribe({
        next: () => {
          this._dialog.closeAll();
          this._toastr.success('Document updated successfully', 'Updated');
        },
        error: (err: any) => {
          this.isSubmitting = false;
          this._toastr.error('Error updating document', err?.message || '');
        },
      });
    } else {
      this._vehicleService.addDocument(payload).subscribe({
        next: () => {
          this._dialog.closeAll();
          this._toastr.success('Document saved successfully', 'Success');
        },
        error: (err: any) => {
          this.isSubmitting = false;
          this._toastr.error('Error saving document', err?.message || '');
        },
      });
    }
  }

  onCloseDocument() {
    this._dialog.closeAll();
  }
}
