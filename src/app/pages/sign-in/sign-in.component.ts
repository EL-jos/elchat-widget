import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth/auth.service';
import { WidgetService } from 'src/app/services/widget/widget.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { v4 as uuidv4 } from 'uuid';

const id = uuidv4();

declare const FB: any;

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.css']
})
export class SignInComponent implements OnInit {

  siteId: string = '';
  showPassword: boolean = false;
  showPasswordConfirm: boolean = false;
  loading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private widgetService: WidgetService,
    private snackBar: MatSnackBar   // ✅ AJOUT
  ) { }

  ngOnInit(): void {

    const initialSiteId = this.widgetService.getSiteId();
    if (initialSiteId) {
      this.siteId = initialSiteId;
    }

    this.widgetService.siteId$.subscribe(id => {
      if (id && id !== this.siteId) {
        this.siteId = id;
      }
    });

  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  togglePasswordConfirm() {
    this.showPasswordConfirm = !this.showPasswordConfirm;
  }

  onSubmit(signInFormGroup: NgForm): void {
    if (signInFormGroup.valid) {
      this.loading = true;
      const playload = signInFormGroup.value;
      playload.site_id = this.siteId;

      this.authService.login(playload).subscribe({
        next: () => {
          this.showSnack('Connexion réussie 👋', 'success');
          this.loading = false;
          this.router.navigate(['/conversations']);
        },
        error: (err) => {
          this.loading = false;
          if (err.status === 403 && err.error?.error === 'account_not_verified') {

            this.showSnack('Compte non vérifié. Veuillez entrer le code reçu.', 'error');

            this.router.navigate(['/verify'], {
              queryParams: { email: playload.email }
            });

          } else if (err.status === 401 && err.error?.error === 'invalid_credentials') {

            this.showSnack('Email ou mot de passe incorrect.', 'error');

          } else {

            this.showSnack('Erreur serveur. Veuillez réessayer.', 'error');
          }
        }
      });
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

  signInWithGoogle() {

    const url = `https://elchat.io/auth/google?site_id=${this.siteId}&mode=login`;

    const width = 300;
    const height = 300;
    const left = (screen.width / 2) - (width / 2);
    const top = (screen.height / 2) - (height / 2);

    const win = window.open(
      url,
      'GoogleLogin',
      `width=${width},height=${height},top=${top},left=${left}`
    );

    const listener = (event:MessageEvent) => {
      if (event.origin !== 'https://elchat.io') return; // sécurité
      const data = event.data;
      if (data?.ok) {
        this.showSnack(data.message, 'success');
        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          this.router.navigate(['/conversations']);
        }
        window.removeEventListener('message', listener);
        win?.close()
      } else if (data?.error) {
        this.showSnack(data.message, 'error');
        if (data.error === 'account_not_verified') {
          this.router.navigate(['/verify'], {
            queryParams: { email: data.user?.email }
          });
        }

        window.removeEventListener('message', listener);
        win?.close();
      }
    }

    // Écouter le message du popup
    window.addEventListener('message', listener);
  }

  signInWithFacebook() {
    // ⚡ Ne pas modifier le token global FB, juste utiliser response.authResponse.accessToken
    FB.login((response: any) => {
      if (response.authResponse && response.authResponse.accessToken) {
        const fbToken = response.authResponse.accessToken;
        this.sendFacebookTokenToBackend(fbToken, 'login');
      } else {
        // Utilisateur a annulé la connexion
        this.showSnack('Connexion Facebook annulée', 'error');
      }
    }, {
      scope: 'email,public_profile',
      return_scopes: true // garantit que les scopes demandés sont bien reçus
    });
  }

  private sendFacebookTokenToBackend(token: string, mode: 'login' | 'register') {
    this.authService.facebookAuth({
      facebook_token: token,
      site_id: this.siteId,
      is_admin: false,
      mode
    }).subscribe({
      next: (res) => {
        if (res.ok) {
          this.showSnack(mode === 'login' ? 'Connexion réussie 👋' : res.message, 'success');

          this.router.navigate([
            mode === 'login' ? '/conversations' : '/verify'
          ], mode === 'login' ? {} : {
            queryParams: { email: res.user.email }
          });
        }
      },
      error: () => {
        this.showSnack('Erreur Facebook Auth', 'error');
      }
    });
  }
}
