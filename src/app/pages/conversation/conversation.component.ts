import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Conversation } from 'src/app/models/conversation/conversation';
import { ChatService } from 'src/app/services/chat/chat.service';
import { LastConversationService } from 'src/app/services/last-conversation/last-conversation.service';
import { WidgetService } from 'src/app/services/widget/widget.service';
// Ajoute ces imports avec les autres
import { VoiceService, VoiceState } from '../../services/voice/voice.service'; // ← Ajuste le chemin
import { ElementRef, ViewChild, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-conversation',
  templateUrl: './conversation.component.html',
  styleUrls: ['./conversation.component.css']
})
export class ConversationComponent implements OnInit, OnDestroy, AfterViewInit {

  conversations: Conversation[] = [];
  error?: string;
  private mercureSub?: any;

  selectedConversation?: Conversation;
  // 🔹 modèle pour le textarea
  messageContent: string = '';
  siteId: string = '';  //'f453c3df-7691-4165-9398-b366d6ddb9db'; // 🔹 Remplace par le site actif ou récupère-le via route/service
  hasConversations: boolean = false; // 🔹 Pour gérer l'affichage des écrans

  isChatStarted = false;
  isCreatingConversation = false;

  // 🔹 Voice API (STT uniquement)
  voiceState: VoiceState = { isListening: false, isSpeaking: false };
  voiceSubscription?: Subscription;
  visualizerCanvas?: HTMLCanvasElement;
  isVisualizerActive = false;

  // 🔹 Référence pour le canvas via @ViewChild
  @ViewChild('visualizerCanvas') visualizerCanvasRef?: ElementRef<HTMLCanvasElement>;

  private siteIdSub?: Subscription;

  constructor(
    private chatService: ChatService,
    private widgetService: WidgetService,
    private router: Router,
    private lastConvService: LastConversationService,
    public voiceService: VoiceService  // ← AJOUTER CETTE LIGNE
  ) { }

  ngOnInit(): void {
    const initialSiteId = this.widgetService.getSiteId();
    if (initialSiteId) {
      this.siteId = initialSiteId;
      this.loadConversations(this.siteId);
    }

    this.siteIdSub = this.widgetService.siteId$.subscribe(id => {
      if (id && id !== this.siteId) {
        this.siteId = id;
        this.loadConversations(this.siteId);
      }
    });

    // 🔹 Initialisation Voice API (AJOUTER à la fin de ngOnInit)
    this.initVoice();
  }

  // Ajoute cette méthode dans la classe
  ngAfterViewInit(): void {
    if (this.visualizerCanvasRef?.nativeElement) {
      this.setVisualizerCanvas(this.visualizerCanvasRef.nativeElement);
    }
  }

  // Ajoute cette méthode privée
  private initVoice(): void {
    this.voiceSubscription = this.voiceService.state$.subscribe(state => {
      this.voiceState = state;

      // Gérer les erreurs
      if (state.error) {
        this.error = state.error;
        setTimeout(() => this.error = undefined, 3000);
      }

      // Si STT terminé avec transcript → remplir le textarea
      if (state.transcript && !state.isListening) {
        this.handleVoiceTranscript(state.transcript);
      }
    });
  }

  // Ajoute cette méthode privée
  private handleVoiceTranscript(text: string): void {
    if (!text?.trim()) return;

    // Remplir le textarea avec le texte reconnu
    this.messageContent = text;

    // Optionnel : auto-envoyer le message (décommente si souhaité)
    // this.autoSendVoiceMessage(text);

    // Reset du transcript
    this.voiceService.resetTranscript();
  }

  // Optionnel : méthode pour auto-envoyer après reconnaissance
  private autoSendVoiceMessage(text: string): void {
    if (!text?.trim()) return;

    const chatForm = { resetForm: () => { } } as any; // Dummy pour onSubmit
    this.messageContent = text;
    this.onSubmit(chatForm);
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
    // Éviter les doublons
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
        // Géré via observable
      });
    } catch (err) {
      this.error = typeof err === 'string' ? err : 'Erreur microphone';
      this.stopVoiceInput();
    }
  }

  private stopVoiceInput(): void {
    this.voiceService.stopListening();
    this.voiceService.stopVisualizer();
    this.isVisualizerActive = false;
  }

  // 🔹 Setter pour le canvas
  private setVisualizerCanvas(canvas: HTMLCanvasElement | null): void {
    this.visualizerCanvas = canvas ?? undefined;
  }

  loadConversations(siteId: string): void {
    this.chatService.getUserConversations(siteId).subscribe({
      next: (convs) => {
        convs.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        this.conversations = convs;
        this.hasConversations = convs.length > 0;

        // 🔹 si aucune conversation → écran New conversation
        if (!this.hasConversations) {
          this.isChatStarted = false;
          return;
        }

        // 🔹 sinon on sélectionne la plus récente
        this.selectConversation(convs[0]);
      },
      error: () => {
        this.error = 'Unable to load conversations';
      }
    });
  }



  selectConversation(conv: Conversation) {
    this.selectedConversation = conv;
    if (this.siteId && conv?.id) {
      this.lastConvService.setLastConversationId(this.siteId, conv.id);
    }
  }

  ngOnDestroy(): void {
    // 🔹 Cleanup
    if (this.mercureSub) this.mercureSub.unsubscribe();
    if (this.siteIdSub) this.siteIdSub.unsubscribe();
    // 🔹 Cleanup Voice API (AJOUTER)
    if (this.voiceSubscription) this.voiceSubscription.unsubscribe();
    this.voiceService.cleanup();
  }

  onSubmit(chatForm: NgForm): void {
    if (!this.messageContent.trim()) return;

    const content = this.messageContent;
    this.messageContent = '';
    chatForm.resetForm();

    // 🔥 feedback immédiat
    this.isCreatingConversation = true;

    // 🔥 envoi SANS conversation_id
    this.chatService.sendMessage(null as any, content, this.siteId)
      .subscribe({
        next: (res: any) => {
          // 🔁 redirection vers ChatComponent
          this.router.navigate(['/chat', res.conversation_id]);
        },
        error: () => {
          this.isCreatingConversation = false;
          // TODO : afficher erreur UX
        }
      });
  }

  startNewChat(): void {
    console.log("bonjour");
    
    // stop mercure sur l'ancienne conversation
    if (this.mercureSub) {
      console.log("mercure unsub");
      this.mercureSub.unsubscribe();
      this.mercureSub = undefined;
    }

    if (this.selectedConversation?.id) {
      console.log("dans last conv service");
      this.lastConvService.clearLastConversation(this.siteId);
    }

    console.log("après last conv service");
    // ✅ Ajouter ce cleanup voice
    this.stopVoiceInput();
    
    // reset état
    this.selectedConversation = undefined;
    this.messageContent = '';
    this.isChatStarted = false;

  }
  
}