import { Hono } from 'hono';
import { agentsMiddleware } from 'hono-agents';
import { KudosAgent } from './agents/kudos';
import { YouTubeGatherer } from './workflows/youtube-gatherer';
import { ScreenshotParser } from './workflows/screenshot-parser';

export { KudosAgent, YouTubeGatherer, ScreenshotParser };

const app = new Hono<{ Bindings: Env }>();

app.get('/screenshots/:key', async (c) => {
	const key = c.req.param('key');
	console.log({ key });
	const screenshot = await c.env.SCREENSHOTS.get(key);
	if (screenshot === null) {
		return c.notFound();
	}
	return c.body(screenshot.body);
});

app.use('*', agentsMiddleware());

export default app;
