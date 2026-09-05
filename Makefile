.PHONY: dev build up down logs db-push db-migrate clean prod

dev:
	docker compose up --build

build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

db-push:
	cd server && npx prisma db push

db-migrate:
	cd server && npx prisma migrate dev

clean:
	docker compose down -v

prod:
	docker compose --env-file .env.production build
	docker compose --env-file .env.production up -d
