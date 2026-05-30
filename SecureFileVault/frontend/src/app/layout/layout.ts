import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { ThemeService } from '../services/theme.service';
import { ApiService } from '../services/api';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.html',
  styleUrls: ['./layout.css']
})
export class Layout {
  router = inject(Router);
  themeService = inject(ThemeService);
  apiService = inject(ApiService);
  sidebarOpen = false;
  searchTimeout: any;

  onSearch(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.apiService.searchQuery.next(query);
    }, 300);
  }

  onChildActivate(component: any) {
    // When a child route component is activated (navigated to),
    // call its refresh() method if it exists to re-fetch data.
    if (component && typeof component.refresh === 'function') {
      component.refresh();
    }
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar() {
    this.sidebarOpen = false;
  }

  toggleTheme() {
    this.themeService.toggle();
  }

  get isDark(): boolean {
    return this.themeService.darkMode;
  }

  async logout() {
    await this.apiService.logout();
    (window as any).encryptionKey = null;
    (window as any).hmacKey = null;
    this.router.navigate(['/auth']);
  }
}
