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

  searchSubscription: any;
  
  // Media Player State
  selectedMedia: { name: string, url: string, type: 'video' | 'audio' } | null = null;
  isBuffering = false;
  abortController: AbortController | null = null;
  toastMessage: string | null = null;

  ngOnInit() {
    if (!localStorage.getItem('token') || !(window as any).encryptionKey) {
      this.router.navigate(['/auth']);
      return;
    }
    this.loadFiles();
    this.checkParentStatus();

    this.searchSubscription = this.apiService.searchQuery.subscribe(async (query: string) => {
      if (!query.trim()) {
        this.files = [...this.allFiles];
        return;
      }
      try {
        const key = (window as any).hmacKey;
        if (!key) return;
        const blindIndex = await this.cryptoService.generateBlindIndex(query.trim(), key);
        this.files = await this.apiService.searchFiles(blindIndex);
      } catch (e) {
        console.error('Search failed', e);
      }
    });
  }

  ngOnDestroy() {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  async checkParentStatus() {
    try {
      const devices: any[] = await this.apiService.getDevices();
      const currentDeviceId = localStorage.getItem('deviceId');
      if (currentDeviceId) {
        const myDevice = devices.find((d: any) => d.deviceId === currentDeviceId);
        this.isParentDevice = myDevice?.isParent === true;
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

  /** Called by layout's (activate) event on every navigation to this route */
  refresh() {
    this.loadFiles();
    this.checkParentStatus();
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
      const hmacKey = (window as any).hmacKey;
      if (!key || !hmacKey) {
        alert('Encryption key not found. Please log in again.');
        this.router.navigate(['/auth']);
        return;
      }
      const { ciphertextBlob, iv, salt } = await this.cryptoService.encryptFile(file, key);
      const blindIndex = await this.cryptoService.generateBlindIndex(file.name, hmacKey);

      await this.apiService.uploadFile({
        filename: file.name,
        fileData: ciphertextBlob,
        iv,
        salt,
        blindIndex
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
      this.showToast('Secure share link copied to clipboard!');
    } catch (e) {
      console.error(e);
      alert('Failed to generate share link');
    }
  }

  async downloadFile(id: string) {
    try {
      const data = await this.apiService.downloadFileRaw(id);
      const key = (window as any).encryptionKey;

      const plaintextBuffer = await this.cryptoService.decryptFile(data.blob, data.iv, key);

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
      await this.apiService.deleteFile(id);
      this.loadFiles();
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Failed to delete file');
    }
  }

  isMediaFile(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ['mp4', 'webm', 'ogg', 'mp3', 'wav'].includes(ext || '');
  }

  cancelBuffering() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isBuffering = false;
  }

  showToast(message: string) {
    this.toastMessage = message;
    setTimeout(() => {
      this.toastMessage = null;
    }, 3000);
  }

  async playMedia(file: any) {
    this.isBuffering = true;
    this.abortController = new AbortController();
    try {
      const data = await this.apiService.downloadFileRaw(file._id, this.abortController.signal);
      const key = (window as any).encryptionKey;

      const plaintextBuffer = await this.cryptoService.decryptFile(data.blob, data.iv, key);
      const blob = new Blob([plaintextBuffer]);
      const url = window.URL.createObjectURL(blob);
      
      const ext = file.filename.split('.').pop()?.toLowerCase();
      const type = ['mp3', 'wav', 'ogg'].includes(ext) ? 'audio' : 'video';

      this.selectedMedia = { name: file.filename, url, type };
      this.showToast('Media is ready to play!');
    } catch (e: any) {
      if (e.name === 'AbortError' || e.message?.includes('aborted')) {
        console.log('Buffering aborted');
      } else {
        console.error(e);
        alert('Failed to buffer media. File may be corrupted or keys are missing.');
      }
    } finally {
      this.isBuffering = false;
      this.abortController = null;
    }
  }

  closeMedia() {
    if (this.selectedMedia) {
      window.URL.revokeObjectURL(this.selectedMedia.url);
      this.selectedMedia = null;
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
