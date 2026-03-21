import { Component, OnDestroy, OnInit } from '@angular/core';
import { WidgetService } from './services/widget/widget.service';
import { Router } from '@angular/router';
import { AuthService } from './services/auth/auth.service';
import { LastConversationService } from './services/last-conversation/last-conversation.service';
import { Subscription, EMPTY } from 'rxjs';
import { distinctUntilChanged, filter, switchMap, finalize } from 'rxjs/operators';
import { v4 as uuidv4Lib } from 'uuid';
import { VisitorService } from './services/visitor/visitor.service';

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
    private visitorService: VisitorService
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

    // 1️⃣ Récupérer siteId depuis le postMessage
    window.addEventListener('message', this.handleMessage);

    // 2️⃣ Récupérer siteId depuis l'URL
    const urlParams = new URL(window.location.href).searchParams;
    const siteIdFromUrl = urlParams.get('site_id');
    // 3️⃣ Si URL contient déjà un siteId, l'utiliser immédiatement
    if (siteIdFromUrl) {
      console.log('[ELChat] siteId from URL:', siteIdFromUrl);
      this.widgetService.setSiteId(siteIdFromUrl);
    }

    // 3.1️⃣ Récupérer ou créer visitorUUID pour les visiteurs anonymes
    let visitorUUID = localStorage.getItem('visitor_uuid');
    if (!visitorUUID) {
      visitorUUID = this.uuidv4(); // ou uuidv4Lib() si tu veux la compatibilité plus large
      this.widgetService.setVisitorUUID(visitorUUID);
    }
    this.widgetService.setVisitorUUID(visitorUUID);

    // 4️⃣ Gestion connexion utilisateur + redirection dernière conversation (version optimisée avec switchMap) avec Subscriber sur siteId pour gérer la connexion et le dernier message
    this.siteIdSub = this.widgetService.siteId$.pipe(
      filter((siteId): siteId is string => !!siteId), // ne continuer que si siteId est défini
      distinctUntilChanged(), // éviter les appels redondants si siteId ne change pas
      switchMap((siteId: string) => {

        const visitorUUID = this.widgetService.getVisitorUUID();

        if (this.authService.isAuthenticated) {
          // utilisateur connecté
          this.loadingLastConversation = true;
          return this.lastConvService.resolveLastConversation(siteId).pipe(
            finalize(() => this.loadingLastConversation = false)
          );
        } else {
          // visiteur anonyme
          this.loadingLastConversation = true;
          return this.visitorService.initVisitor(siteId, visitorUUID).pipe(
            switchMap(() => {

              this.loadingLastConversation = true;
              return this.lastConvService.resolveLastConversation(siteId, visitorUUID);

            }),
            finalize(() => this.loadingLastConversation = false)
          );
        }

      })
    ).subscribe(conv => {
      //console.log("RESULTAT DE CONV: ", conv);
      
      if (!conv) {
        if (this.authService.isAuthenticated) {
          this.router.navigate(['/conversations']);
        } else {
          this.router.navigate(['/conversations']); // nouvelle conversation pour visitor
        }
      } else {
        this.router.navigate(['/chat', conv.id]);
      }
    });


    this.widgetService.siteIdSubject.next("1e0d17be-c7ef-4713-9082-3e6b2845afc6"); // déclencher la logique de connexion dès que le siteId est disponible (postMessage ou URL)
  }

  ngOnDestroy(): void {
    // 🔹 Cleanup
    if (this.siteIdSub) this.siteIdSub.unsubscribe();
    window.removeEventListener('message', this.handleMessage);
  }

  // 2️⃣ Listener postMessage
  private handleMessage = (event: MessageEvent) => {
    if (!event.data || event.data.source !== 'elchat') return;

    if (event.data.type === 'SET_SITE_ID') {
      const siteIdFromMessage = event.data.siteId;
      if (siteIdFromMessage && this.widgetService.getSiteId() !== siteIdFromMessage) {
        console.log('[ELChat] siteId from postMessage:', siteIdFromMessage);
        this.widgetService.setSiteId(siteIdFromMessage);
      }
    }
  };

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
