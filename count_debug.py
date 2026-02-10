import os
import sys
import re
from pathlib import Path

# Add the audit script to path
sys.path.append(os.path.abspath(r'.agent\skills\frontend-design\scripts'))
from ux_audit import UXAuditor

filepath = r'app/globals.css'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

has_many_colors = re.findall(r'#[0-9a-fA-F]{3,6}|rgb|hsl', content)
has_many_borders = re.findall(r'border:|border-', content)

print(f"Colors found ({len(has_many_colors)}): {has_many_colors}")
print(f"Borders found ({len(has_many_borders)}): {has_many_borders}")
