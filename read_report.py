with open('audit_full_report.txt', 'rb') as f:
    content = f.read()
    # Try different encodings
    for encoding in ['utf-16', 'utf-8', 'ascii']:
        try:
            text = content.decode(encoding)
            print(f"--- ENCODING: {encoding} ---")
            print(text)
            break
        except:
            continue
