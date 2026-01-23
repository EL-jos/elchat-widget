import { Message } from "../message/message";

export class Conversation {
    constructor(
        public id: string,
        public site_id: string,
        public messages: Message[],
        public created_at: string,
    ) { }
}
