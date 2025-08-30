#aesva-web

This project includes a static frontend, a Python backend, and a PostgreSQL database.

## Running locally

```sh
docker compose up --build
```

This command starts three services:

* `db` – a PostgreSQL instance
* `backend` – a FastAPI app that connects to PostgreSQL using the environment variables `POSTGRES_HOST`, `POSTGRES_DB`, `POSTGRES_USER` and `POSTGRES_PASSWORD`
* `frontend` – an Nginx container that serves the static files under `frontend/`

The frontend is available at <http://localhost:8080>. It expects the backend URL to be configured via the settings modal (click the ⚙️ button). Database credentials are read from the backend's environment variables, so the browser never needs to know them. All database operations are sent to the backend through generic CRUD endpoints.

To initialize the database structure you can export the schema from Supabase and load it into the database service:

```sh
psql postgresql://user:password@localhost:5432/appdb -f schema.sql
```

Replace `user`, `password` and `appdb` with the credentials defined in your environment. Dokploy can deploy the same stack; just make sure all services share the same network so the backend can reach the database service.

## Deploying with Dokploy

You can run the three services on Dokploy as independent apps:

1. **Database** – create a PostgreSQL service and note the internal host, user, database name and password.
2. **Backend** – create an Application from the `server/` folder. Set the environment variables `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER` and `POSTGRES_PASSWORD` to the values from the database service.
3. **Frontend** – create an Application from the `frontend/` folder. When opening the web page, configure the backend URL in the settings modal (⚙️).

Ensure that the three services share the same network inside Dokploy so the backend can resolve the database host.  Expose the frontend through the proxy; the backend and database can remain internal.
