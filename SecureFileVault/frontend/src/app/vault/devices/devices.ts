import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-devices',
  standalone: true,
  imports: [CommonModule, MatSlideToggleModule],
  templateUrl: './devices.html',
  styleUrls: ['./devices.css']
})
export class Devices implements OnInit {
  devices: any[] = [];
  parentDeviceCount = 0;

  apiService = inject(ApiService);

  ngOnInit() {
    this.loadDevices();
  }

  async loadDevices() {
    try {
      this.devices = await this.apiService.getDevices();
      this.parentDeviceCount = this.devices.filter(d => d.isParent).length;
    } catch (e) {
      console.error(e);
    }
  }

  async toggleParent(device: any) {
    try {
      if (device.isParent) {
        await this.apiService.removeParentDevice(device.deviceId);
      } else {
        await this.apiService.setParentDevice(device.deviceId);
      }
      await this.loadDevices();
    } catch (e: any) {
      alert(e.message || 'Failed to update device');
    }
  }
}
