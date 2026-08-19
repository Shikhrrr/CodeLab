import os
from langgraph.checkpoint.postgres import PostgresSaver
from psycopg_pool import ConnectionPool

DB_URI = os.getenv("DATABASE_URL")

pool = ConnectionPool(conninfo=DB_URI, max_size=20, kwargs={"autocommit": True})

def get_checkpointer() -> PostgresSaver:
    checkpointer = PostgresSaver(pool) 
    checkpointer.setup() 
    return checkpointer