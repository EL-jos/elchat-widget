import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth/auth.service';
import { WidgetService } from 'src/app/services/widget/widget.service';

declare const FB: any;

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.css']
})
export class SignUpComponent implements OnInit {

  loading = false;
  error?: string;
  siteId: string = '';
  showGoogleButton = true;

  showPassword: boolean = false;
  showPasswordConfirm: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private widgetService: WidgetService,
    private snackBar: MatSnackBar,   // ✅ AJOUT
  ) { }

  ngOnInit(): void {

    const initialSiteId = this.widgetService.getSiteId();
    if (initialSiteId) {
      //this.siteId = initialSiteId;
    }

    this.widgetService.siteId$.subscribe(id => {
      if (id && id !== this.siteId) {
        //this.siteId = id;
      }
    });

    this.siteId = "0cc78a8e-f60b-420c-b412-6b953d578a84";

  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  togglePasswordConfirm() {
    this.showPasswordConfirm = !this.showPasswordConfirm;
  }

  onSubmit(signUpFormGroup: NgForm): void {
    if (!signUpFormGroup.valid) return;

    this.loading = true;
    this.error = undefined;
    let payload = { ...signUpFormGroup.value, is_admin: false, site_id: this.siteId };
    payload.is_admin = false; // forcer à false pour éviter les abus
    payload.site_id = this.siteId;
    console.log(payload);


    this.authService.register(payload).subscribe({
      next: (res) => {
        // ✔️ compte créé, PAS connecté
        this.showSnack(res.message, 'success');
        this.loading = false
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

        this.showSnack(this.error, 'error');
      }
    });
  }

  private showSnack(message: string, type: 'success' | 'error' = 'success') {
    this.snackBar.open(message, 'Fermer', {
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: type === 'success' ? ['snackbar-success'] : ['snackbar-error']
    });
  }

  signUpWithGoogle() {

    const url = `https://elchat.io/auth/google?site_id=${this.siteId}&mode=register`;

    const width = 300;
    const height = 300;
    const left = (screen.width / 2) - (width / 2);
    const top = (screen.height / 2) - (height / 2);

    const win = window.open(
      url,
      'GoogleRegister',
      `width=${width},height=${height},top=${top},left=${left}`
    );

    const listener = (event: MessageEvent) => {
      if (event.origin !== 'https://elchat.io') return; // sécurité
      const data = event.data;
      if (data?.ok) {
        this.showSnack(data.message, 'success');
        // redirection vers /verify
        this.router.navigate(['/verify'], {
          queryParams: { email: data.user.email }
        });
        // On ferme le listener et la popup
        window.removeEventListener('message', listener);
        win?.close();
      } else if (data?.error) {
        this.showSnack(data.message, 'error');
        window.removeEventListener('message', listener);
        win?.close();
      }
    }

    // Écouter le message du popup
    window.addEventListener('message', listener);
  }

  signUpWithFacebook() {
    this.loading = true;

    FB.login((response: any) => {
      // ✅ Vérifie qu’on a bien un token
      if (response.authResponse && response.authResponse.accessToken) {
        const fbToken = response.authResponse.accessToken;

        // On n’écrase pas le token global, on l’envoie directement au backend
        this.sendFacebookTokenToBackend(fbToken);
      } else {
        this.loading = false;
        this.showSnack('Connexion Facebook annulée', 'error');
      }
    }, {
      scope: 'email,public_profile',
      return_scopes: true // garantit qu’on reçoit les bons scopes
    });
  }

  private sendFacebookTokenToBackend(token: string) {
    this.authService.facebookAuth({
      facebook_token: token,
      site_id: this.siteId,
      is_admin: false,
      mode: 'register'
    }).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.ok) {
          this.showSnack(res.message, 'success');
          this.router.navigate(['/verify'], {
            queryParams: { email: res.user.email }
          });
        }
      },
      error: () => {
        this.loading = false;
        this.showSnack('Erreur Facebook Auth', 'error');
      }
    });
  }

}
