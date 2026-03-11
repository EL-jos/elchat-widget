import { AiRole } from "../ai-role/ai-role";

export class WidgetSetting {
    public ai_role: AiRole | null = null;
    constructor(
        public id: string | null = null,
        public site_id: string | null = null,
        public ai_role_id: string | null = null,

        // 🟣 Button
        public button_text: string | null = null,
        public button_background: string | null = null,
        public button_color: string | null = null,
        public button_position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' = 'bottom-right',
        public button_offset_x: string = '1rem',
        public button_offset_y: string = '1rem',

        // 🎨 Theme
        public theme_primary: string = '#4F46E5',
        public theme_secondary: string = '#E5E7EB',
        public theme_background: string = '#FFFFFF',
        public theme_color: string = '#111827',

        // 💬 Messages
        public message_user_background: string = '#4F46E5',
        public message_user_color: string = '#FFFFFF',
        public message_bot_background: string = '#F3F4F6',
        public message_bot_color: string = '#111827',

        // 🤖 Bot / AI
        public widget_enabled: boolean = true,
        public ai_enabled: boolean = true,
        public bot_name: string = 'ELChat',
        public bot_language: string = 'fr',
        public welcome_message: string = 'Bonjour 👋 Comment puis-je vous aider ?',
        public input_placeholder: string = 'Posez votre question...',
        public ai_temperature: number = 0.7,
        public ai_max_tokens: number = 500,
        public min_similarity_score: number = 0.3,
        public fallback_message: string = 'Désolé, je n’ai pas trouvé de réponse pertinente à votre question.',

        public created_at?: string,
        public updated_at?: string
    ) { }

    static fromJson(json: any): WidgetSetting {
        const settings = Object.assign(new WidgetSetting(), json);
        if (json.ai_role) {
            settings.ai_role = AiRole.fromJson(json.ai_role);
        }
        return settings;
    }
}
