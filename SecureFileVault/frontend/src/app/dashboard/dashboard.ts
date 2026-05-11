import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../services/api';
import { CryptoService } from '../services/crypto';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  qrCodeUrl = '';
  totpCode = '';
  show2FASetup = false;
  
  showDevicesModal = false;
  devices: any[] = [];
  parentDeviceCount = 0;

  isDragging = false;
  searchQuery = '';
  allFiles: any[] = []; // Store original array for filtering

  async openDevices() {
    try {
      this.devices = await this.apiService.getDevices();
      this.parentDeviceCount = this.devices.filter(d => d.isParent).length;
      this.showDevicesModal = true;
    } catch (e) {
      alert('Failed to load devices');
    }
  }

  async setParentDevice(deviceId: string) {
    try {
      await this.apiService.setParentDevice(deviceId);
      await this.openDevices(); // Refresh the list
      alert('Device marked as parent!');
    } catch (e: any) {
      alert(e.message || 'Failed to set parent device');
    }
  }

  async open2FASetup() {
    try {
      const data = await this.apiService.setup2FA();
      this.qrCodeUrl = data.qrCodeUrl;
      this.show2FASetup = true;
    } catch (e) {
      alert('Failed to init 2FA');
    }
  }

  async confirm2FA() {
    try {
      await this.apiService.enable2FA(this.totpCode);
      alert('2FA Enabled Successfully!');
      this.show2FASetup = false;
    } catch (e) {
      alert('Invalid code!');
    }
  }

  async loadFiles() {
    try {
      this.allFiles = await this.apiService.getFiles();
      this.filterFiles();
    } catch (e) {
      console.error(e);
    }
  }

  filterFiles() {
    if (!this.searchQuery) {
      this.files = [...this.allFiles];
    } else {
      const q = this.searchQuery.toLowerCase();
      this.files = this.allFiles.filter(f => f.filename.toLowerCase().includes(q));
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
      // Export CryptoKey to raw format and encode as hex
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
    } catch (e) {
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
