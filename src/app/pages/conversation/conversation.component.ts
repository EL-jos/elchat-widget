import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Conversation } from 'src/app/models/conversation/conversation';
import { ChatService } from 'src/app/services/chat/chat.service';
import { LastConversationService } from 'src/app/services/last-conversation/last-conversation.service';
import { WidgetService } from 'src/app/services/widget/widget.service';

@Component({
  selector: 'app-conversation',
  templateUrl: './conversation.component.html',
  styleUrls: ['./conversation.component.css']
})
export class ConversationComponent implements OnInit, OnDestroy {

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

  private siteIdSub?: Subscription;

  constructor(
    private chatService: ChatService,
    private widgetService: WidgetService,
    private router: Router,
    private lastConvService: LastConversationService
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

    console.log(this.siteId);
    
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
    // reset état
    this.selectedConversation = undefined;
    this.messageContent = '';
    this.isChatStarted = false;

  }
  
}