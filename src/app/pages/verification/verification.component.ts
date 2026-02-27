import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth/auth.service';
import { WidgetService } from 'src/app/services/widget/widget.service';
import { MatSnackBar } from '@angular/material/snack-bar';


@Component({
  selector: 'app-verification',
  templateUrl: './verification.component.html',
  styleUrls: ['./verification.component.css']
})
export class VerificationComponent implements OnInit, OnDestroy {


  email!: string;
  loading = false;
  error?: string;
  resendDisabled = false;
  resendTimer = 0; // en secondes
  private timerInterval?: any;
  siteId: string = ''; 

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router,
    private widgetService: WidgetService,
    private snackBar: MatSnackBar   // ✅ AJOUT
  ) { }

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParamMap.get('email') ?? '';
    if (!this.email) {
      this.router.navigate(['/sign-up']);
      return;
    }

    const initialSiteId = this.widgetService.getSiteId();
    if (initialSiteId) {
      this.siteId = initialSiteId;
    }

    this.widgetService.siteId$.subscribe(id => {
      if (id && id !== this.siteId) {
        this.siteId = id;
      }
    });

    // Exemple : 1 minute par défaut si déjà envoyé
    this.startResendTimer(1);
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
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
      code,
      site_id: this.siteId
    }).subscribe({
      next: (res) => {
        // ✅ JWT stocké via AuthService
        this.showSnack(res.message, 'success');
        this.loading = false;
        this.router.navigate(['/conversations']);
      },
      error: () => {
        this.loading = false;
        this.error = 'Code invalide ou expiré.';
        this.showSnack(this.error, 'error');
      }
    });
  }

  resendCode(): void {
    if (this.resendDisabled) return;

    this.loading = true;
    this.resendDisabled = true; // ✅ bloque le bouton immédiatement

    this.authService.resendCode(this.email).subscribe({
      next: (response: any) => {
        this.showSnack(response.message, 'success');
        // ⏱️ le serveur décide du temps
        const expiresIn = response?.expires_in ?? 1; // fallback 1 minute
        this.startResendTimer(expiresIn);
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Resend code error:', error);
        this.showSnack(error.error?.message || 'Erreur lors du renvoi du code', 'error');
        // Si erreur, on autorise de recliquer
        this.resendDisabled = false;
        this.loading = false;
      }
    });
  }

  get resendMinutes(): number {
    return Math.floor(this.resendTimer / 60);
  }

  get resendSeconds(): string {
    const sec = this.resendTimer % 60;
    return sec < 10 ? '0' + sec : '' + sec;
  }

  onInput(event: any, next?: HTMLInputElement) {
    const value = event.target.value;

    // Convertit automatiquement en majuscule pour plus de confort
    event.target.value = value.toUpperCase();

    // Si l'utilisateur tape un caractère valide, passe au champ suivant
    if (value && next) {
      next.focus();
    }

    // Permet de gérer les suppressions pour revenir en arrière
    if (!value && event.inputType === 'deleteContentBackward') {
      const prevDiv = event.target.parentElement?.previousElementSibling;
      const prevInput = prevDiv?.querySelector('input') as HTMLInputElement;
      if (prevInput) prevInput.focus();
    }
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
