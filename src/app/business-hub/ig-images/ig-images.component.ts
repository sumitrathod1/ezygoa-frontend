import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IgImagesService, IgImage } from '../../services/ig-images.service';

const KEY_STORAGE = 'ig_upload_key';

@Component({
  selector: 'app-ig-images',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ig-images.component.html',
  styleUrl: './ig-images.component.css',
})
export class IgImagesComponent implements OnInit {
  uploadKey   = localStorage.getItem(KEY_STORAGE) ?? '';
  images: IgImage[] = [];
  loading     = false;
  error       = '';
  uploading   = false;
  uploadError = '';
  lastUrl     = '';
  copiedUrl   = '';
  dragOver    = false;

  constructor(private _router: Router, private _svc: IgImagesService) {}

  ngOnInit() {
    if (this.uploadKey) this.load();
  }

  saveKey() {
    localStorage.setItem(KEY_STORAGE, this.uploadKey.trim());
    this.uploadKey = this.uploadKey.trim();
    this.load();
  }

  load() {
    if (!this.uploadKey) return;
    this.loading = true;
    this.error   = '';
    this._svc.getAll(this.uploadKey).subscribe({
      next: imgs => { this.images = imgs; this.loading = false; },
      error: err => {
        this.error   = err.status === 401
          ? 'Invalid upload key — check IG_UPLOAD_KEY in Easypanel.'
          : 'Failed to load images.';
        this.loading = false;
      }
    });
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.doUpload(file);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragOver = false;
    const file = event.dataTransfer?.files[0];
    if (file) this.doUpload(file);
  }

  onDragOver(event: DragEvent) { event.preventDefault(); this.dragOver = true;  }
  onDragLeave()                 {                          this.dragOver = false; }

  doUpload(file: File) {
    if (!this.uploadKey) { this.uploadError = 'Enter and save your upload key first.'; return; }
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['jpg', 'jpeg', 'png'].includes(ext)) {
      this.uploadError = 'Only .jpg and .png files are allowed.'; return;
    }
    if (file.size > 8 * 1024 * 1024) {
      this.uploadError = 'File exceeds 8 MB limit.'; return;
    }
    this.uploading   = true;
    this.uploadError = '';
    this.lastUrl     = '';
    this._svc.upload(this.uploadKey, file).subscribe({
      next: res => {
        this.lastUrl   = res.url;
        this.uploading = false;
        this.load();
      },
      error: err => {
        this.uploadError = err.status === 401 ? 'Invalid upload key.' : 'Upload failed — try again.';
        this.uploading   = false;
      }
    });
  }

  copyUrl(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      this.copiedUrl = url;
      setTimeout(() => (this.copiedUrl = ''), 2000);
    });
  }

  back() { this._router.navigate(['/business-hub']); }
}
