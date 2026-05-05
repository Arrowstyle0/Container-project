import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api';
import { CryptoService } from '../../services/crypto';
import { KeyMaskPipe } from '../../shared/pipes/key-mask.pipe';

@Component({
  selector: 'app-access-drop',
  standalone: true,
  imports: [CommonModule, FormsModule, KeyMaskPipe],
  templateUrl: './access-drop.html',
  styleUrls: ['./access-drop.css']
})
export class AccessDropComponent {
  passkey = '';

  apiService = inject(ApiService);
  cryptoService = inject(CryptoService);
  router = inject(Router);

  async onAccess() {
    if (!this.passkey) return;

    try {
      const keys = await this.cryptoService.deriveKeys(this.passkey);
      
      let deviceId = localStorage.getItem('deviceId');
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('deviceId', deviceId);
      }

      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientHashedAuthToken: keys.authToken, deviceId, deviceName: 'Browser' })
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        (window as any).encryptionKey = keys.encKey; 
        this.router.navigate(['/dashboard']);
      } else {
        alert('Error: ' + data.error);
      }

    } catch (e) {
      console.error(e);
      alert('Failed to enter drop. Check your passkey.');
    }
  }
}
