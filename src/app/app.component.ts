import { Component, OnDestroy, OnInit } from '@angular/core';
import { WidgetService } from './services/widget/widget.service';
import { Router } from '@angular/router';
import { AuthService } from './services/auth/auth.service';
import { LastConversationService } from './services/last-conversation/last-conversation.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy{
  title = 'ELChat';
  loadingLastConversation = false;
  private siteIdSub?: Subscription;

  constructor(
    private widgetService: WidgetService,
    private authService: AuthService,
    private router: Router,
    private lastConvService: LastConversationService,
  ) { }
  
  closeWidget() {
    window.parent.postMessage(
      {
        source: 'elchat',
        type: 'CLOSE_WIDGET'
      },
      '*'
    );
  }

  ngOnInit(): void {

    // 1️⃣ Récupérer siteId depuis l'URL
    const urlParams = new URL(window.location.href).searchParams;
    const siteIdFromUrl = urlParams.get('site_id');
    console.log('[ELChat] siteId from URL:', siteIdFromUrl);

    // 2️⃣ Récupérer siteId depuis le postMessage
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || event.data.source !== 'elchat') return;

      if (event.data.type === 'SET_SITE_ID') {
        const siteIdFromMessage = event.data.siteId;
        console.log('[ELChat] siteId from widget postMessage:', siteIdFromMessage);

        // Choisir le siteId à utiliser
        const finalSiteId = siteIdFromUrl || siteIdFromMessage;
        if (!finalSiteId) {
          console.error('[ELChat] Aucun siteId disponible');
          return;
        }

        // Mettre à jour le service si différent
        if (this.widgetService.getSiteId() !== finalSiteId) {
          this.widgetService.setSiteId(finalSiteId);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // 3️⃣ Si URL contient déjà un siteId, l'utiliser immédiatement
    if (siteIdFromUrl) {
      this.widgetService.setSiteId(siteIdFromUrl);
    }

    // 4️⃣ Gestion connexion utilisateur + redirection dernière conversation
    this.siteIdSub = this.widgetService.siteId$.subscribe(siteId => {
      if (!siteId) return;

      if (!this.authService.isAuthenticated) {
        // Non connecté → redirection vers sign-in
        this.router.navigate(['/sign-in']);
        return;
      }

      // Utilisateur connecté → tenter de récupérer la dernière conversation
      this.loadingLastConversation = true;
      this.lastConvService.resolveLastConversation(siteId).subscribe(conv => {
        this.loadingLastConversation = false;
        if (conv) {
          this.router.navigate(['/chat', conv.id]);
        } else {
          // Pas de conversation récente → écran New Conversation
          this.router.navigate(['/conversations']);
        }
      });
    });
  }

  ngOnDestroy(): void {
    // 🔹 Cleanup
    if (this.siteIdSub) this.siteIdSub.unsubscribe();
  }
}
