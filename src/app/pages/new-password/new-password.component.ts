import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth/auth.service';

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
    private authService: AuthService
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
          console.log('✅ Password reset success:', res);
          this.loading = false;
          this.router.navigate(['/sign-in']);
        },
        error: (err) => {
          console.error('❌ Password reset error:', err);
          this.error = err.error?.message || 'Erreur lors de la réinitialisation du mot de passe';
          this.loading = false;
        }
      });
  }

}
