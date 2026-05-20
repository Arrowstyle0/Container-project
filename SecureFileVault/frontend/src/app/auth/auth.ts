import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../services/api';
import { CryptoService } from '../services/crypto';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.html',
  styleUrls: ['./auth.css']
})
export class Auth implements OnInit {
  isLoginMode = true;

  name = '';
  email = '';
  dob = '';
  password = '';
  totpCode = '';
  show2FAInput = false;
  recoveryKey = '';

  isRecovering = false;
  recoveryMethod: 'email' | 'key' = 'email';
  recoveryKeyInput = '';
  resetToken = '';

  apiService = inject(ApiService);
  cryptoService = inject(CryptoService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['resetToken']) {
        this.resetToken = params['resetToken'];
      }
    });
  }

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.show2FAInput = false;
    this.recoveryKey = '';
    this.password = '';
    this.totpCode = '';
    this.isRecovering = false;
  }

  cancelRecovery() {
    this.isRecovering = false;
    this.resetToken = '';
    this.password = '';
    this.router.navigate(['/auth']);
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

      const data = await this.apiService.login(this.email, keys.authToken, deviceId, this.totpCode);

      if (data.require2FA) {
        this.show2FAInput = true;
        return;
      }

      if (data.token) {
        (window as any).encryptionKey = keys.encKey; 
        (window as any).hmacKey = keys.hmacKey;
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

  async onRecoverySubmit() {
    if (this.recoveryMethod === 'email') {
      if (!this.email) return;
      try {
        const res = await fetch('http://localhost:5000/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: this.email })
        });
        const data = await res.json();
        alert(data.message || 'If that email exists, a reset link has been sent.');
      } catch (e) {
        alert('Failed to send reset link.');
      }
    } else {
      if (!this.email || !this.recoveryKeyInput || !this.password) return;
      try {
        const keys = await this.cryptoService.deriveKeys(this.password);
        const res = await fetch('http://localhost:5000/api/auth/recover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: this.email,
            mnemonicHash: this.recoveryKeyInput,
            newClientHashedAuthToken: keys.authToken
          })
        });
        const data = await res.json();
        if (res.ok) {
          alert('Account recovered! You can now log in.');
          this.cancelRecovery();
        } else {
          alert('Error: ' + data.error);
        }
      } catch (e) {
        alert('Failed to recover account.');
      }
    }
  }

  async onResetPasswordSubmit() {
    if (!this.password || !this.resetToken) return;
    try {
      const keys = await this.cryptoService.deriveKeys(this.password);
      const res = await fetch('http://localhost:5000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: this.resetToken,
          newClientHashedAuthToken: keys.authToken
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Passphrase reset successful! You can now log in.');
        this.cancelRecovery();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e) {
      alert('Failed to reset passphrase.');
    }
  }
}
