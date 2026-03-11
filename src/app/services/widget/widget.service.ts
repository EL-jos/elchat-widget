import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
import { WidgetSetting } from 'src/app/models/widget-settings/widget-settings';
import { environment } from 'src/environments/environment';
import { v4 as uuidv4Lib } from 'uuid';

interface WidgetSettingsResponse {
  success: boolean;
  config: any; // ou WidgetSetting si tu veux plus de précision
}

@Injectable({ providedIn: 'root' })
export class WidgetService {
  public siteIdSubject = new BehaviorSubject<string | null>(null);
  siteId$ = this.siteIdSubject.asObservable();
  private visitorUUIDKey = 'visitor_uuid';
  private api = environment.serveur.url;

  // ⚡ Nouveau : BehaviorSubject pour le WidgetSetting
  private settingSubject = new BehaviorSubject<WidgetSetting | null>(null);
  setting$ = this.settingSubject.asObservable();

  constructor(private http: HttpClient) { }

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

  getWidgetSettings(siteId: string): Observable<WidgetSetting> {
    return this.http.get<WidgetSetting>(`${this.api}/widget/config/${siteId}`);
  }

  // ==========================================
  // 🔹 Méthode pour récupérer le WidgetSetting
  // ==========================================
  loadWidgetSettings(siteId: string): Observable<WidgetSetting> {
  return this.http.get<WidgetSettingsResponse>(`${this.api}/widget/config/${siteId}`).pipe(
    tap(res => {
      if (res.success && res.config) {
        const settings = WidgetSetting.fromJson(res.config);
        this.settingSubject.next(settings);
      } else {
        this.settingSubject.next(null);
      }
    }),
    // ⚡ retourne l'instance WidgetSetting
    map(res => WidgetSetting.fromJson(res.config))
  );
}
}
