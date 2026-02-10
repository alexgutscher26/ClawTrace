import unittest
from unittest.mock import patch, MagicMock
import json
import sys
import io

# Import the module to be tested
# Since the filename has a hyphen, we use importlib.
import importlib.util
spec = importlib.util.spec_from_file_location("openclaw_monitor", "openclaw-monitor.py")
monitor = importlib.util.module_from_spec(spec)
# We don't execute the module to avoid running the main loop or side effects at import time
# However, we need the functions defined in it.
# Executing the module is safe because the main logic is in if __name__ == "__main__":
# and the global variables are just constants or initial states.
spec.loader.exec_module(monitor)

class TestGetCpu(unittest.TestCase):

    @patch('platform.system')
    @patch('time.sleep')  # Mock sleep to speed up test
    def test_get_cpu_linux(self, mock_sleep, mock_system):
        mock_system.return_value = "Linux"

        # Prepare mock data for /proc/stat
        # cpu  user nice system idle iowait irq softirq steal guest guest_nice
        # First read:
        # user=100, nice=0, system=10, idle=200
        line1 = "cpu  100 0 10 200 0 0 0 0 0 0\n"

        # Second read:
        # user=110 (+10), nice=0, system=11 (+1), idle=210 (+10)
        # diffs: user=10, system=1, idle=10
        # total diff = 10 + 1 + 10 = 21
        # idle diff = 10
        # usage = 100 * (21 - 10) / 21 = 100 * 11 / 21 = 52.38 -> 52
        line2 = "cpu  110 0 11 210 0 0 0 0 0 0\n"

        m = mock_open()
        # readline is called once per open context
        m.return_value.readline.side_effect = [line1, line2]

        with patch('builtins.open', m):
            cpu_usage = monitor.get_cpu()

        self.assertEqual(cpu_usage, 52)

    @patch('platform.system')
    @patch('subprocess.run')
    @patch('os.cpu_count')
    def test_get_cpu_darwin(self, mock_cpu_count, mock_run, mock_system):
        """Test CPU usage calculation on Darwin systems."""
        mock_system.return_value = "Darwin"
        mock_cpu_count.return_value = 4

        # Output from ps -A -o %cpu
        # Header + values
        ps_output = "%CPU\n 10.0\n 20.0\n"

        mock_run.return_value = MagicMock(stdout=ps_output)

        # Calculation:
        # sum = 10.0 + 20.0 = 30.0
        # usage = 30.0 / 4 = 7.5 -> int(7.5) = 7

        cpu_usage = monitor.get_cpu()
        self.assertEqual(cpu_usage, 7)

    @patch('platform.system')
    @patch('subprocess.run')
    def test_get_cpu_windows(self, mock_run, mock_system):
        """Test CPU usage retrieval on Windows."""
        mock_system.return_value = "Windows"

        # Output from wmic
        wmic_output = "LoadPercentage\r\n50\r\n"

        mock_run.return_value = MagicMock(stdout=wmic_output)

        cpu_usage = monitor.get_cpu()
        self.assertEqual(cpu_usage, 50)

    @patch('platform.system')
    def test_get_cpu_error(self, mock_system):
        """Test get_cpu behavior when an error occurs."""
        mock_system.side_effect = Exception("Some error")

        cpu_usage = monitor.get_cpu()
        self.assertEqual(cpu_usage, 0)

if __name__ == '__main__':
    unittest.main()
