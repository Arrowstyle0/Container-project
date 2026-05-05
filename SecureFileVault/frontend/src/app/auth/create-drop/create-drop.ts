import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';
import { CryptoService } from '../../services/crypto';

@Component({
  selector: 'app-create-drop',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-drop.html',
  styleUrls: ['./create-drop.css']
})
export class CreateDropComponent {
  name = '';
  email = '';
  dob = '';
  customKey = '';

  apiService = inject(ApiService);
  cryptoService = inject(CryptoService);

  async onCreate() {
    if (!this.name || !this.email || !this.dob) return;
    
    let passkey = this.customKey;
    if (!passkey) {
      passkey = 'dd-' + crypto.randomUUID().split('-')[0] + '-2026';
    }

    try {
      const keys = await this.cryptoService.deriveKeys(passkey);
      const res = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: this.name, dob: this.dob, email: this.email, clientHashedAuthToken: keys.authToken })
      });
      const data = await res.json();
      
      if (res.ok) {
        alert(`Drop created! Your passkey is: \n\n${passkey}\n\nPlease save it. You will need it to enter your drop.`);
        this.name = ''; this.email = ''; this.dob = ''; this.customKey = '';
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to create drop.');
    }
  }
}
