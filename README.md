# aesva-web

This project now includes a Python backend and a PostgreSQL database.

## Running locally

```sh
docker compose up --build
```

The frontend remains static and expects the backend URL to be configured via the settings modal.
The backend exposes generic CRUD endpoints for database tables.
