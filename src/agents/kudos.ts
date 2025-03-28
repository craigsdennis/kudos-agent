import {Agent, unstable_callable as callable} from "agents";

type Kudo = {
	text: string,
	from: string,
	url?: string
}

type KudosState = {
	latest: Kudo[]
}

export class KudosAgent extends Agent<Env, KudosState> {
	initialState:KudosState = {
		latest: []
	}
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.sql`CREATE TABLE IF NOT EXISTS kudos (
            id TEXT PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            from TEXT,
			url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`;
	}

	@callable()
	async addKudo(text: string, from: string, url: string) {
		this.sql`INSERT INTO kudos (text, from, url) VALUES (${text}, ${from}, ${url});`
		const kudo: Kudo = {text, from, url};
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


