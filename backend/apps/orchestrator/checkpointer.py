import os
from psycopg_pool import ConnectionPool
from langgraph.checkpoint.postgres import PostgresSaver

DB_URI = os.getenv("DATABASE_URL")

pool = ConnectionPool(conninfo=DB_URI, max_size=20, kwargs={"autocommit": True})
checkpointer = PostgresSaver(pool)

def init_checkpointer():
    checkpointer.setup()

def get_checkpointer() -> PostgresSaver: 
    return checkpointer