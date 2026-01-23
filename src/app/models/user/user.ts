export class User {
    constructor(
        public id: string,
        public firstname: string,
        public lastname: string,
        public email: string,
        public is_verified: boolean,
        public created_at: string,
        public account_id?: string,
    ) { }
}
