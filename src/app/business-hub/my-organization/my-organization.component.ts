import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { MyOrgService } from '../../services/my-org.service';

/** Largest side of the stored logo — plenty for the header, invoices and statements. */
const LOGO_SIZE = 256;

/**
 * Business Hub → My organisation: the logo shown in the app header, and the phone /
 * email / address printed on invoices ("Need help? Call / WhatsApp …").
 */
@Component({
  selector: 'app-my-organization',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './my-organization.component.html',
  styleUrl: './my-organization.component.css',
})
export class MyOrganizationComponent implements OnInit {
  name = '';
  phone = '';
  email = '';
  address = '';
  logo: string | null = null;
  /** Picked but not saved yet */
  newLogo: string | null = null;
  saving = false;
  savingLogo = false;
  error = '';

  constructor(private _myOrg: MyOrgService, private _toastr: ToastrService) {}

  ngOnInit() {
    this._myOrg.org$.subscribe((o) => {
      if (!o) return;
      this.name = o.name;
      this.phone = o.phone ?? '';
      this.email = o.email ?? '';
      this.address = o.address ?? '';
      this.logo = o.logoUrl;
    });
    this._myOrg.load(true);
  }

  saveDetails() {
    this.saving = true;
    this.error = '';
    this._myOrg.updateDetails({ phone: this.phone.trim() || null, email: this.email.trim() || null, address: this.address.trim() || null }).subscribe({
      next: () => {
        this.saving = false;
        this._toastr.success('Details saved — they now show on your invoices');
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.message || 'Could not save the details.';
      },
    });
  }

  /** Read the picked image and shrink it to LOGO_SIZE (keeps transparency as PNG). */
  async onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      this._toastr.warning('Please choose a PNG, JPG or WebP image.');
      return;
    }
    try {
      this.newLogo = await MyOrganizationComponent.shrink(file, LOGO_SIZE);
    } catch {
      this._toastr.error('Could not read that image.');
    }
  }

  static shrink(file: File, max: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        let data = canvas.toDataURL('image/png');
        // Photos can stay large as PNG — use JPEG then
        if (data.length > 300_000) data = canvas.toDataURL('image/jpeg', 0.85);
        resolve(data);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('bad image'));
      };
      img.src = url;
    });
  }

  saveLogo() {
    if (!this.newLogo) return;
    this.savingLogo = true;
    this._myOrg.setLogo(this.newLogo).subscribe({
      next: () => {
        this.savingLogo = false;
        this.logo = this.newLogo;
        this.newLogo = null;
        this._toastr.success('Logo saved — it now shows in the app header');
      },
      error: (err) => {
        this.savingLogo = false;
        this._toastr.error(err?.error?.message || 'Could not save the logo.');
      },
    });
  }

  removeLogo() {
    this.savingLogo = true;
    this._myOrg.setLogo(null).subscribe({
      next: () => {
        this.savingLogo = false;
        this.logo = null;
        this.newLogo = null;
        this._toastr.success('Logo removed');
      },
      error: () => {
        this.savingLogo = false;
        this._toastr.error('Could not remove the logo.');
      },
    });
  }
}
