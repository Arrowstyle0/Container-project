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
      body: JSON.stringify({ email, clientHashedAuthToken })
    });
    return res.json();
  }

  async login(email: string, clientHashedAuthToken: string, deviceId: string) {
    const res = await fetch(`${this.apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, clientHashedAuthToken, deviceId, deviceName: 'Browser' })
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    return data;
  }

  async uploadFile(fileParams: { filename: string, fileData: ArrayBuffer, iv: string, salt: string }, onProgress?: (percent: number) => void) {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', new Blob([fileParams.fileData]));
      formData.append('filename', fileParams.filename);
      formData.append('iv', fileParams.iv);
      formData.append('salt', fileParams.salt);
      formData.append('expiresInDays', '30');

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.apiUrl}/files/upload`, true);

      const token = localStorage.getItem('token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

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
      xhr.send(formData);
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
}
