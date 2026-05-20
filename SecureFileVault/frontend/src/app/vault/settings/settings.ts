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
      const currentKeys = await this.cryptoService.deriveKeys(this.currentPassphrase);
      const newKeys = await this.cryptoService.deriveKeys(this.newPassphrase);

      await this.apiService.changePassphrase(currentKeys.authToken, newKeys.authToken);
      
      // Update local keys so user doesn't need to re-login immediately for new files
      (window as any).encryptionKey = newKeys.encKey;
      (window as any).hmacKey = newKeys.hmacKey;

      alert('Passphrase changed successfully! Note: Existing files were encrypted with your old passphrase and will no longer be accessible unless you re-upload them.');
      
      this.showChangePassphrase = false;
      this.currentPassphrase = '';
      this.newPassphrase = '';
    } catch (e: any) {
      alert(e.message || 'Failed to change passphrase');
    }
  }
}
