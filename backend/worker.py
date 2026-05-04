import os
import sys

# Windows compatibility patch for RQ (Mock Unix signals)
if os.name == 'nt':
    import signal
    if not hasattr(signal, 'SIGALRM'):
        signal.SIGALRM = getattr(signal, 'SIGTERM', 15)
    if not hasattr(signal, 'alarm'):
        signal.alarm = lambda *args: None

from redis import Redis
from rq import SimpleWorker, Queue, Connection
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

# Setup Redis connection
conn = Redis.from_url(redis_url)

if __name__ == '__main__':
    with Connection(conn):
        print("Starting RQ SimpleWorker on queue 'default' (Windows compatible)...")
        # SimpleWorker processes jobs in the main process, avoiding os.fork() which fails on Windows
        worker = SimpleWorker(['default'])
        worker.work()
