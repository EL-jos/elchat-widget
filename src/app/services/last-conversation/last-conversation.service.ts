import { Injectable } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { Conversation } from 'src/app/models/conversation/conversation';
import { ChatService } from '../chat/chat.service';

@Injectable({
  providedIn: 'root'
})
export class LastConversationService {

  constructor(private chatService: ChatService) { }

  private getKey(siteId: string) {
    return `last_conversation_${siteId}`;
  }

  getLastConversationId(siteId: string): string | null {
    return localStorage.getItem(this.getKey(siteId));
  }

  setLastConversationId(siteId: string, conversationId: string) {
    localStorage.setItem(this.getKey(siteId), conversationId);
  }

  clearLastConversation(siteId: string) {
    localStorage.removeItem(this.getKey(siteId));
  }

  /**
   * Retourne la conversation valide si possible (timezone-safe et fallback)
   */
  resolveLastConversation(siteId: string): Observable<Conversation | null> {
    const storedId = this.getLastConversationId(siteId);

    const isToday = (dateStr: string) => {
      const today = new Date();
      const msgDate = new Date(dateStr);
      return today.getUTCFullYear() === msgDate.getUTCFullYear() &&
        today.getUTCMonth() === msgDate.getUTCMonth() &&
        today.getUTCDate() === msgDate.getUTCDate();
    };

    if (storedId) {
      return this.chatService.getUserMessages(storedId, siteId).pipe(
        map(conv => {
          const lastMsg = conv.messages[conv.messages.length - 1];
          if (!lastMsg || !isToday(lastMsg.created_at)) {
            this.clearLastConversation(siteId);
            return null;
          }
          return conv;
        }),
        catchError(() => {
          this.clearLastConversation(siteId);
          return of(null);
        })
      );
    }

    // Fallback → récupérer la conversation la plus récente du jour
    return this.chatService.getUserConversations(siteId).pipe(
      map(convs => {
        const recentConv = convs
          .sort((a, b) => {
            const aLast = a.messages[a.messages.length - 1]?.created_at || '';
            const bLast = b.messages[b.messages.length - 1]?.created_at || '';
            return new Date(bLast).getTime() - new Date(aLast).getTime();
          })
          .find(conv => {
            const lastMsg = conv.messages[conv.messages.length - 1];
            return lastMsg && isToday(lastMsg.created_at);
          });

        if (recentConv) {
          this.setLastConversationId(siteId, recentConv.id);
          return recentConv;
        }

        return null;
      }),
      catchError(() => of(null))
    );
  }
}