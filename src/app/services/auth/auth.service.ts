import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { User } from 'src/app/models/user/user';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private api = environment.serveur.url;

  constructor(
    private http: HttpClient,
    private router: Router
  ) { }

  login(payload: { email: string; password: string }) {
    
    return this.http.post<{ token: string; user: User }>(
      `${this.api}/login`,
      payload
    ).pipe(
      tap(res => this.storeAuth(res))
    );
  }

  register(payload: { firstname: string; lastname: string; email: string; password: string }) {
    return this.http.post<{ ok: boolean; message: string; user: User }>(
      `${this.api}/register`,
      payload
    );
  }

  verifyEmail(payload: { email: string, code: string, site_id?: string }) {
    return this.http.post<{ token: string; user: User }>(
      `${this.api}/verify-code`,
      payload
    ).pipe(
      tap(res => this.storeAuth(res))
    );
  }

  resendCode(email: string) {
    return this.http.post(
      `${this.api}/resend-code`,
      { email }
    );
  }

  forgotPassword(email: string) {
    return this.http.post(
      `${this.api}/forgot-password`,
      { email }
    );
  }

  resetPassword(payload: { email: string, code: string, password: string, password_confirmation: string }) {
    return this.http.post(
      `${this.api}/reset-password`,
      payload
    );
  }

  private storeAuth(res: any) {
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
  }

  get isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  get user(): User | null {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  }

  logout() {
    localStorage.clear();
  }

}
