import { google } from 'googleapis';
import { getAgentByName } from 'agents';
import { WorkflowEntrypoint, WorkflowStep, type WorkflowEvent } from 'cloudflare:workers';

type Params = {
	youtubeVideoId: string;
	since: string;
	agentName: string;
};

export class YouTubeGatherer extends WorkflowEntrypoint<Env, Params> {

	async run(event: Readonly<WorkflowEvent<Params>>, step: WorkflowStep) {
		const agent = await getAgentByName(this.env.KudosAgent, event.payload.agentName);
		const youtube = google.youtube({
			version: 'v3',
			auth: this.env.YOUTUBE_API_KEY,
		});
		const commentThreads = await step.do(`Gather YouTube Comments since ${event.payload.since}`, async () => {
			// Do some recursion for paging
			async function fetchComments(videoId: string, since: Date, pageToken?: string, collected: any[] = []): Promise<any[]> {
				const response = await youtube.commentThreads.list({
					part: ['snippet'],
					videoId,
					maxResults: 100,
					pageToken,
					order: 'time', // get newest first
					textFormat: 'plainText',
				});

				const newComments = (response.data.items || []).filter((item) => {
					const publishedAt = new Date(item.snippet?.topLevelComment?.snippet?.publishedAt || '');
					return publishedAt >= since;
				});

				collected.push(...newComments);

				// Check for next page
				if (response.data.nextPageToken) {
					return fetchComments(videoId, since, response.data.nextPageToken, collected);
				}

				return collected;
			}

			const sinceDate = new Date(event.payload.since);
			return await fetchComments(event.payload.youtubeVideoId, sinceDate);
		});
		for (const commentThread of commentThreads) {
			// Just get top level comments?
			const topLevelComment = commentThread.snippet.topLevelComment;
			// Newer replies can make these show up again
			if (topLevelComment.snippet.publishedAt >= event.payload.since) {
				const { isCompliment, compliment } = await step.do(`Determining if ${topLevelComment.id} is a compliment`, async () => {
					const { response } = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
						messages: [
							{
								role: 'system',
								content: `You are a YouTube compliment filter.
								The user is going to pass you a comment from a YouTube Video.
								Your job is to determine if it is a compliment to the creator of the video or not.
								`,
							},
							{ role: 'user', content: topLevelComment.snippet.textDisplay },
						],
						response_format: {
							type: 'json_schema',
							json_schema: {
								type: 'object',
								properties: {
									isCompliment: {
										type: 'boolean',
										description: 'Determines whether this YouTube comment should be considered a compliment',
									},
									compliment: {
										type: 'string',
										description:
											"A compliment based on the comment but rewritten and directed at the creator of the video. 'Not Applicable' if it isn't a compliment.",
									},
								},
								required: ['isCompliment'],
							},
						},
					});
					console.log({ comment: topLevelComment.snippet.textDisplay, isCompliment, compliment });
					// Seems like it is parsed
					return response;
				});
				if (isCompliment) {
					// Add the Kudo to the agent
					const kudo = await step.do(`Add the compliment "${compliment}"`, async () => {
						const kudoText = `${topLevelComment.snippet.authorDisplayName} said ${topLevelComment.snippet.textDisplay}, so basically "${compliment}"`;
						return await agent.addKudo(kudoText, 'youtube-comment', `https://youtu.be/${event.payload.youtubeVideoId}`);
					});
				}
			}
		}
		await step.do(`Update last checked date`, async() => {
			await agent.trackYouTubeChecked(event.payload.youtubeVideoId);
		})
	}
}
