import { Hono } from 'hono';
import { agentsMiddleware } from 'hono-agents';

const app = new Hono<{ Bindings: Env }>();
app.use("*", agentsMiddleware());
app.get('/hello', async(c) => {
    return c.json({hello: "world"});
});

export default app;
