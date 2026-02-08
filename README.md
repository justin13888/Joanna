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
