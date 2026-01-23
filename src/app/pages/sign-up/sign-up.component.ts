import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth/auth.service';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.css']
})
export class SignUpComponent {

  loading = false;
  error?: string;

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  onSubmit(signUpFormGroup: NgForm): void {
    if (!signUpFormGroup.valid) return;

    this.loading = true;
    this.error = undefined;

    this.authService.register(signUpFormGroup.value).subscribe({
      next: (res) => {
        // ✔️ compte créé, PAS connecté
        this.router.navigate(['/verify'], {
          queryParams: { email: res.user.email }
        });
      },
      error: (err) => {
        this.loading = false;

        if (err.status === 409) {
          this.error = 'Un compte existe déjà avec cet email.';
        } else {
          this.error = 'Erreur lors de la création du compte.';
        }
      }
    });
  }

}
