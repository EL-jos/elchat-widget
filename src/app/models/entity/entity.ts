export type EntityType = 'product' | 'page' | 'document';

export class Entity {
    public clicked = false;

    constructor(
        public id: string,
        public type: EntityType,
        public title?: string,
        public url?: string,
        public image?: string,
        public price?: string,
    ) { }

    static fromJson(json: any): Entity {
        return new Entity(
            json.id ?? (json.url || json.title),
            json.type,
            json.title,
            json.url,
            json.image,
            json.price
        );
    }
}