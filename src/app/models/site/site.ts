export class Site {
    constructor(
        public id: string,
        public account_id: string,
        public type_site_id: string,
        public company_name: string,
        public url: string,
        public status: 'pending' | 'crawling' | 'ready' | 'error' | 'indexing',
        public crawl_depth: number,
        public crawl_delay: number,
        public exclude_pages: string[],
        public include_pages: string[],
        public public_token?: string, // 👈 IMPORTANT pour le widget
    ) { }
}
