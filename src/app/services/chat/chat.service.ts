import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Conversation } from 'src/app/models/conversation/conversation';
import { Message } from 'src/app/models/message/message';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private api = environment.serveur.url;

  constructor(private http: HttpClient) { }

  /**
   * Récupère toutes les conversations de l'utilisateur connecté
   */
  getUserConversations(siteId: string): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.api}/conversation?site_id=${siteId}`);
  }

  /**
   * Envoie un message dans une conversation
   */
  sendMessage(conversationId: string, question: string, siteId: string): Observable<Message> {
    return this.http.post<Message>(`${this.api}/chat/ask`, { conversation_id: conversationId, question, site_id: siteId });
  }
}
