import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
@Injectable({
  providedIn: 'root'
})
export class MercureService {

  constructor(private zone: NgZone) { }

  subscribe<T>(topic: string): Observable<T> {
    return new Observable<T>(observer => {

      const url = new URL(environment.serveur.mercureHub);
      url.searchParams.append('topic', topic);

      const eventSource = new EventSource(url.toString());

      eventSource.onmessage = (event) => {
        this.zone.run(() => {
          observer.next(JSON.parse(event.data) as T);
        });
      };

      eventSource.onerror = (error) => {
        // ⚠️ NORMAL avec SSE (refresh, navigation, reconnexion)
        console.warn('Mercure connection interrupted (normal)', error);

        // ❌ ne PAS faire observer.error()
        // ❌ ne PAS fermer EventSource ici
        // EventSource va se reconnecter tout seul
      };

      return () => {
        eventSource.close();
      };
    });
  }
}

