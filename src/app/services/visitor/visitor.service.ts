import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { v4 as uuidv4Lib } from 'uuid';
import { environment } from '../../../environments/environment';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class VisitorService {
  private api = environment.serveur.url;

  constructor(private http: HttpClient) { }

  initVisitor(siteId: string, visitorUUID: string): Observable<{ visitor_id: string }> {
    return this.http.post<{ visitor_id: string }>(`${this.api}/widget/visitor/init`, {
      site_id: siteId,
      visitor_uuid: visitorUUID
    });
  }
}
