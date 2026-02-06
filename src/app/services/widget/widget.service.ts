import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WidgetService {
  private siteIdSubject = new BehaviorSubject<string | null>(null);
  siteId$ = this.siteIdSubject.asObservable();

  setSiteId(id: string) {
    this.siteIdSubject.next(id);
  }

  getSiteId(): string | null {
    return this.siteIdSubject.value;
  }
}
