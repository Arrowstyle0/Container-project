import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private isDark = true;

  constructor() {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
      this.isDark = false;
    }
    this.apply();
  }

  get darkMode(): boolean {
    return this.isDark;
  }

  toggle(): void {
    this.isDark = !this.isDark;
    localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
    this.apply();
  }

  private apply(): void {
    document.documentElement.setAttribute('data-theme', this.isDark ? 'dark' : 'light');
  }
}
