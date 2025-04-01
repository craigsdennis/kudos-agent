import {Agent, unstable_callable as callable} from "agents";

export type Kudo = {
	id: number,
	text: string,
	author: string,
	hearted: number,
	url?: string
}

export type KudosState = {
	latest: Kudo[]
}

export class KudosAgent extends Agent<Env, KudosState> {
	initialState:KudosState = {
		latest: []
	}
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.sql`CREATE TABLE IF NOT EXISTS kudos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            author TEXT,
			url TEXT,
			hearted INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`;
	}

	@callable()
	async addKudo(text: string, author: string, url: string) {
		const rows = this.sql`INSERT INTO kudos (text, author, url) VALUES (${text}, ${author}, ${url}) RETURNING id;`
		const id = rows[0].id as number;
		const kudo: Kudo = {id, text, author, url, hearted: 0};
		const latest = this.state.latest;
		// Prepend
		latest.unshift(kudo);
		// Limit to the last 10
		this.setState({
			...this.state,
			latest: latest.slice(0, 10)
		});
	}

	@callable()
	async heartKudo(id: number) {
		// Increment and return
		const rows = this.sql`UPDATE kudos SET hearted = hearted + 1 WHERE id = ${id} RETURNING hearted`;
		const hearted = rows[0].hearted as number;
		// Update state
		const latest = this.state.latest;
		const kudo = latest.find(k => k.id === id);
		if (kudo) {
			kudo.hearted = hearted;
			this.setState({
				...this.state,
				latest
			});
		}
	}
}


