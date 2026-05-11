import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api';
import { CryptoService } from '../../services/crypto';

@Component({
  selector: 'app-files',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './files.html',
  styleUrls: ['./files.css']
})
export class Files implements OnInit {
  files: any[] = [];
  allFiles: any[] = [];
  
  isUploading = false;
  uploadProgress = 0;
  isDragging = false;
  isParentDevice = false;

  apiService = inject(ApiService);
  cryptoService = inject(CryptoService);
  router = inject(Router);

  ngOnInit() {
    if (!localStorage.getItem('token') || !(window as any).encryptionKey) {
      this.router.navigate(['/auth']);
      return;
    }
    this.loadFiles();
    this.checkParentStatus();
  }

  async checkParentStatus() {
    try {
      const devices = await this.apiService.getDevices();
      const myDeviceId = localStorage.getItem('deviceId');
      if (myDeviceId && Array.isArray(devices)) {
        const myDevice = devices.find((d: any) => d.deviceId === myDeviceId);
        this.isParentDevice = myDevice?.isParent || false;
      }
    } catch (e) {
      console.error('Failed to check parent status', e);
    }
  }

  async loadFiles() {
    try {
      this.allFiles = await this.apiService.getFiles();
      this.files = [...this.allFiles];
    } catch (e) {
      console.error(e);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (!this.isUploading) this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    if (this.isUploading) return;
    const file = event.dataTransfer?.files[0];
    if (file) this.processFile(file);
  }

  async handleFileUpload(event: any) {
    const file = event.target.files[0];
    if (file) this.processFile(file);
  }

  async processFile(file: File) {
    this.isUploading = true;
    this.uploadProgress = 0;

    try {
      const key = (window as any).encryptionKey;
      if (!key) {
        alert('Encryption key not found. Please log in again.');
        this.router.navigate(['/auth']);
        return;
      }
      const { ciphertextBlob, iv, salt } = await this.cryptoService.encryptFile(file, key);

      await this.apiService.uploadFile({
        filename: file.name,
        fileData: ciphertextBlob,
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
      setTimeout(() => {
        this.isUploading = false;
        this.uploadProgress = 0;
      }, 1000);
    }
  }

  async shareFile(file: any) {
    try {
      const key = (window as any).encryptionKey;
      const rawKey = await window.crypto.subtle.exportKey("raw", key);
      const keyHex = Array.prototype.map.call(new Uint8Array(rawKey), x => ('00' + x.toString(16)).slice(-2)).join('');
      const shareUrl = `${window.location.origin}/share/${file._id}#${keyHex}`;
      await navigator.clipboard.writeText(shareUrl);
      alert('Secure share link copied to clipboard!');
    } catch (e) {
      console.error(e);
      alert('Failed to generate share link');
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
      alert('Download failed! Please ensure your Backblaze App Key in .env has the `readFiles` permission.');
    }
  }

  async deleteFile(id: string) {
    if (!confirm('Are you sure you want to delete this file?')) return;
    try {
      const result = await this.apiService.deleteFile(id);
      if (result.error) {
        alert(result.error);
        return;
      }
      this.loadFiles();
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Only parent devices can delete files.');
    }
  }

  formatBytes(bytes: number) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
