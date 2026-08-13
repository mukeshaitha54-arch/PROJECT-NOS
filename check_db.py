import sqlite3

db_path = r'C:\ProgramData\NOS\Agent\outbox.db'
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT COUNT(*) FROM OutboxMessages;")
print(f"OutboxMessages count: {cur.fetchone()[0]}")

cur.execute("SELECT COUNT(*) FROM DeadLetterMessages;")
print(f"DeadLetterMessages count: {cur.fetchone()[0]}")

cur.execute("SELECT Priority, COUNT(*) FROM OutboxMessages GROUP BY Priority;")
for row in cur.fetchall():
    print(f"Priority {row[0]}: {row[1]}")

conn.close()
