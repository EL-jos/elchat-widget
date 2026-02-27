import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent {

  loading = false;
  error?: string;

  constructor(
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar   // ✅ AJOUT
  ) { }

  onSubmit(resetPasswordFormGroup: NgForm) {
    if (!resetPasswordFormGroup.valid) return;

    this.loading = true;
    this.error = undefined;

    const email = resetPasswordFormGroup.value.email;

    this.authService.forgotPassword(email).subscribe({
      next: (res) => {
        this.showSnack(
          'Si cet email existe, un code de réinitialisation a été envoyé.',
          'success'
        );
        this.loading = false;
        // ici tu peux naviguer vers la page "new password" avec l’email en queryParam
        this.router.navigate(['/new-password'], { queryParams: { email } });
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors de l’envoi du code';
        this.loading = false;
        if (err.status === 429) {
          this.showSnack(
            'Veuillez patienter avant de demander un nouveau code.',
            'error'
          );
        } else {
          this.showSnack(
            'Erreur lors de l’envoi du code.',
            'error'
          );
        }
      }
    });
  }

  private showSnack(message: string, type: 'success' | 'error' = 'success') {
    this.snackBar.open(message, 'Fermer', {
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: type === 'success'
        ? ['snackbar-success']
        : ['snackbar-error']
    });
  }
}
