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
    constructor(
        public label: string,
        public action: CtaAction,
        public value?: string,
        public style?: string, // exemple: 'primary', 'secondary'
    ) {}
}