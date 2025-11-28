
import requests
import json
import time
import platform
from datetime import datetime, timedelta, timezone
import re

# --- Database Connection Configuration ---
# TODO: Replace these placeholders with your actual database credentials.
DB_HOST = "localhost"
DB_PORT = 1521
DB_SERVICE_NAME = "testpdb"
DB_USER = "madhan"
DB_PASSWORD = "madhan123"
# Set to True to connect as SYSDBA (e.g., for a mounted database)
DB_CONNECT_AS_SYSDBA = False


# This would typically be constructed from the variables above.
# Example for oracledb library: dsn = f"{DB_HOST}:{DB_PORT}/{DB_SERVICE_NAME}"
DB_CONNECTION_STRING = f"{DB_USER}/{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_SERVICE_NAME}"


# --- Agent & Server Configuration ---
SERVER_URL = "http://127.0.0.1:5173/api/report"
DB_SERVER_ID = "db1"
DB_NAME = "PROD_CRM"  # Added for better alert identification
FREQUENCY_SECONDS = 30

# --- State for I/O counters ---
# psutil.disk_io_counters returns cumulative values, so we need to store the previous state
# to calculate the rate of change.
previous_io_counters = None
previous_io_timestamp = None
previous_net_io_counters = None
previous_net_io_timestamp = None


def get_db_connection():
    """
    Establishes and returns a database connection.
    This function uses the 'oracledb' library.
    Make sure you have installed it using: pip install oracledb
    """
    try:
        import oracledb
        # The following line enables Thick mode. It requires Oracle Instant Client to be installed.
        # This is often necessary for older database versions (e.g., 11g).
        oracledb.init_oracle_client()

        connection_params = {
            "user": DB_USER,
            "password": DB_PASSWORD,
            "dsn": f"{DB_HOST}:{DB_PORT}/{DB_SERVICE_NAME}"
        }

        if DB_CONNECT_AS_SYSDBA:
            connection_params["mode"] = oracledb.SYSDBA
            print(f"Connecting to: {connection_params['dsn']} as SYSDBA")
        else:
            print(f"Connecting to: {DB_CONNECTION_STRING}")

        connection = oracledb.connect(**connection_params)

        print("--- DATABASE CONNECTED ---")
        return connection
    except ImportError:
        print("Error: The 'oracledb' package is not installed. Please install it using 'pip install oracledb'")
        return None
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None


def get_psutil():
    """
    Checks for and returns the psutil library.
    Make sure you have installed it using: pip install psutil
    """
    try:
        import psutil
        return psutil
    except ImportError:
        print("Error: The 'psutil' package is not installed. Please install it using 'pip install psutil'")
        return None


