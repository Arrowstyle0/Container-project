import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../services/api';
import { CryptoService } from '../services/crypto';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.html',
  styleUrls: ['./auth.css']
})
export class Auth {
  isLoginMode = true;

  name = '';
  email = '';
  dob = '';
  password = '';
  totpCode = '';
  show2FAInput = false;
  recoveryKey = '';

  apiService = inject(ApiService);
  cryptoService = inject(CryptoService);
  router = inject(Router);

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.show2FAInput = false;
    this.recoveryKey = '';
    this.password = '';
    this.totpCode = '';
  }

  async onSubmit() {
    if (this.isLoginMode) {
      await this.login();
    } else {
      await this.signup();
    }
  }

  async login() {
    if (!this.password) return;
    try {
      const keys = await this.cryptoService.deriveKeys(this.password);
      
      let deviceId = localStorage.getItem('deviceId');
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('deviceId', deviceId);
      }

      const data = await this.apiService.login(keys.authToken, keys.authToken, deviceId, this.totpCode);

      if (data.require2FA) {
        this.show2FAInput = true;
        return;
      }

      if (data.token) {
        (window as any).encryptionKey = keys.encKey; 
        this.router.navigate(['/vault']);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Failed to enter vault. Check your passphrase.');
    }
  }

  async signup() {
    if (!this.email || !this.password) return;
    try {
      const keys = await this.cryptoService.deriveKeys(this.password);
      const res = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: this.name, dob: this.dob || new Date().toISOString(), email: this.email, clientHashedAuthToken: keys.authToken })
      });
      const data = await res.json();
      
      if (res.ok) {
        this.recoveryKey = data.recoveryKey;
        this.password = ''; // Clear for security
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to create vault.');
    }
  }
}
