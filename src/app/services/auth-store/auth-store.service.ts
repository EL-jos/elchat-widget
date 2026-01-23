import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { User } from 'src/app/models/user/user';

@Injectable({
  providedIn: 'root'
})
export class AuthStoreService {

  private user$ = new BehaviorSubject<User | null>(null);

  readonly userState$ = this.user$.asObservable();

  setUser(user: User | null) {
    this.user$.next(user);
  }

  get user(): User | null {
    return this.user$.value;
  }

  get isAuthenticated$(): Observable<boolean> {
    return this.userState$.pipe(map(u => !!u));
  }
}