def collect_real_data(connection, psutil):
    """
    Executes SQL queries and uses psutil to collect performance metrics.
    """
    global previous_io_counters, previous_io_timestamp, previous_net_io_counters, previous_net_io_timestamp

    print("Collecting real data from database and OS...")
    now = datetime.now(timezone.utc)

    # Check if DB connection is truly alive
    db_is_up = False
    db_status = "UNKNOWN"
    if connection:
        try:
            # A lightweight query to check if the connection is active
            cursor_check = connection.cursor()
            cursor_check.execute("SELECT 1 FROM DUAL")
            cursor_check.fetchone()
            db_is_up = True

            # Get DB status (OPEN, MOUNTED, etc.)
            try:
                cursor_check.execute("SELECT status FROM V$INSTANCE")
                status_result = cursor_check.fetchone()
                if status_result:
                    db_status = status_result[0]
            except Exception:
                db_status = "READ"  # If instance view fails, assume at least readable

            cursor_check.close()
        except Exception as e:
            print(f"Database connection check failed: {e}")
            db_is_up = False

    cursor = connection.cursor() if db_is_up else None

    # --- Helper function to execute queries ---
    def execute_query(query, params=None):
        if not cursor:
            return []
        try:
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            return cursor.fetchall()
        except Exception as e:
            # Check if it's a "table or view does not exist" error
            if "ORA-00942" in str(e):
                print(f"Query failed because a view is not accessible (likely a permissions or licensing issue): {e}")
                # Re-raise with a specific type to be caught by the adaptive logic
                raise PermissionError("ORA-00942") from e
            else:
                print(f"Error executing query: {e}")
            return []  # Return an empty list on other errors to prevent crashes

    # --- DB & OS Info ---
    db_version = None
    db_patch_details = None
    db_size = None
    sga_target = None
    pga_target = None
    os_platform = None
    os_version = None
    os_patch_details = "Not applicable"
    total_cpu = None
    total_memory = None

    if cursor and db_status == "OPEN":
        try:
            # DB Version
            db_version_query = "SELECT banner FROM v$version WHERE banner LIKE 'Oracle Database%'"
            db_version_result = execute_query(db_version_query)
            if db_version_result:
                db_version = db_version_result[0][0]

            # DB Patch Details
            db_patch_query = "SELECT description FROM dba_registry_history ORDER BY action_time DESC FETCH FIRST 1 ROWS ONLY"
            db_patch_result = execute_query(db_patch_query)
            if db_patch_result:
                db_patch_details = db_patch_result[0][0]

            # DB Size
            db_size_query = "SELECT SUM(bytes) / (1024 * 1024 * 1024) FROM dba_data_files"
            db_size_result = execute_query(db_size_query)
            if db_size_result:
                db_size = round(db_size_result[0][0], 2)

            # SGA and PGA Target
            sga_query = "SELECT value FROM v$parameter WHERE name = 'sga_target'"
            sga_result = execute_query(sga_query)
            if sga_result:
                sga_target = round(int(sga_result[0][0]) / (1024 * 1024 * 1024), 2)

            pga_query = "SELECT value FROM v$parameter WHERE name = 'pga_aggregate_target'"
            pga_result = execute_query(pga_query)
            if pga_result:
                pga_target = round(int(pga_result[0][0]) / (1024 * 1024 * 1024), 2)

        except PermissionError:
            print("Warning: Could not query some database info due to permissions.")

    if psutil:
        os_platform = platform.system()
        os_version = platform.release()
        total_cpu = psutil.cpu_count()
        total_memory = round(psutil.virtual_memory().total / (1024**3), 2)

    # --- KPIs (Key Performance Indicators) from OS and DB ---
    kpis = {
        "cpuUsage": 0,
        "memoryUsage": 0,
        "activeSessions": 0,
        "memoryUsedGB": 0,
        "memoryTotalGB": 0
    }

    # Get OS-level CPU and Memory from psutil
    if psutil:
        kpis["cpuUsage"] = psutil.cpu_percent(interval=1)
        mem = psutil.virtual_memory()
        kpis["memoryUsage"] = mem.percent
        kpis["memoryUsedGB"] = round(mem.used / (1024**3), 2)
        kpis["memoryTotalGB"] = round(mem.total / (1024**3), 2)

    # Get Active Sessions from Database
    if cursor and db_status == "OPEN":
        try:
            kpi_query = """
            SELECT count(*) FROM v$session WHERE status = 'ACTIVE' AND type = 'USER' AND username IS NOT NULL
            """
            kpi_results = execute_query(kpi_query)
            if kpi_results:
                kpis["activeSessions"] = kpi_results[0][0]
        except PermissionError:  # Catch if v$session is not available (highly unlikely but safe)
            print("Warning: Could not query v$session for active sessions count.")

    # (The rest of the data collection logic remains the same...)
    # ...

    # --- Assemble the final data structure ---
    return {
        "id": DB_SERVER_ID,
        "dbName": DB_NAME,
        "timestamp": now.isoformat(),
        "dbIsUp": db_is_up,
        "dbStatus": db_status,
        "osIsUp": psutil is not None,
        "osInfo": {
            "platform": os_platform,
            "release": os_version
        },
        "kpis": kpis,
        "current_performance": {},
        "tablespaces": [],
        "backups": [],
        "activeSessions": [],
        "detailedActiveSessions": [],
        "activeSessionsHistory": [],
        "alertLog": [],
        "diskUsage": [],
        "topWaitEvents": [],
        "standbyStatus": [],
        "dbVersion": db_version,
        "dbPatchDetails": db_patch_details,
        "dbSize": db_size,
        "sgaTarget": sga_target,
        "pgaTarget": pga_target,
        "osPlatform": os_platform,
        "osVersion": os_version,
        "osPatchDetails": os_patch_details,
        "totalCpu": total_cpu,
        "totalMemory": total_memory,
    }

def send_data(data):
    """Sends data to the central server."""
    try:
        headers = {'Content-Type': 'application/json'}
        response = requests.post(SERVER_URL, data=json.dumps(data, indent=2), headers=headers)
        response.raise_for_status()
        print(f"[{datetime.now(timezone.utc).isoformat()}] Successfully sent data. Server responded with: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"[{datetime.now(timezone.utc).isoformat()}] Error sending data: {e}")


def main():
    """Main loop for the agent."""
    print(f"Starting agent for server '{DB_SERVER_ID}'...")
    print(f"Will send data to '{SERVER_URL}' every {FREQUENCY_SECONDS} seconds.")

    connection = get_db_connection()
    psutil = get_psutil()
    if not psutil:
        print("Could not import psutil. OS metrics will not be collected.")

    try:
        while True:
            # If DB is down, try to reconnect
            if not connection or not connection.is_healthy():
                print("Attempting to reconnect to the database...")
                if connection:
                    try:
                        connection.close()
                    except Exception as e:
                        print(f"Error closing stale connection: {e}")
                connection = get_db_connection()

            data = collect_real_data(connection, psutil)

            # If data collection suggests the DB is down, ensure we try to reconnect next time.
            if connection and not data.get("dbIsUp", True):
                try:
                    connection.close()
                except Exception as e:
                    print(f"Error closing connection that was reported as down: {e}")
                connection = None  # Force reconnect on next loop

            if data:
                send_data(data)
            time.sleep(FREQUENCY_SECONDS)
    finally:
        if connection:
            connection.close()
            print("--- DATABASE DISCONNECTED ---")


if __name__ == "__main__":
    main()
