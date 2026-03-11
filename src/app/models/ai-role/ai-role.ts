export class AiRole {
    constructor(
        public id: string | null = null,
        public name: string | null = null,
        public prompt: string | null = null,
        public is_default: boolean = false,
        public created_at?: string,
        public updated_at?: string
    ) { }

    static fromJson(json: any): AiRole {
        return Object.assign(new AiRole(), json);
    }
}
