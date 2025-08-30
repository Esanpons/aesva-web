import os
from typing import Optional, Dict, Any, List

import psycopg2
import psycopg2.extras
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_conn():
    host = os.getenv("POSTGRES_HOST", "db")
    port = os.getenv("POSTGRES_PORT", "5432")
    dbname = os.getenv("POSTGRES_DB", "postgres")
    user = os.getenv("POSTGRES_USER", "postgres")
    password = os.getenv("POSTGRES_PASSWORD", "postgres")
    return psycopg2.connect(host=host, port=port, dbname=dbname, user=user, password=password)


class SelectRequest(BaseModel):
    table: str
    filter: Optional[Dict[str, Any]] = None


class InsertRequest(BaseModel):
    table: str
    data: Dict[str, Any]


class UpdateRequest(BaseModel):
    table: str
    filter: Dict[str, Any]
    data: Dict[str, Any]


class DeleteRequest(BaseModel):
    table: str
    filter: Dict[str, Any]


class RangeRequest(BaseModel):
    table: str
    field: str
    start: Optional[Any] = None
    end: Optional[Any] = None


def dict_rows(cur) -> List[Dict[str, Any]]:
    return [dict(row) for row in cur.fetchall()]


@app.post("/select")
def select(req: SelectRequest):
    query = f"SELECT * FROM {req.table}"
    params: List[Any] = []
    if req.filter:
        clauses = []
        for k, v in req.filter.items():
            clauses.append(f"{k}=%s")
            params.append(v)
        query += " WHERE " + " AND ".join(clauses)
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query, params)
            return dict_rows(cur)


@app.post("/insert")
def insert(req: InsertRequest):
    cols = req.data.keys()
    vals = list(req.data.values())
    placeholders = ",".join(["%s"] * len(cols))
    query = f"INSERT INTO {req.table} ({','.join(cols)}) VALUES ({placeholders}) RETURNING *"
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query, vals)
            conn.commit()
            return dict_rows(cur)[0]


@app.post("/update")
def update(req: UpdateRequest):
    set_clause = ",".join([f"{k}=%s" for k in req.data.keys()])
    where_clause = " AND ".join([f"{k}=%s" for k in req.filter.keys()])
    params = list(req.data.values()) + list(req.filter.values())
    query = f"UPDATE {req.table} SET {set_clause} WHERE {where_clause} RETURNING *"
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query, params)
            conn.commit()
            return dict_rows(cur)[0]


@app.post("/delete")
def delete(req: DeleteRequest):
    where_clause = " AND ".join([f"{k}=%s" for k in req.filter.keys()])
    params = list(req.filter.values())
    query = f"DELETE FROM {req.table} WHERE {where_clause}"
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            conn.commit()
    return {"status": "ok"}


@app.post("/select-range")
def select_range(req: RangeRequest):
    query = f"SELECT * FROM {req.table}"
    params: List[Any] = []
    clauses = []
    if req.start is not None:
        clauses.append(f"{req.field}>=%s")
        params.append(req.start)
    if req.end is not None:
        clauses.append(f"{req.field}<=%s")
        params.append(req.end)
    if clauses:
        query += " WHERE " + " AND ".join(clauses)
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query, params)
            return dict_rows(cur)

