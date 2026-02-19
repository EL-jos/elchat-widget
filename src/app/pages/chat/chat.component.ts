import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Conversation } from 'src/app/models/conversation/conversation';
import { ChatService } from 'src/app/services/chat/chat.service';
import { LastConversationService } from 'src/app/services/last-conversation/last-conversation.service';
import { MercureService } from 'src/app/services/mercure/mercure.service';
import { WidgetService } from 'src/app/services/widget/widget.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy {

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

  constructor(
    private route: ActivatedRoute,
    private chatService: ChatService,
    private mercure: MercureService,
    private widgetService: WidgetService,
    private lastConvService: LastConversationService
  ) { }

  ngOnInit(): void {

    this.conversationId = this.route.snapshot.params['conversation_id'];

    const initialSiteId = this.widgetService.getSiteId();
    if (initialSiteId) {
      this.siteId = initialSiteId;
      this.loadMessage(this.conversationId, this.siteId);
    }

    this.widgetService.siteId$.subscribe(id => {
      if (id && id !== this.siteId) {
        this.siteId = id;
        if (this.siteId && this.conversationId) {
          this.loadMessage(this.conversationId, this.siteId);
        }
      }
    });

  }

  loadMessage(conversationId: string, siteId: string) {
    this.chatService.getUserMessages(conversationId, siteId).subscribe({
      next: (conversation) => {

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
      id: crypto.randomUUID(),
      content,
      role: 'user',
      created_at: new Date().toISOString()
    });

    // ➕ ajouter le loading IA
    this.selectedConversation?.messages.push({
      id: 'loading',
      content: 'Analysing your request...',
      role: 'bot',
      created_at: new Date().toISOString()
    });

    this.scrollToBottom();

    // ID pour le backend : null si nouvelle conversation
    const conversationId =
      this.selectedConversation?.id === TEMP_ID
        ? null
        : this.selectedConversation?.id;

    this.chatService.sendMessage(conversationId as any, content, this.siteId)
      .subscribe({
        next: (res: any) => {

          // 🔹 nouvelle conversation → assigner ID réel
          if (this.selectedConversation?.id === TEMP_ID) {
            this.selectedConversation.id = res.conversation_id;

            // 🔹 abonnement Mercure maintenant possible
            this.selectConversation(this.selectedConversation);

            // ⚠️ fallback HTTP : si Mercure répond trop vite
            if (!this.firstBotMessageHandled) {
              this.firstBotMessageHandled = true;

              this.removeLoading();
              this.selectedConversation.messages.push({
                id: crypto.randomUUID(),
                content: res.answer,
                role: 'bot',
                created_at: new Date().toISOString()
              });

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
      this.lastConvService.setLastConversationId(this.siteId, this.selectedConversation.id);
    }
  }

  private removeLoading() {
    this.selectedConversation!.messages =
      this.selectedConversation!.messages.filter(m => m.id !== 'loading');
  }

  selectConversation(conv: Conversation) {
    this.selectedConversation = conv;
    if (this.siteId && conv?.id) {
      this.lastConvService.setLastConversationId(this.siteId, conv.id);
    }

    if (this.mercureSub) {
      this.mercureSub.unsubscribe();
    }

    const topic = `/sites/${this.siteId}/conversations/${conv.id}`;

    this.mercureSub = this.mercure.subscribe<any>(topic).subscribe({
      next: (event) => {

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

        this.selectedConversation.messages.push({
          id: crypto.randomUUID(),
          content: event.content,
          role: event.type === 'bot_message' ? 'bot' : 'user',
          created_at: event.created_at
        });

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

    // reset état
    this.selectedConversation = undefined;
    this.conversationId = '';
    this.messageContent = '';
    this.isChatStarted = false;

  }

}

