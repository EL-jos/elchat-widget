import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Conversation } from 'src/app/models/conversation/conversation';
import { Message } from 'src/app/models/message/message';
import { ChatService } from 'src/app/services/chat/chat.service';
import { ConversationService } from 'src/app/services/conversation/conversation.service';
import { MercureService } from 'src/app/services/mercure/mercure.service';
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



  constructor(private chatService: ChatService, private widgetService: WidgetService, private router: Router) { }

  ngOnInit(): void {
    const initialSiteId = this.widgetService.getSiteId();
    if (initialSiteId) {
      this.siteId = initialSiteId;
      this.loadConversations(this.siteId);
    }

    this.widgetService.siteId$.subscribe(id => {
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
  }

  ngOnDestroy(): void {
    // 🔹 Cleanup
    if (this.mercureSub) this.mercureSub.unsubscribe();
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

  
}