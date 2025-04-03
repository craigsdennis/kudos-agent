import {Agent, unstable_callable as callable} from "agents";

export type Kudo = {
	id: number,
	text: string,
	author: string,
	hearted: number,
	url?: string
}

export type KudosState = {
	latest: Kudo[],
	youtubeVideoWatchCount: number;
}

export class KudosAgent extends Agent<Env, KudosState> {
	initialState:KudosState = {
		latest: [],
		youtubeVideoWatchCount: 0
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
		this.sql`CREATE TABLE IF NOT EXISTS youtube_videos (
			id STRING PRIMARY KEY,
			last_checked_date TIMESTAMP,
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

	async generateCompliment() {
		const rows = this.sql`SELECT text FROM kudos ORDER BY RANDOM() LIMIT 3`;
		const kudoTexts = rows.map(row => row.text);
		const instructions = `You are a compliment creator.
			The user is going to provide you with a list of previous kudos.
			Your job is to summarize the kudos and generate a relevant compliment that encompasses the traits that the kudos highlight.
			The compliment will be delivered to the person who received the kudos, so you should use statements like "You are...".
			Keep it succinct, yet poignant.
			Return only the compliment, no prefix or description.`;
		const { response } = await this.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
			messages: [
				{role: "system", content: instructions},
				{role: "user", content: "-" + kudoTexts.join("\n\n\n\n-")}
			]
		});
		return response;
	}

	@callable()
	async addYouTubeVideo(url: string) {
		const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
		const match = url.match(regex);
		const videoId = match ? match[1] : null;
		if (!videoId) {
			throw new Error(`Unknown YouTube URL format: ${url}`);
		}
		return this.addYouTubeById(videoId);
	}

	async addYouTubeById(videoId: string) {
		this.sql`INSERT INTO youtube_videos (id) VALUES (${videoId});`;
		const rows = this.sql`SELECT count(*) as watchCount FROM youtube_videos;`
		await this.env.YOUTUBE_GATHERER.create({
			params: {
				youtubeVideoId: videoId,
				since: new Date("2020-01-01"),
				agentName: this.name
			}
		})
		this.setState({
			...this.state,
			youtubeVideoWatchCount: rows[0].watchCount as number
		})
	}

	async trackYouTubeChecked(youtubeVideoId: string) {
		this.sql`UPDATE youtube_videos SET last_checked_date=NOW() WHERE id=${youtubeVideoId}`;
	}

	async getSpeech(text: string) {
		const results = await this.env.AI.run("@cf/myshell-ai/melotts", {
			prompt: text
		});
		return results.audio;
	}

	@callable()
	async getSpokenCompliment() {
		const compliment = await this.generateCompliment();
		console.log({compliment});
		return this.getSpeech(compliment);
	}
}


