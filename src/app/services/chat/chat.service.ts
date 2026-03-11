import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Conversation } from 'src/app/models/conversation/conversation';
import { Message } from 'src/app/models/message/message';
import { environment } from 'src/environments/environment';
import { throwError, of } from 'rxjs';
import { catchError } from 'rxjs/operators';


function handleChatError<T>(fallback: T) {
  return catchError((err: any) => {
    console.error('ChatService error:', err);
    // éventuellement afficher toast UX ici
    return of(fallback);
  });
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private api = environment.serveur.url;

  constructor(private http: HttpClient) { }

  /**
   * Récupère toutes les conversations de l'utilisateur connecté
   */
  getUserConversations(siteId: string, visitorUUID?: string): Observable<Conversation[]> {
    if (visitorUUID) {
      return this.http.get<Conversation[]>(`${this.api}/widget/conversations/${siteId}?visitor_uuid=${visitorUUID}`);
    }
    return this.http.get<Conversation[]>(`${this.api}/conversation?site_id=${siteId}`);
  }

  /**
   * Récupère toutes les conversations de l'utilisateur connecté
   */
  getUserMessages(conversationId: string, siteId: string, visitorUUID?: string): Observable<Conversation> {
    console.log("chargement message: ", visitorUUID);
    
    if (visitorUUID) {
      return this.http.get<Conversation>(`${this.api}/widget/chat/${conversationId}/${siteId}?visitor_uuid=${visitorUUID}`);
    }
    return this.http.get<Conversation>(`${this.api}/conversation/${conversationId}/${siteId}`);
  }

  /**
   * Envoie un message dans une conversation
   */
  sendMessage(conversationId: string | null, question: string, siteId: string, visitorUUID?: string): Observable<Message> {

    const payload: any = {
      site_id: siteId,
      question: question,
      conversation_id: conversationId
    };

    if (visitorUUID) {
      payload.visitor_uuid = visitorUUID;
      return this.http.post<Message>(`${this.api}/widget/chat`, payload);
    }

    return this.http.post<Message>(`${this.api}/chat/ask`, payload);
  }
}
