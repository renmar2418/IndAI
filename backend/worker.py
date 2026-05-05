import os
from redis import Redis
from rq import Worker, Queue, Connection

redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
if redis_url.startswith("rediss://"):
    redis_conn = Redis.from_url(redis_url, ssl_cert_reqs=None)
else:
    redis_conn = Redis.from_url(redis_url)

if __name__ == '__main__':
    with Connection(redis_conn):
        worker = Worker(['default'])
        worker.work()
