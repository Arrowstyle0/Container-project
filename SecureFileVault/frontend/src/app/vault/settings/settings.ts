import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';
import { CryptoService } from '../../services/crypto';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrls: ['./settings.css']
})
export class Settings implements OnInit {
  qrCodeUrl = '';
  totpCode = '';
  show2FASetup = false;
  devices: any[] = [];

  userEmail = '';
  userName = '';
  emailVerified = false;
  is2FAEnabled = false;

  showChangePassphrase = false;
  currentPassphrase = '';
  newPassphrase = '';

  apiService = inject(ApiService);
  cryptoService = inject(CryptoService);

  ngOnInit() {
    this.loadProfile();
    this.loadDevices();
  }

  async loadProfile() {
    try {
      const profile = await this.apiService.getProfile();
      this.userEmail = profile.email;
      this.userName = profile.name || 'User';
      this.emailVerified = profile.emailVerified;
      this.is2FAEnabled = profile.isTwoFactorEnabled;
    } catch (e) {
      console.error(e);
    }
  }

  async loadDevices() {
    try {
      this.devices = await this.apiService.getDevices();
    } catch (e) {
      console.error(e);
    }
  }

  /** Called by layout's (activate) event on every navigation to this route */
  refresh() {
    this.loadProfile();
    this.loadDevices();
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
      this.is2FAEnabled = true;
    } catch (e) {
      alert('Invalid code!');
    }
  }

  async changePassphrase() {
    if (!this.currentPassphrase || !this.newPassphrase) return;
    try {
      const currentAuth = await this.cryptoService.generateKekAndAuthToken(this.currentPassphrase);
      const newAuth = await this.cryptoService.generateKekAndAuthToken(this.newPassphrase);

      const activeMasterKey = (window as any).encryptionKey;
      if (!activeMasterKey) {
        throw new Error('Active master key not found in memory. Please log in again.');
      }

      // Wrap the existing Master Key using the new KEK
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const wrappedKeyBuffer = await window.crypto.subtle.wrapKey(
        "raw",
        activeMasterKey,
        newAuth.kek,
        { name: "AES-GCM", iv }
      );

      const buf2hex = (buffer: ArrayBuffer | Uint8Array) => 
        Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');

      const encryptedMasterKey = buf2hex(wrappedKeyBuffer);
      const masterKeyIV = buf2hex(iv);

      await this.apiService.changePassphrase(
        currentAuth.authToken, 
        newAuth.authToken, 
        encryptedMasterKey, 
        masterKeyIV
      );

      alert('Passphrase changed successfully! Zero-knowledge master key has been securely re-wrapped with your new passphrase. All existing files remain fully accessible.');
      
      this.showChangePassphrase = false;
      this.currentPassphrase = '';
      this.newPassphrase = '';
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Failed to change passphrase');
    }
  }
}
