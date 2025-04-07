# Kudos Agent

This is a demo application of the [Cloudflare Agents Framework](https://agents.cloudflare.com).

Each User is represented by an Agent, addressable by the username. Kudos are stored both in the Agent's internal SQLite database as well as the Agent State which is synced to every connected client.

Open a user's page in two browsers and heart it. You'll see it immediately refreshes, showing off multi-player functionality.

There is a background Workflow that runs to check YouTube for new compliments and in turn produces new Kudos for what it finds. This runs using the agent's scheduler.


## Develop

Copy [.dev.vars.example](./.dev.vars.example) to `.dev.vars`

Add your YouTube API Key

```bash
npm install
```

```bash
npm run dev
```

## Deploy

Upload your secrets

```bash
npx wrangler secret bulk .dev.vars
```

Deploy

```bash
npm run deploy
```

