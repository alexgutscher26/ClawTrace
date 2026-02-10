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

print(f"TOTAL ISSUES: {len(report['issues'])}")
for i, issue in enumerate(report['issues']):
    print(f"ISSUE {i+1}: {issue}")

print(f"\nTOTAL WARNINGS: {len(report['warnings'])}")
for i, warning in enumerate(report['warnings']):
    print(f"WARNING {i+1}: {warning}")
