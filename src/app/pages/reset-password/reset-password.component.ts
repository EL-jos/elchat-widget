import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent {

  loading = false;
  error?: string;

  constructor(private authService: AuthService, private router: Router) { }

  onSubmit(resetPasswordFormGroup: NgForm) {
    if (!resetPasswordFormGroup.valid) return;

    this.loading = true;
    this.error = undefined;

    const email = resetPasswordFormGroup.value.email;

    this.authService.forgotPassword(email).subscribe({
      next: (res) => {
        console.log('✅ Reset password code sent:', res);
        this.loading = false;
        // ici tu peux naviguer vers la page "new password" avec l’email en queryParam
        this.router.navigate(['/new-password'], { queryParams: { email } });
      },
      error: (err) => {
        console.error('❌ Error sending reset code:', err);
        this.error = err.error?.message || 'Erreur lors de l’envoi du code';
        this.loading = false;
      }
    });
  }
}
