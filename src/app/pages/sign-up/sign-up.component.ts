import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth/auth.service';
import { WidgetService } from 'src/app/services/widget/widget.service';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.css']
})
export class SignUpComponent implements OnInit {

  loading = false;
  error?: string;
  siteId: string = ''; 

  constructor(
    private authService: AuthService,
    private router: Router
    ,private widgetService: WidgetService
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
