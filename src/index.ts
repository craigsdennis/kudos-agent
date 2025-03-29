import { Hono } from 'hono';
import { KudosAgent } from './agents/kudos';
import { agentsMiddleware } from 'hono-agents';

export { KudosAgent };

const app = new Hono<{ Bindings: Env }>();
app.use('*', agentsMiddleware());
app.notFound((c) => {
	// We have a single page app
	return c.env.ASSETS.fetch(c.req.raw);
});
app.get('/hello', async (c) => {
	return c.json({ hello: 'world' });
});

export default app;
