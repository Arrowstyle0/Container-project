import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../services/api';
import { CryptoService } from '../services/crypto';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit {
  files: any[] = [];
  isUploading: boolean = false;
  uploadProgress: number = 0;
  
  apiService = inject(ApiService);
  cryptoService = inject(CryptoService);
  router = inject(Router);

  ngOnInit() {
    if (!localStorage.getItem('token') || !(window as any).encryptionKey) {
      this.router.navigate(['/auth']);
      return;
    }
    this.loadFiles();
  }

  async loadFiles() {
    try {
      this.files = await this.apiService.getFiles();
    } catch (e) {
      console.error(e);
    }
  }

  async handleFileUpload(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.isUploading = true;
    this.uploadProgress = 0;

    try {
      const key = (window as any).encryptionKey;
      // Encrypting could take a moment for large files, but progress is mostly for upload
      const { ciphertext, iv, salt } = await this.cryptoService.encryptFile(file, key);

      await this.apiService.uploadFile({
        filename: file.name,
        fileData: ciphertext,
        iv,
        salt
      }, (percent) => {
        this.uploadProgress = percent;
      });

      this.loadFiles();
    } catch (e) {
      console.error(e);
      alert('Upload failed');
    } finally {
      // Reset upload state after a short delay so user sees 100%
      setTimeout(() => {
        this.isUploading = false;
        this.uploadProgress = 0;
      }, 1000);
    }
  }

  async downloadFile(id: string) {
    try {
      const data = await this.apiService.downloadFile(id);
      const key = (window as any).encryptionKey;
      
      if (data.error) {
        alert('Server Error: ' + data.error);
        return;
      }
      
      const plaintextBuffer = await this.cryptoService.decryptFile(data.ciphertext, data.iv, key);

      const blob = new Blob([plaintextBuffer]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error(e);
      alert('Download failed! Please ensure your Backblaze App Key in .env has the `readFiles` permission, as downloads cannot be fetched otherwise.');
    }
  }

  async deleteFile(id: string) {
    if (!confirm('Are you sure you want to delete this file?')) return;
    try {
      await this.apiService.deleteFile(id);
      this.loadFiles();
    } catch (e) {
      console.error(e);
      alert('Failed to delete file');
    }
  }

  async removeAllData() {
    if (!confirm('Are you sure you want to clear your vault? This will permanently delete all files.')) return;
    try {
      await this.apiService.deleteAllFiles();
      this.loadFiles();
    } catch(e) {
      console.error(e);
      alert('Failed to clear vault');
    }
  }

  logout() {
    localStorage.removeItem('token');
    (window as any).encryptionKey = null;
    this.router.navigate(['/auth']);
  }
}
