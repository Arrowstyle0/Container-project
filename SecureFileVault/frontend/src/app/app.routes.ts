import { Routes } from '@angular/router';
import { Auth } from './auth/auth';
import { Landing } from './landing/landing';
import { Layout } from './layout/layout';
import { Files } from './vault/files/files';
import { Devices } from './vault/devices/devices';
import { Settings } from './vault/settings/settings';

export const routes: Routes = [
  { path: '', component: Landing },
  { path: 'auth', component: Auth },
  { 
    path: 'vault', 
    component: Layout,
    children: [
      { path: '', redirectTo: 'files', pathMatch: 'full' },
      { path: 'files', component: Files },
      { path: 'devices', component: Devices },
      { path: 'settings', component: Settings }
    ]
  },
  { path: '**', redirectTo: '' }
];
