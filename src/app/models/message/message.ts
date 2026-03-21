import { Cta } from "../cta/cta";
import { Entity } from "../entity/entity";

export class Message {
    //public ctas: Cta[] = []; // Ajout de la propriété ctas pour supporter les appels à l'action
    constructor(
        public id: string,
        public content: string,
        public role: 'user' | 'bot',
        public created_at: string,
        public displayed_ctas: Cta[] = [], // <-- ajout pour supporter les CTA
        public entities: Entity[] = [] // ✅ typé
    ) { }

    static fromJson(json: any): Message {
        // Implementation for creating a Message instance from JSON
        return new Message(
            json.id,
            json.content,
            json.role,
            json.created_at,
            (json.displayed_ctas || []).map((cta: any) => Cta.fromJson(cta)),
            (json.entities || []).map((e: any) => Entity.fromJson(e)) // 🔥
        );
    }
}
