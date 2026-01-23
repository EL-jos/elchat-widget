import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth/auth.service';

@Component({
  selector: 'app-verification',
  templateUrl: './verification.component.html',
  styleUrls: ['./verification.component.css']
})
export class VerificationComponent implements OnInit {
  

  email!: string;
  loading = false;
  error?: string;
  resendDisabled = false;
  resendTimer = 0; // en secondes
  private timerInterval?: any;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParamMap.get('email') ?? '';
    if (!this.email) {
      this.router.navigate(['/sign-up']);
      return;
    }

    // Exemple : 1 minute par défaut si déjà envoyé
    this.startResendTimer(1);
  }

  private startResendTimer(minutes: number): void {
    // clear ancien timer
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.resendTimer = minutes * 60;
    this.resendDisabled = true;

    this.timerInterval = setInterval(() => {
      this.resendTimer--;

      if (this.resendTimer <= 0) {
        this.resendDisabled = false;
        clearInterval(this.timerInterval);
      }
    }, 1000);
  }

  onSubmit(form: NgForm): void {
    if (!form.valid) return;

    const code =
      form.value.code0 +
      form.value.code1 +
      form.value.code2 +
      form.value.code3 +
      form.value.code4 +
      form.value.code5;

    this.loading = true;
    this.error = undefined;

    this.authService.verifyEmail({
      email: this.email,
      code
    }).subscribe({
      next: () => {
        // ✅ JWT stocké via AuthService
        this.router.navigate(['/chat']);
      },
      error: () => {
        this.loading = false;
        this.error = 'Code invalide ou expiré.';
      }
    });
  }

  resendCode(): void {
    if (this.resendDisabled) return;

    this.authService.resendCode(this.email).subscribe({
      next: (response: any) => {
        console.log('✅ Resend code success:', response);

        // ⏱️ le serveur décide du temps
        if (response?.expires_in) {
          this.startResendTimer(response.expires_in);
        }
      },
      error: (error) => {
        console.error('❌ Resend code error:', error);
      }
    });
  }



  onInput(event: any, next?: HTMLInputElement) {
    if (event.target.value && next) {
      next.focus();
    }
  }

}
