.PHONY: dev build up down logs db-push clean prod

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
	docker compose exec server npx prisma db push

clean:
	docker compose down -v

prod:
	docker compose --env-file .env.production build
	docker compose --env-file .env.production up -d
