import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.html',
  styleUrls: ['./landing.css']
})
export class Landing {
  themeService = inject(ThemeService);

  toggleTheme() {
    this.themeService.toggle();
  }

  get isDark(): boolean {
    return this.themeService.darkMode;
  }
}
