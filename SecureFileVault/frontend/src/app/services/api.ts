import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:5000/api';

  constructor() { }

  private getHeaders(): Headers {
    const headers = new Headers();
    const token = localStorage.getItem('token');
    if (token) {
      headers.append('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  async signup(email: string, clientHashedAuthToken: string) {
    const res = await fetch(`${this.apiUrl}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, clientHashedAuthToken }),
      credentials: 'include'
    });
    return res.json();
  }

  async login(email: string, clientHashedAuthToken: string, deviceId: string, totpCode?: string) {
    const res = await fetch(`${this.apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, clientHashedAuthToken, deviceId, deviceName: 'Browser', totpCode }),
      credentials: 'include'
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    return data;
  }

  async logout() {
    await fetch(`${this.apiUrl}/auth/logout`, { method: 'POST', credentials: 'include' });
    localStorage.removeItem('token');
  }

  async setup2FA() {
    const res = await fetch(`${this.apiUrl}/auth/2fa/generate`, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include'
    });
    return res.json();
  }

  async enable2FA(totpCode: string) {
    const res = await fetch(`${this.apiUrl}/auth/2fa/enable`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ totpCode }),
      credentials: 'include'
    });
    return res.json();
  }

  async uploadFile(fileParams: { filename: string, fileData: Blob, iv: string, salt: string }, onProgress?: (percent: number) => void) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.apiUrl}/files/upload`, true);

      const token = localStorage.getItem('token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      xhr.setRequestHeader('X-File-Name', encodeURIComponent(fileParams.filename));
      xhr.setRequestHeader('X-File-Iv', fileParams.iv);
      xhr.setRequestHeader('X-File-Salt', fileParams.salt);
      // We are streaming, backend needs Content-Length, which XHR sends automatically based on Blob size

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            onProgress(percentComplete);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(xhr.responseText || 'Upload failed'));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(fileParams.fileData); // Send raw blob!
    });
  }

  async getFiles() {
    const res = await fetch(`${this.apiUrl}/files`, {
      headers: this.getHeaders()
    });
    return res.json();
  }

  async downloadFile(id: string) {
    const res = await fetch(`${this.apiUrl}/files/${id}/download`, {
      headers: this.getHeaders()
    });
    return res.json();
  }

  async deleteFile(id: string) {
    const res = await fetch(`${this.apiUrl}/files/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return res.json();
  }

  async deleteAllFiles() {
    const res = await fetch(`${this.apiUrl}/files/all`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return res.json();
  }

  async getDevices() {
    const res = await fetch(`${this.apiUrl}/auth/devices`, {
      headers: this.getHeaders(),
      credentials: 'include'
    });
    return res.json();
  }

  async setParentDevice(deviceId: string) {
    const res = await fetch(`${this.apiUrl}/auth/devices/${deviceId}/set-parent`, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  }

  async removeParentDevice(deviceId: string) {
    const res = await fetch(`${this.apiUrl}/auth/devices/${deviceId}/remove-parent`, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  }

  async getProfile() {
    const res = await fetch(`${this.apiUrl}/auth/profile`, {
      headers: this.getHeaders(),
      credentials: 'include'
    });
    return res.json();
  }
}
