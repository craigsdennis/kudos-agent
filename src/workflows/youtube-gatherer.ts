import { env } from 'cloudflare:workers';
import { getAgentByName } from 'agents';
import { WorkflowEntrypoint, type WorkflowStep, type WorkflowEvent } from 'cloudflare:workers';
import type { Kudo } from '../agents/kudos';

type Params = {
	youtubeVideoId: string;
	since: string;
	agentName: string;
};

async function fetchCommentsSince(
	videoId: string,
	sinceTime: Date,
	pageToken: string | null = null,
	collected: any[] = []
  ): Promise<any[]> {
	const url = new URL('https://www.googleapis.com/youtube/v3/commentThreads');
	url.searchParams.set('part', 'snippet');
	url.searchParams.set('videoId', videoId);
	url.searchParams.set('maxResults', '100');
	url.searchParams.set('order', 'time'); // newest first
	url.searchParams.set('textFormat', 'plainText');
	url.searchParams.set('key', env.YOUTUBE_API_KEY);
	if (pageToken) url.searchParams.set('pageToken', pageToken);
	console.log({url: url.toString()});
	const res = await fetch(url.toString());
	if (!res.ok) {
	  console.error(`Error fetching comments: ${res.statusText}`);
	  return collected;
	}

	const data = await res.json();
	const filtered = (data.items || []).filter((item: any) => {
	  const published = new Date(item.snippet.topLevelComment.snippet.publishedAt);
	  return published >= sinceTime;
	});

	collected.push(...filtered);

	if (data.nextPageToken) {
	  return fetchCommentsSince(videoId, sinceTime, data.nextPageToken, collected);
	}

	return collected;
  }

  async function getVideoTitle(videoId: string): Promise<string | null> {
	const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${env.YOUTUBE_API_KEY}`;

	const res = await fetch(url);
	if (!res.ok) {
	  console.error(`Failed to fetch video info: ${res.statusText}`);
	  return null;
	}

	const data = await res.json();

	if (data.items && data.items.length > 0) {
	  return data.items[0].snippet.title;
	}

	return null;
  }


export class YouTubeGatherer extends WorkflowEntrypoint<Env, Params> {

	async run(event: Readonly<WorkflowEvent<Params>>, step: WorkflowStep) {
		const agent = await getAgentByName(this.env.KudosAgent, event.payload.agentName);
		const ytTitle = await getVideoTitle(event.payload.youtubeVideoId);
		const commentThreads = await step.do(`Gather YouTube Comments since ${event.payload.since}`, async () => {

			const sinceDate = new Date(event.payload.since);
			return await fetchCommentsSince(event.payload.youtubeVideoId, sinceDate);
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
					console.log({ comment: topLevelComment.snippet.textDisplay, response });
					// Seems like it is parsed
					return response;
				});
				if (isCompliment) {
					// Add the Kudo to the agent
					const kudo = await step.do(`Add the compliment "${compliment}"`, async () => {
						const kudoText = `${compliment}\n\n\n (originally "${topLevelComment.snippet.textDisplay}")`;
						const kudo: Kudo = {
							text: kudoText,
							author: topLevelComment.snippet.authorDisplayName,
							url: `https://youtu.be/${event.payload.youtubeVideoId}`,
							urlTitle: ytTitle || "YouTube Vid",
						}
						return await agent.addKudo(kudo);
					});
				}
			}
		}
		await step.do(`Update last checked date`, async() => {
			await agent.trackYouTubeChecked(event.payload.youtubeVideoId);
		})
	}
}
