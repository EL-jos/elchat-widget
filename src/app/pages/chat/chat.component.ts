import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Conversation } from 'src/app/models/conversation/conversation';
import { ChatService } from 'src/app/services/chat/chat.service';
import { LastConversationService } from 'src/app/services/last-conversation/last-conversation.service';
import { MercureService } from 'src/app/services/mercure/mercure.service';
import { WidgetService } from 'src/app/services/widget/widget.service';
// Ajoute ces imports avec les autres
import { VoiceService, VoiceState } from '../../services/voice/voice.service';
import { Subscription } from 'rxjs';
//import { v4 as uuidv4 } from 'uuid';
import { v4 as uuidv4Lib } from 'uuid';
import { MatSnackBar } from '@angular/material/snack-bar';
import { VisitorService } from 'src/app/services/visitor/visitor.service';
import { AuthService } from 'src/app/services/auth/auth.service';
import { WidgetSetting } from 'src/app/models/widget-settings/widget-settings';
import { Cta } from 'src/app/models/cta/cta';
import { Message } from 'src/app/models/message/message';
import { Entity } from 'src/app/models/entity/entity';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewInit {

  isChatStarted = false;
  private firstBotMessageHandled = false;

  conversations: Conversation[] = [];
  conversationId: string = "";
  error?: string;
  private mercureSub?: any;

  selectedConversation?: Conversation;
  // 🔹 modèle pour le textarea
  messageContent: string = '';
  siteId: string = '';  //'f453c3df-7691-4165-9398-b366d6ddb9db'; // 🔹 Remplace par le site actif ou récupère-le via route/service
  hasConversations: boolean = false; // 🔹 Pour gérer l'affichage des écrans
  hasMessages: boolean = false; // 🔹 Pour gérer l'affichage des écrans

  // 🔹 Voice API
  voiceState: VoiceState = { isListening: false, isSpeaking: false };
  voiceSubscription?: Subscription;
  visualizerCanvas?: HTMLCanvasElement;
  isVisualizerActive = false;
  // 🔹 Référence pour les boutons TTS (Map pour gérer plusieurs messages)
  speakingMessageIds = new Set<string>();

  // Ajoute dans la classe
  @ViewChild('visualizerCanvas') visualizerCanvasRef?: ElementRef<HTMLCanvasElement>;

  settings: WidgetSetting = new WidgetSetting();

  constructor(
    private route: ActivatedRoute,
    private chatService: ChatService,
    private mercure: MercureService,
    private widgetService: WidgetService,
    private lastConvService: LastConversationService,
    public voiceService: VoiceService,
    private snackBar: MatSnackBar,   // 🔹 Ajout
    private visitorService: VisitorService, // 🔹 Ajout
    private authService: AuthService // 🔹 Ajout pour vérifier si visiteur ou utilisateur connecté
  ) { }

  ngOnInit(): void {

    this.conversationId = this.route.snapshot.params['conversation_id'];

    const initialSiteId = this.widgetService.getSiteId();
    if (initialSiteId) {
      //console.log("RECUPERATION DU SITE ID A PARTIR DE WIDGET SERVICE");

      this.handleSiteId(initialSiteId);
    }

    this.widgetService.siteId$.subscribe(id => {
      if (id && id !== this.siteId) {
        //console.log("RECUPERATION DU SITE ID A PARTIR DE WIDGET SERVICE AVEC SUJET");
        this.handleSiteId(id);
      }
    });

    // 🔹 S’abonner aux changements de settings
    this.widgetService.setting$.subscribe(settings => {
      if (settings) this.settings = settings;
    });

    // 🔹 Initialisation Voice API
    this.initVoice();
    if (!this.voiceService.isSupported()) {
      console.warn('Voice API non supportée sur ce navigateur');
      // Optionnel : afficher un message discret dans l'UI
    }
  }

  // 🔹 Méthode pour centraliser le traitement du siteId
  private handleSiteId(siteId: string) {
    this.siteId = siteId;

    let visitorUUID: string | undefined;
    if (!this.authService.isAuthenticated) {
      visitorUUID = this.widgetService.getVisitorUUID();
    }

    // Charger la conversation
    if (this.authService.isAuthenticated) {
      if (this.conversationId) {
        this.loadMessage(this.conversationId, this.siteId);
      }
    } else {
      const lastConvId = this.lastConvService.getLastConversationId(this.siteId, visitorUUID);
      if (lastConvId) {
        this.loadMessage(lastConvId, this.siteId, visitorUUID);
      }
    }

    // Charger le widget setting
    this.widgetService.loadWidgetSettings(this.siteId).subscribe();
  }

  // Modifie ngOnInit ou ajoute ngAfterViewInit
  ngAfterViewInit(): void {
    if (this.visualizerCanvasRef?.nativeElement) {
      this.setVisualizerCanvas(this.visualizerCanvasRef.nativeElement);
    }
  }

  private initVoice(): void {
    // Souscription aux changements d'état voice
    this.voiceSubscription = this.voiceService.state$.subscribe(state => {
      //console.log(state);

      this.voiceState = state;

      // Gérer les erreurs
      if (state.error) {
        this.error = state.error;
        setTimeout(() => this.error = undefined, 3000);
      }

      // Si STT terminé avec transcript → envoyer le message
      if (state.transcript && !state.isListening) {
        this.handleVoiceTranscript(state.transcript);
      }
    });
  }

  // Ajoute cette méthode dans la classe
  private handleVoiceTranscript(text: string): void {
    //console.log(text);

    if (!text?.trim()) return;

    //✅ Option 3 : Ajouter un saut de ligne si texte existant
    this.messageContent = this.messageContent
      ? `${this.messageContent}\n${text}`
      : text;

    // Reset du transcript pour éviter les doublons
    this.voiceService.resetTranscript();
    // ✅ Scroll explicite après envoi vocal
    setTimeout(() => this.scrollToBottom(), 100);
  }

  // 🔹 TTS : Lire un message
  playMessageTTS(messageId: string, text: string): void {
    if (this.voiceService.isSpeaking() && this.speakingMessageIds.has(messageId)) {
      // Stop si on clique sur le même message en cours de lecture
      this.voiceService.cancelSpeech();
      this.speakingMessageIds.delete(messageId);
      return;
    }

    // Stop toute autre lecture
    this.voiceService.cancelSpeech();
    this.speakingMessageIds.clear();

    // Démarrer la lecture
    this.speakingMessageIds.add(messageId);
    this.voiceService.speak(text, () => {
      this.speakingMessageIds.delete(messageId);
    });
  }

  // 🔹 STT : Démarrer/Arrêter l'écoute
  toggleVoiceInput(): void {
    if (this.voiceState.isListening) {
      this.stopVoiceInput();
    } else {
      this.startVoiceInput();
    }
  }

  private async startVoiceInput(): Promise<void> {
    // ✅ Éviter les doublons
    if (this.isVisualizerActive || this.voiceState.isListening) {
      return;
    }
    try {
      // Démarrer le visualizer si canvas disponible
      if (this.visualizerCanvas) {
        this.isVisualizerActive = true;
        await this.voiceService.startVisualizer(this.visualizerCanvas);
      }

      // Démarrer la reconnaissance
      await this.voiceService.startListening((text) => {
        // Le transcript sera géré via l'observable
      });
    } catch (err) {
      this.error = typeof err === 'string' ? err : 'Erreur microphone';
      this.stopVoiceInput();
    }
  }

  private stopVoiceInput(): void {
    // ✅ 1. D'abord mettre à jour l'UI localement (immédiat)
    this.isVisualizerActive = false;
    // ✅ 2. Puis arrêter les services
    this.voiceService.stopListening(); // Déclenchera isListening=false via observable
    this.voiceService.stopVisualizer();

    // ✅ 3. Optionnel : forcer un petit délai pour s'assurer que tout est sync
    setTimeout(() => {
      if (!this.voiceState.isListening) {
        this.isVisualizerActive = false;
      }
    }, 100);
  }

  // 🔹 Setter pour le canvas (appelé depuis le template via #ViewChild ou reference)
  // Cette méthode devient optionnelle car @ViewChild gère déjà le canvas
  // Mais si tu la gardes, rends-la privée :
  private setVisualizerCanvas(canvas: HTMLCanvasElement | null): void {
    this.visualizerCanvas = canvas ?? undefined;
  }

  loadMessage(conversationId: string, siteId: string, visitorUUID?: string): void {
    this.chatService.getUserMessages(conversationId, siteId, visitorUUID).subscribe({
      next: (conversation) => {

        //console.log(conversation);


        this.selectedConversation = conversation;

        if (conversation.messages.length > 0) {
          this.isChatStarted = true; // ✅ IMPORTANT
          this.selectConversation(this.selectedConversation); // 🔥 ACTIVE MERCURE
          this.scrollToBottom();
        }

      },
      error: () => {
        this.error = 'Unable to load messages';
      }
    });
  }


  onSubmit(chatForm: NgForm): void {
    if (!this.messageContent.trim()) return;

    this.sendMessage(this.messageContent);

    // Réinitialiser le formulaire et le modèle
    this.messageContent = '';
    chatForm.resetForm();
  }

  /**
   * Envoi d'un message utilisateur et affichage du loading pour l'IA
   */
  sendMessage(content: string): void {
    if (!content.trim()) return;

    const visitorUUID = !this.authService.isAuthenticated
      ? this.widgetService.getVisitorUUID()
      : undefined;

    const isNewConversation = !this.selectedConversation;
    const TEMP_ID = 'temp';

    // 🔹 reset du flag bot pour nouvelle conversation
    this.firstBotMessageHandled = false;

    // 🔥 créer une conversation locale immédiatement si nouvelle
    if (isNewConversation) {
      this.selectedConversation = {
        id: TEMP_ID,
        messages: [],
        created_at: new Date().toISOString(),
        site_id: this.siteId
      };
      this.isChatStarted = true;
    }

    // ➕ ajouter le message de l'utilisateur
    this.selectedConversation?.messages.push({
      id: this.uuidv4(),
      content,
      role: 'user',
      created_at: new Date().toISOString(),
      displayed_ctas: [],
      entities: []
    });

    // ➕ ajouter le loading IA
    this.selectedConversation?.messages.push({
      id: 'loading',
      content: 'Analysing your request...',
      role: 'bot',
      created_at: new Date().toISOString(),
      displayed_ctas: [],
      entities: []
    });

    this.scrollToBottom();

    // ID pour le backend : null si nouvelle conversation
    const conversationId =
      this.selectedConversation?.id === TEMP_ID
        ? null
        : this.selectedConversation?.id;

    this.chatService.sendMessage(conversationId as any, content, this.siteId, visitorUUID)
      .subscribe({
        next: (res: any) => {

          //console.log(res);


          // 🔹 nouvelle conversation → assigner ID réel
          if (this.selectedConversation?.id === TEMP_ID) {
            this.selectedConversation.id = res.conversation_id;

            // 🔹 abonnement Mercure maintenant possible
            this.selectConversation(this.selectedConversation);

            // ⚠️ fallback HTTP : si Mercure répond trop vite
            if (!this.firstBotMessageHandled) {
              this.firstBotMessageHandled = true;

              this.removeLoading();

              let dataMessage = {
                id: this.uuidv4(),
                content: res.answer,
                role: 'bot',
                created_at: new Date().toISOString(),
                displayed_ctas: res.ctas,
                entities: res.entities
              };

              this.selectedConversation.messages.push(Message.fromJson(dataMessage));

              //console.log(this.selectedConversation.messages);


              this.scrollToBottom();
            }
          }

          // 🔹 sinon pour conversation existante : le bot arrive via Mercure
          this.removeLoading();
          this.scrollToBottom();
        },
        error: () => {
          this.removeLoading();
        }
      });

    if (this.selectedConversation?.id && this.siteId) {
      const visitorUUID = !this.authService.isAuthenticated
        ? this.widgetService.getVisitorUUID()
        : undefined;
      this.lastConvService.setLastConversationId(this.siteId, this.selectedConversation.id, visitorUUID);
    }
  }

  private removeLoading() {
    this.selectedConversation!.messages =
      this.selectedConversation!.messages.filter(m => m.id !== 'loading');
  }

  selectConversation(conv: Conversation) {
    this.selectedConversation = conv;
    const visitorUUID = this.widgetService.getVisitorUUID();
    if (this.siteId && conv?.id) {
      this.lastConvService.setLastConversationId(this.siteId, conv.id, visitorUUID);
    }

    if (this.mercureSub) {
      this.mercureSub.unsubscribe();
    }

    const topic = `/sites/${this.siteId}/conversations/${conv.id}`;

    this.mercureSub = this.mercure.subscribe<any>(topic).subscribe({
      next: (event) => {

        //console.log(event);


        if (!this.selectedConversation) return;
        if (event.conversation_id !== this.selectedConversation.id) return;

        // éviter doublon user
        if (
          event.type === 'user_message' &&
          this.selectedConversation.messages.some(
            m => m.role === 'user' && m.content === event.content
          )
        ) {
          return;
        }

        if (event.type === 'bot_message') {
          this.firstBotMessageHandled = true;
          this.removeLoading();
        }

        let dataMessage = {
          id: this.uuidv4(),
          content: event.content,
          role: event.type === 'bot_message' ? 'bot' : 'user',
          created_at: event.created_at,
          displayed_ctas: event.ctas ? event.ctas : [],
          entities: event.entities ? event.entities : []
        };

        this.selectedConversation.messages.push(Message.fromJson(dataMessage));

        //console.log(this.selectedConversation.messages);


        this.scrollToBottom();
      },
      error: err => console.error('Mercure error:', err)
    });
  }

  scrollToBottom() {
    setTimeout(() => {
      const chat = document.querySelector('.el-chat-messages');
      if (chat) chat.scrollTop = chat.scrollHeight;
    }, 0);
  }

  ngOnDestroy(): void {
    // 🔹 Cleanup
    if (this.mercureSub) this.mercureSub.unsubscribe();
    // 🔹 Cleanup Voice API (AJOUTER)
    if (this.voiceSubscription) this.voiceSubscription.unsubscribe();
    this.voiceService.cleanup();
  }

  startNewChat(): void {
    // stop mercure sur l'ancienne conversation
    if (this.mercureSub) {
      this.mercureSub.unsubscribe();
      this.mercureSub = undefined;
    }

    if (this.selectedConversation?.id) {
      this.lastConvService.clearLastConversation(this.siteId);
    }

    // ✅ Ajouter ce cleanup
    this.stopVoiceInput();
    this.speakingMessageIds.clear();
    this.voiceService.cancelSpeech();

    // reset état
    this.selectedConversation = undefined;
    this.conversationId = '';
    this.messageContent = '';
    this.isChatStarted = false;

  }

  private uuidv4(): string {
    try {
      // Tester si le navigateur supporte crypto.getRandomValues
      if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
        throw new Error('Crypto non supporté');
      }
      return uuidv4Lib();
    } catch (err) {
      // Afficher SnackBar pour inciter à mettre à jour le navigateur
      this.snackBar.open(
        'Pour utiliser pleinement ELChat, merci de mettre à jour votre navigateur.',
        'Fermer',
        { duration: 5000 }
      );
      // Fallback : ID simple mais non sécurisé
      return 'fallback-' + Math.random().toString(36).substring(2, 10);
    }
  }

  formatMessage(content: string): string {
    if (!content) return '';

    // Ajoute un saut de ligne avant les listes si manquant
    content = content.replace(/\* /g, '\n* ');

    return content;
  }

  handleCta(cta: Cta) {

    if (cta.clicked) return;

    cta.clicked = true;

    switch (cta.action) {

      case 'open_url':
        window.open(cta.value, '_blank');
        break;

      case 'navigate':
        window.location.href = cta.value || '';
        break;

      case 'send_message':
        if (cta.value) {
          this.sendMessage(cta.value);
        }
        break;

      case 'email':
        window.location.href = `mailto:${cta.value}`;
        break;

      case 'phone':
        window.location.href = `tel:${cta.value}`;
        break;

      case 'whatsapp':
        window.open(`https://wa.me/${cta.value}`, '_blank');
        break;

      case 'open_form':
        console.log('open form', cta.value);
        break;

      case 'trigger_event':
        window.dispatchEvent(
          new CustomEvent(cta.value || 'cta-event')
        );
        break;
    }
  }

  openEntity(entity: Entity): void {
    if (!entity) return;

    switch (entity.type) {
      case 'product':
        // Ouvre le produit dans un nouvel onglet
        if (entity.url) {
          window.open(entity.url, '_blank');
        } else {
          this.snackBar.open('Lien produit indisponible', 'Fermer', { duration: 3000 });
        }
        break;

      case 'page':
        // Ouvre la page correspondante
        if (entity.url) {
          window.open(entity.url, '_blank');
        } else {
          this.snackBar.open('Lien page indisponible', 'Fermer', { duration: 3000 });
        }
        break;

      case 'document':
        if (entity.url) {
          // ouvre le document dans un nouvel onglet
          window.open(entity.url, '_blank');
        } else if (entity.id) {
          // fallback : créer une URL interne vers /document/:id
          window.open(`/document/${entity.url}`, '_blank');
        } else {
          this.snackBar.open('Document indisponible', 'Fermer', { duration: 3000 });
        }
        break;

      default:
        console.warn('Entity non gérée :', entity);
        this.snackBar.open('Type d’entité non supporté', 'Fermer', { duration: 3000 });
        break;
    }
  }

}

