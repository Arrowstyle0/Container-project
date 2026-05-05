import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CreateDropComponent } from './create-drop/create-drop';
import { AccessDropComponent } from './access-drop/access-drop';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, CreateDropComponent, AccessDropComponent],
  templateUrl: './auth.html',
  styleUrls: ['./auth.css']
})
export class Auth {
}
