export type CtaAction = 
    | 'open_url'
    | 'navigate'
    | 'send_message'
    | 'email'
    | 'phone'
    | 'whatsapp'
    | 'open_form'
    | 'trigger_event';

export class Cta {
    public clicked = false;
    constructor(
        public id: string,        // 🔥 important
        public label: string,
        public position: number,
        public action: CtaAction,
        public value?: string,
        public style?: string, // exemple: 'primary', 'secondary'
    ) { }
    
    static fromJson(json: any): Cta {
        return new Cta(
            json.cta_id ?? json.id,
            json.label,
            json.position,
            json.action,
            json.value,
            json.style
        );
    }
}