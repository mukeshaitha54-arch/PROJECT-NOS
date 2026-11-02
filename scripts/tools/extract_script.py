import json

with open(r'C:\Users\mukes\.gemini\antigravity-ide\brain\fcc9c895-c096-4402-96c6-2bacc6852a9e\.system_generated\logs\transcript_full.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        if data.get('source') == 'USER_EXPLICIT':
            with open(r'C:\Users\mukes\OneDrive\Desktop\NOS\full_prompt.txt', 'w', encoding='utf-8') as out:
                out.write(data.get('content', ''))
            break
