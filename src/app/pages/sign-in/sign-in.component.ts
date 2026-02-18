import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth/auth.service';
import { WidgetService } from 'src/app/services/widget/widget.service';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.css']
})
export class SignInComponent implements OnInit {

  siteId: string = ''; 

  constructor(
    private authService: AuthService,
    private router: Router,
    private widgetService: WidgetService
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

  onSubmit(signInFormGroup: NgForm): void {
    if (signInFormGroup.valid) {
      const playload = signInFormGroup.value;
      playload.site_id = this.siteId;

      this.authService.login(playload).subscribe({
        next: () => {
          this.router.navigate(['/conversations']);
        },
        error: (err) => {
          if (err.status === 403 && err.error?.error === 'account_not_verified') {
            this.router.navigate(['/verify'], {
              queryParams: { email: playload.email }
            });
          } else {
            console.error('Login failed', err);
          }
        }
      });
    }
  }
}
