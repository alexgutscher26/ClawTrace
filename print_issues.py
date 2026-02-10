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

for i, issue in enumerate(report['issues']):
    clean_issue = issue.replace('\n', ' ').strip()
    print(f"J-{i+1}: {clean_issue}")
