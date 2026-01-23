import { Injectable } from '@angular/core';
import {
    HttpErrorResponse,
    HttpEvent,
    HttpHandler,
    HttpInterceptor,
    HttpRequest
} from '@angular/common/http';
import { catchError, EMPTY, Observable, throwError } from 'rxjs';
import { Router } from '@angular/router';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {

    constructor(private router: Router) { }
    
    intercept(
        req: HttpRequest<any>,
        next: HttpHandler
    ): Observable<HttpEvent<any>> {

        const token = localStorage.getItem('token');

        // Si le token existe, on clone la requête
        if (token) {
            req = req.clone({
                setHeaders: {
                    Authorization: `Bearer ${token}`
                }
            });
        }

        //return next.handle(req);
        return next.handle(req).pipe(
            catchError((err: HttpErrorResponse) => {

                // 🔹 Vérifier si c'est une erreur liée au token
                if (err.status === 401 &&
                    (err.error?.error === 'token_expired' ||
                        err.error?.error === 'token_invalid' ||
                        err.error?.error === 'token_not_provided') || 
                    err.error?.message?.toLowerCase().includes('token')) {

                    // Supprimer le token local
                    localStorage.removeItem('token');

                    // Rediriger vers sign-in
                    this.router.navigate(['/sign-in']);

                    // Stopper la propagation de l'erreur vers les composants
                    return EMPTY; // ✅ renvoie un Observable vide
                }

                // Pour les autres erreurs, on les laisse passer
                return throwError(() => err);
            })
        );

    }
}
