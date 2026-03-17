import { Cta } from "../cta/cta";

export class Message {
    constructor(
        public id: string,
        public content: string,
        public role: 'user' | 'bot',
        public created_at: string,
        public ctas: Cta[] = [] // <-- ajout pour supporter les CTA
    ) { }
}
