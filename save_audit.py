import os
import sys
from pathlib import Path

# Add the audit script to path
sys.path.append(os.path.abspath(r'.agent\skills\frontend-design\scripts'))
from ux_audit import UXAuditor

auditor = UXAuditor()
for folder in ['app', 'components']:
    if os.path.exists(folder):
        auditor.audit_directory(folder)

report = auditor.get_report()

with open('final_issues.txt', 'w', encoding='utf-8') as f:
    for i, issue in enumerate(report['issues']):
        f.write(f"J-{i+1}: {issue}\n")
    for i, warning in enumerate(report['warnings']):
        f.write(f"W-{i+1}: {warning}\n")
