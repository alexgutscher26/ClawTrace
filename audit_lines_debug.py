import os
import re

audit_file = r'.agent/skills/frontend-design/scripts/ux_audit.py'
with open(audit_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'issues.append' in line or 'warnings.append' in line:
        print(f"{i+1}: {line.strip()}")
