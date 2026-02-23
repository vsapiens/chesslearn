.PHONY: dev build up down logs db-push clean prod prod-up prod-down prod-logs prod-build ssl-init

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

prod-build:
	docker compose -f docker-compose.prod.yml --env-file .env.production build

prod-up:
	docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

prod-down:
	docker compose -f docker-compose.prod.yml --env-file .env.production down

prod-logs:
	docker compose -f docker-compose.prod.yml --env-file .env.production logs -f

ssl-init:
	@test -n "$(DOMAIN)" || (echo "Usage: make ssl-init DOMAIN=chess.example.com" && exit 1)
	docker run --rm -v chesslearn_certbot-conf:/etc/letsencrypt -p 80:80 certbot/certbot certonly --standalone -d $(DOMAIN)
