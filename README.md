# Joanna

Joanna is a personal journaling assistant.

## Development

```bash
cp .env.example .env
pnpm install

podman compose up -d
pnpm db:push
pnpm db:seed
pnpm dev
```

Note: make sure you fix the assistant ID in the `.env` so **memory stored on Backboard.io persists**.
