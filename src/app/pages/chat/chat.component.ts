import { NgFor } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Conversation } from 'src/app/models/conversation/conversation';
import { Message } from 'src/app/models/message/message';
import { ChatService } from 'src/app/services/chat/chat.service';
import { MercureService } from 'src/app/services/mercure/mercure.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy {

  conversations: Conversation[] = [];
  error?: string;
  private mercureSub?: any;

  selectedConversation?: Conversation;
  // 🔹 modèle pour le textarea
  messageContent: string = '';
  siteId: string = 'f453c3df-7691-4165-9398-b366d6ddb9db'; // 🔹 Remplace par le site actif ou récupère-le via route/service

  constructor(private chatService: ChatService, private mercure: MercureService) { }

  ngOnInit(): void {
    this.loadConversations(this.siteId);
  }

  loadConversations(siteId: string): void {
    this.chatService.getUserConversations(siteId).subscribe({
      next: (convs) => {
        convs.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        this.conversations = convs;

        if (convs.length > 0) {
          this.selectConversation(convs[0]); // 🔥 ACTIVE MERCURE
        }
      },
      error: () => {
        this.error = 'Unable to load conversations';
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

 /*  loadConversations(siteId: string): void {
    this.chatService.getUserConversations(siteId).subscribe({
      next: (convs) => {
        console.log('✅ Conversations loaded:', convs);

        // 🔹 trier par date décroissante : les plus récentes en premier
        convs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        this.conversations = convs;

        // 🔹 sélectionner la conversation la plus récente
        if (convs.length > 0) {
          this.selectedConversation = convs[0];
          this.selectedConversation.messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          this.scrollToBottom(); // 🔹 scroll automatique à la fin de la conversation
          //this.selectConversation(convs[0]);
        }

      },
      error: (err) => {
        console.error('❌ Error loading conversations:', err);
        this.error = 'Impossible de charger les conversations';
      }
    });
  } */

  /**
   * Envoi d'un message utilisateur et affichage du loading pour l'IA
   */
  sendMessage(content: string): void {
    if (!this.selectedConversation || !content.trim()) return;

    const loadingMsg: Message = {
      id: 'loading',
      content: 'Analysing your request...',
      role: 'bot',
      created_at: new Date().toISOString()
    };

    this.selectedConversation.messages.push(loadingMsg);
    this.scrollToBottom();

    this.chatService.sendMessage(this.selectedConversation.id, content, this.siteId)
      .subscribe({
        next: (msg) => {
          this.removeLoading();
          this.selectedConversation!.messages.push(msg);
          this.scrollToBottom();
        },
        error: () => {
          this.removeLoading();
          this.selectedConversation!.messages.push({
            id: crypto.randomUUID(),
            content: 'Oops, something went wrong.',
            role: 'bot',
            created_at: new Date().toISOString()
          });
        }
      });
  }

  private removeLoading() {
    this.selectedConversation!.messages =
      this.selectedConversation!.messages.filter(m => m.id !== 'loading');
  }


  selectConversation(conv: Conversation) {
    this.selectedConversation = conv;

    if (this.mercureSub) {
      this.mercureSub.unsubscribe();
    }

    const topic = `/sites/${this.siteId}/conversations/${conv.id}`;

    this.mercureSub = this.mercure.subscribe<any>(topic).subscribe({
      next: (event) => {
        console.log(event);
        
        // 🔥 filtrer par conversation
        if (event.conversation_id !== conv.id) return;

        this.selectedConversation!.messages.push({
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


  /* selectConversation(conv: Conversation) {
    this.selectedConversation = conv;
    // 🔹 Se désabonner de l'ancien topic si nécessaire
    if (this.mercureSub) {
      this.mercureSub.unsubscribe();
    }

    // 🔹 S'abonner au topic de la conversation sélectionnée
    const topic = `http://localhost:8000/site/${this.siteId}/conversation/${conv.id}`;

    this.mercureSub = this.mercure.subscribe<Message>(topic).subscribe({
      next: (msg) => {
        this.selectedConversation!.messages.push(msg);
        this.scrollToBottom();
      },
      error: (err) => console.error('Mercure error:', err)
    });
  } */

  scrollToBottom() {
    setTimeout(() => {
      const chat = document.querySelector('.el-chat-messages');
      if (chat) chat.scrollTop = chat.scrollHeight;
    }, 100);
  }


  ngOnDestroy(): void {
    // 🔹 Cleanup
    if (this.mercureSub) this.mercureSub.unsubscribe();
  }
}

