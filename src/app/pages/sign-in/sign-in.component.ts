import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth/auth.service';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.css']
})
export class SignInComponent implements OnInit {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) { }
  
  ngOnInit(): void {
  }

  onSubmit(signInFormGroup: NgForm): void {
    if (signInFormGroup.valid) {
      const playload = signInFormGroup.value;
      
      this.authService.login(playload).subscribe({
        next: () => {
          this.router.navigate(['/chat']);
        },
        error: (err) => {
          if (err.status === 403 && err.error?.error === 'account_not_verified') {
            this.router.navigate(['/verify'], {
              queryParams: { email: playload.email }
            });
          } else {
            console.error('Login failed', err);
          }
        }
      });
    }
  }
}
