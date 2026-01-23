export class Message {
    constructor(
        public id: string,
        public content: string,
        public role: 'user' | 'bot',
        public created_at: string,
    ) { }
}
