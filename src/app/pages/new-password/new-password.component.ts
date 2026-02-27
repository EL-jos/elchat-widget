import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-new-password',
  templateUrl: './new-password.component.html',
  styleUrls: ['./new-password.component.css']
})
export class NewPasswordComponent implements OnInit {

  email!: string;
  loading = false;
  error?: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private snackBar: MatSnackBar   // ✅ AJOUT
  ) { }

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParamMap.get('email') ?? '';
    if (!this.email) {
      this.router.navigate(['/reset-password']);
    }
  }

  onSubmit(form: NgForm) {
    if (!form.valid) return;

    const code =
      form.value.code0 +
      form.value.code1 +
      form.value.code2 +
      form.value.code3 +
      form.value.code4 +
      form.value.code5;
    const password = form.value.password;
    const password_confirmation = form.value.password_confirmation;

    this.loading = true;
    this.error = undefined;

    this.authService.resetPassword({ email: this.email, code, password, password_confirmation })
      .subscribe({
        next: (res) => {
          this.showSnack('Mot de passe réinitialisé avec succès', 'success');
          this.loading = false;
          this.router.navigate(['/sign-in']);
        },
        error: (err) => {
          this.loading = false;

          if (err.status === 422) {
            this.showSnack(err.error?.message || 'Code invalide ou expiré.', 'error');
          }
          else if (err.status === 429) {
            this.showSnack(err.error?.message || 'Code bloqué. Demandez un nouveau code.', 'error');
          }
          else {
            this.showSnack('Erreur serveur. Veuillez réessayer.', 'error');
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
