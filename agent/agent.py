
import requests
import json
import time
import platform
import os
import heapq
from datetime import datetime, timedelta, timezone
import sys

# --- Database Connection Configuration ---
DB_HOST = "localhost"
DB_PORT = 1521
DB_SERVICE_NAME = "testpdb"
DB_USER = "madhan"
DB_PASSWORD = "madhan123"
DB_CONNECTION_STRING = f"{DB_USER}/{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_SERVICE_NAME}"

# --- Agent & Server Configuration ---
SERVER_URL = "http://127.0.0.1:5173/api/report"
DB_SERVER_ID = "db1"
DB_NAME = "PROD_CRM"
FREQUENCY_SECONDS = 10

# --- State for I/O counters ---
previous_io_counters = None
previous_io_timestamp = None
previous_net_io_counters = None
previous_net_io_timestamp = None

def get_db_connection():
    """Establishes and returns a database connection."""
    try:
        import oracledb
        try:
            oracledb.init_oracle_client()
            print("Running in Thick mode.")
        except:
            print("Running in Thin mode.")
        print(f"Connecting to: {DB_CONNECTION_STRING}")
        connection = oracledb.connect(user=DB_USER, password=DB_PASSWORD, dsn=f"{DB_HOST}:{DB_PORT}/{DB_SERVICE_NAME}")
        print("--- DATABASE CONNECTED ---")
        return connection
    except ImportError:
        print("Error: The 'oracledb' package is not installed. Please install it using 'pip install oracledb'", file=sys.stderr)
        return None
    except Exception as e:
        print(f"Error connecting to database: {e}", file=sys.stderr)
        return None

def get_psutil():
    """Checks for and returns the psutil library."""
    try:
        import psutil
        return psutil
    except ImportError:
        print("Error: The 'psutil' package is not installed. OS metrics will not be collected.", file=sys.stderr)
        return None

