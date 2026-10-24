import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

@Injectable({ providedIn: 'root' })
export class PdfDownloadService {

  /** Use for jsPDF objects — calls doc.output('blob') internally */
  async downloadDoc(doc: any, filename: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      const blob: Blob = doc.output('blob');
      await this._nativeSave(blob, filename);
    } else {
      doc.save(filename);
    }
  }

  /** Use for server-returned PDF blobs */
  async downloadBlob(blob: Blob, filename: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await this._nativeSave(blob, filename);
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Share a PDF (WhatsApp, email…). APK: native share sheet. Browser: Web Share with
   * files where supported (most phones), otherwise falls back to a download.
   * Returns false when the browser could only download it.
   */
  async shareBlob(blob: Blob, filename: string, text?: string): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      await this._nativeSave(blob, filename);
      return true;
    }
    const file = new File([blob], filename, { type: 'application/pdf' });
    const nav: any = navigator;
    if (nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: filename, text });
        return true;
      } catch (e: any) {
        if (e?.name === 'AbortError') return true; // user closed the share sheet
      }
    }
    await this.downloadBlob(blob, filename);
    return false;
  }

  private async _nativeSave(blob: Blob, filename: string): Promise<void> {
    const base64 = await this._blobToBase64(blob);
    const result = await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Cache,
      recursive: true,
    });
    await Share.share({
      title: filename,
      url: result.uri,
      dialogTitle: 'Save or Share PDF',
    });
  }

  private _blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
