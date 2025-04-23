import { getAgentByName } from 'agents';
import { WorkflowEntrypoint, WorkflowStep, type WorkflowEvent } from 'cloudflare:workers';
import { env } from 'cloudflare:workers';
import { Buffer } from 'node:buffer';

type Params = {
	agentName: string;
	screenshotFileName: string;
};

type ScreenshotParse = {
	approved: boolean;
};

export class ScreenshotParser extends WorkflowEntrypoint<Env, Params> {
	async run(event: Readonly<WorkflowEvent<Params>>, step: WorkflowStep): Promise<string> {
		const agent = await getAgentByName(this.env.KudosAgent, event.payload.agentName);
		const dataUrl = await step.do(`Get ${event.payload.screenshotFileName} as a data url`, async () => {
			const obj = await env.SCREENSHOTS.get(event.payload.screenshotFileName);
			if (obj === null) {
				return;
			}
			const aBuffer = await obj.arrayBuffer();
			const base64String = Buffer.from(aBuffer).toString('base64');
			return `data:${obj?.httpMetadata?.contentType};base64,${base64String}`;
		});
		const complimentInfo = await step.do(`Researching ${event.payload.screenshotFileName}`, async () => {
			const { response } = await this.env.AI.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
				messages: [
					{
						role: 'system',
						content: `You are a compliment extractor`,
					},
					{
						role: 'user',
						content: [
							{
								type: 'image_url',
								image_url: {
									url: dataUrl,
								},
							},
						],
					},
				],
				response_format: {
					type: 'json_schema',
					json_schema: {
						type: 'object',
						properties: {
							isCompliment: {
								type: 'boolean',
								description: 'Determines whether this screenshot should be considered a compliment',
							},
							compliment: {
								type: 'string',
								description:
									"A compliment based on the screenshot but rewritten and directed at the person mentioned. 'Not Applicable' if it isn't a compliment.",
							},
							complimenter: {
								type: 'string',
								description: "The user who delivered the compliment. Use @someone if you aren't sure",
							},
						},
						required: ['isCompliment', 'compliment', 'complimenter'],
					},
				},
			});
			return JSON.parse(response);
		});
		const added = await step.do(`Add approval to ${event.payload.agentName}`, async() => {
			await agent.addScreenshotParseVerification({
				workflowId: event.instanceId,
				...complimentInfo,
				screenshotDataUrl: dataUrl
			})
			return true;
		});
		try {
			const humanResponseEvent = await step.waitForEvent<ScreenshotParse>('approve screenshot parse', {
				type: 'screenshot-parse-approval',
				timeout: '1 minute',
			});
			console.log({humanResponseEvent});


			if (humanResponseEvent.payload.approved) {
				const submitted = await step.do("Create new Kudo", async() => {
					const kudo = await agent.addKudo({
						text: complimentInfo.compliment,
						author: complimentInfo.complimenter,
						hearted: 0,
						url: `/screenshots/${event.payload.screenshotFileName}`,
						urlTitle: "Screenshot"
					})
					return true;
				});
			}
		} catch(err) {
			console.log({err});
			console.log("Threw an error on waiting");
			console.error(err);
		}

		return JSON.stringify({success: true});
	}
}
