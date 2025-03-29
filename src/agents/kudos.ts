import {Agent, unstable_callable as callable} from "agents";

export type Kudo = {
	text: string,
	author: string,
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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`;
	}

	@callable()
	async addKudo(text: string, author: string, url: string) {
		this.sql`INSERT INTO kudos (text, author, url) VALUES (${text}, ${author}, ${url});`
		const kudo: Kudo = {text, author, url};
		const latest = this.state.latest;
		// Prepend
		latest.unshift(kudo);
		// Limit to the last 10
		this.setState({
			...this.state,
			latest: latest.slice(0, 10)
		});
	}
}


