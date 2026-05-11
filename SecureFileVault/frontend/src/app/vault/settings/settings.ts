import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';

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

  apiService = inject(ApiService);

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
}