def get_top_processes(psutil, num_processes=5):
    """Gets top processes by CPU, memory, and I/O."""
    if not psutil:
        return {}
    
    procs = []
    for p in psutil.process_iter(['pid', 'name', 'username', 'cpu_percent', 'memory_info', 'io_counters']):
        try:
            p.cpu_percent(interval=0.01)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    time.sleep(0.1)

    for p in psutil.process_iter(['pid', 'name', 'username', 'cpu_percent', 'memory_info', 'io_counters']):
        try:
            mem_info = p.info['memory_info']
            if p.info['cpu_percent'] == 0 and mem_info.rss == 0:
                continue
            
            io_counters = p.info['io_counters']
            procs.append({
                'pid': p.info['pid'],
                'name': p.info['name'],
                'username': p.info['username'],
                'cpuPercent': p.info['cpu_percent'],
                'memoryMb': mem_info.rss / (1024 * 1024),
                'readMb': (io_counters.read_bytes / (1024 * 1024)) if io_counters else 0,
                'writeMb': (io_counters.write_bytes / (1024 * 1024)) if io_counters else 0,
                'sentMb': 0, 'recvMb': 0
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    top_cpu = heapq.nlargest(num_processes, procs, key=lambda p: p['cpuPercent'])
    top_memory = heapq.nlargest(num_processes, procs, key=lambda p: p['memoryMb'])
    top_io = heapq.nlargest(num_processes, procs, key=lambda p: p['readMb'] + p['writeMb'])

    return {'cpu': top_cpu, 'memory': top_memory, 'io': top_io, 'network': []}

def format_uptime(seconds):
    """Formats seconds into a human-readable string like '10d 5h 30m'."""
    if seconds is None:
        return "N/A"
    d = int(seconds // (3600 * 24))
    h = int((seconds % (3600 * 24)) // 3600)
    m = int((seconds % 3600) // 60)
    if d > 0:
        return f"{d}d {h}h {m}m"
    elif h > 0:
        return f"{h}h {m}m"
    else:
        return f"{m}m"

def collect_real_data(connection, psutil):
    """Collects performance metrics from the database and OS."""
    global previous_io_counters, previous_io_timestamp, previous_net_io_counters, previous_net_io_timestamp
    print("Collecting real data...")
    now = datetime.now(timezone.utc)
    
    db_is_up = False
    db_status = "DOWN"
    db_uptime_str = "N/A"
    
    if connection:
        try:
            cursor_check = connection.cursor()
            cursor_check.execute("SELECT 1 FROM DUAL")
            cursor_check.fetchone()
            db_is_up = True
            db_status = "UP"
            cursor_check.close()
        except Exception as e:
            print(f"Database connection check failed: {e}", file=sys.stderr)

    cursor = connection.cursor() if db_is_up else None

    def execute_query(query, params=None):
        if not cursor: return []
        try:
            cursor.execute(query, params or [])
            return cursor.fetchall()
        except Exception as e:
            print(f"Query failed: {e}", file=sys.stderr)
            return []

    # --- Uptime ---
    os_uptime_str = "N/A"
    if psutil:
        boot_time = datetime.fromtimestamp(psutil.boot_time())
        os_uptime_str = format_uptime((datetime.now() - boot_time).total_seconds())

    if db_is_up:
        uptime_res = execute_query("SELECT (SYSDATE - STARTUP_TIME) * 24 * 60 * 60 FROM V$INSTANCE")
        if uptime_res:
            db_uptime_str = format_uptime(uptime_res[0][0])

    # --- OS & DB Info ---
    os_info = {"platform": platform.system(), "release": platform.release()} if psutil else {}

    # --- KPIs ---
    kpis = {"cpuUsage": 0, "memoryUsage": 0, "activeSessions": 0, "memoryUsedGB": 0, "memoryTotalGB": 0}
    if psutil:
        kpis["cpuUsage"] = psutil.cpu_percent(interval=1)
        mem = psutil.virtual_memory()
        kpis["memoryUsage"] = mem.percent
        kpis["memoryUsedGB"] = round(mem.used / (1024**3), 2)
        kpis["memoryTotalGB"] = round(mem.total / (1024**3), 2)
    
    if db_is_up:
        kpi_res = execute_query("SELECT count(*) FROM v$session WHERE status = 'ACTIVE' AND type = 'USER' AND username IS NOT NULL")
        if kpi_res: kpis["activeSessions"] = kpi_res[0][0]

    # --- Performance Metrics ---
    io_details, total_io_read_rate, total_io_write_rate = [], 0, 0
    net_up_rate, net_down_rate = 0, 0

    if psutil:
        current_io_counters = psutil.disk_io_counters(perdisk=True)
        current_time = time.time()
        if previous_io_counters:
            time_delta = current_time - previous_io_timestamp
            if time_delta > 0:
                for disk, current in current_io_counters.items():
                    prev = previous_io_counters.get(disk)
                    if prev:
                        read_rate = (current.read_bytes - prev.read_bytes) / time_delta / (1024*1024)
                        write_rate = (current.write_bytes - prev.write_bytes) / time_delta / (1024*1024)
                        total_io_read_rate += read_rate
                        total_io_write_rate += write_rate
        previous_io_counters, previous_io_timestamp = current_io_counters, current_time
        
        current_net_counters = psutil.net_io_counters()
        if previous_net_io_counters:
             time_delta = current_time - previous_net_io_timestamp
             if time_delta > 0:
                net_up_rate = (current_net_counters.bytes_sent - previous_net_io_counters.bytes_sent) / time_delta / (1024*1024)
                net_down_rate = (current_net_counters.bytes_recv - previous_net_io_counters.bytes_recv) / time_delta / (1024*1024)
        previous_net_io_counters, previous_net_io_timestamp = current_net_counters, current_time


    current_performance = {
        "cpu": kpis["cpuUsage"],
        "memory": kpis["memoryUsage"],
        "ioRead": round(total_io_read_rate, 2),
        "ioWrite": round(total_io_write_rate, 2),
        "ioDetails": io_details,
        "networkUp": round(net_up_rate, 2),
        "networkDown": round(net_down_rate, 2),
        "activeSessions": kpis["activeSessions"]
    }

    if cursor: cursor.close()

    return {
        "id": DB_SERVER_ID, 
        "dbName": DB_NAME, 
        "timestamp": now.isoformat(),
        "dbIsUp": db_is_up, 
        "osIsUp": psutil is not None,
        "dbStatus": db_status, 
        "osStatus": "UP" if psutil else "DOWN",
        "dbUptime": db_uptime_str, 
        "osUptime": os_uptime_str,
        "osInfo": os_info, 
        "kpis": kpis,
        "currentPerformance": current_performance,
        "topProcesses": get_top_processes(psutil),
        "tablespaces": [], 
        "backups": [], 
        "activeSessions": [], 
        "detailedActiveSessions": [],
        "activeSessionsHistory": [], 
        "alertLog": [], 
        "diskUsage": [], 
        "topWaitEvents": []
    }

def send_data(data):
    """Sends data to the central server."""
    try:
        headers = {'Content-Type': 'application/json'}
        response = requests.post(SERVER_URL, data=json.dumps(data), headers=headers)
        response.raise_for_status()
        print(f"[{datetime.now(timezone.utc).isoformat()}] Successfully sent data. Status: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"[{datetime.now(timezone.utc).isoformat()}] Error sending data: {e}", file=sys.stderr)

def main():
    """Main loop for the agent."""
    print(f"Starting agent for server '{DB_SERVER_ID}'...")
    psutil = get_psutil()
    connection = get_db_connection()

    while True:
        if not connection:
            print("Attempting to reconnect to the database...")
            connection = get_db_connection()
        
        data = collect_real_data(connection, psutil)
        
        if connection and not data.get("dbIsUp"):
            try: connection.close()
            except Exception as e: print(f"Error closing stale connection: {e}", file=sys.stderr)
            connection = None

        if data: send_data(data)
        time.sleep(FREQUENCY_SECONDS)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nAgent stopped by user.")
