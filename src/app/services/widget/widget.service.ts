import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { v4 as uuidv4Lib } from 'uuid';

@Injectable({ providedIn: 'root' })
export class WidgetService {
  public siteIdSubject = new BehaviorSubject<string | null>(null);
  siteId$ = this.siteIdSubject.asObservable();
  private visitorUUIDKey = 'visitor_uuid';

  setSiteId(id: string) {
    this.siteIdSubject.next(id);
  }

  getSiteId(): string | null {
    return this.siteIdSubject.value;
  }

  getVisitorUUID(): string {
    let uuid = localStorage.getItem(this.visitorUUIDKey);
    if (!uuid) {
      uuid = this.uuidv4(); // navigateur moderne
      localStorage.setItem(this.visitorUUIDKey, uuid);
    }
    return uuid;
  }

  /**
   * Définit un visitorUUID explicitement
   */
  setVisitorUUID(uuid: string) {
    localStorage.setItem(this.visitorUUIDKey, uuid);
  }

  private uuidv4(): string {
    try {
      // Tester si le navigateur supporte crypto.getRandomValues
      if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
        throw new Error('Crypto non supporté');
      }
      return uuidv4Lib();
    } catch (err) {
      
      // Fallback : ID simple mais non sécurisé
      return 'fallback-' + Math.random().toString(36).substring(2, 10);
    }
  }
}
