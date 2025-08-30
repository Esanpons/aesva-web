# aesva-web

This project now includes a Python backend and a PostgreSQL database.

## Running locally

```sh
docker compose up --build
```

This command starts two services:

* `db` – a PostgreSQL instance
* `backend` – a FastAPI app that connects to PostgreSQL using the environment
  variables `POSTGRES_HOST`, `POSTGRES_DB`, `POSTGRES_USER` and
  `POSTGRES_PASSWORD`

The frontend remains static and expects the backend URL to be configured via the
settings modal (click the ⚙️ button). All database operations are sent to the
backend through generic CRUD endpoints.

To initialize the database structure you can export the schema from Supabase and
load it into the database service:

```sh
psql postgresql://user:password@localhost:5432/appdb -f schema.sql
```

Replace `user`, `password` and `appdb` with the credentials defined in your
environment. Dokploy can deploy the same stack; just make sure the frontend is
served alongside the backend and both share the same network so the backend can
reach the database service.
