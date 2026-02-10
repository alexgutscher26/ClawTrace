import unittest
from unittest.mock import patch, MagicMock
import json
import sys
import io

# Import the module to be tested
# Since the filename has a hyphen, we use importlib.
import importlib.util
spec = importlib.util.spec_from_file_location("openclaw_monitor", "openclaw-monitor.py")
openclaw_monitor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(openclaw_monitor)

class TestHandshake(unittest.TestCase):
    def setUp(self):
        # Reset globals before each test
        openclaw_monitor.SESSION_TOKEN = None
        openclaw_monitor.GATEWAY_URL = None

    @patch('urllib.request.urlopen')
    def test_perform_handshake_success(self, mock_urlopen):
        # Setup mock response
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "token": "fake_token",
            "gateway_url": "http://gateway.example.com"
        }).encode()
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        # Call the function
        # Capture stdout to avoid cluttering test output
        with patch('sys.stdout', new=io.StringIO()):
            result = openclaw_monitor.perform_handshake()

        # Assertions
        self.assertTrue(result)
        self.assertEqual(openclaw_monitor.SESSION_TOKEN, "fake_token")
        self.assertEqual(openclaw_monitor.GATEWAY_URL, "http://gateway.example.com")

        # Verify request
        args, _ = mock_urlopen.call_args
        req = args[0]
        self.assertEqual(req.full_url, f"{openclaw_monitor.SAAS_URL}/api/agents/handshake")
        self.assertEqual(req.get_method(), "POST")

        # Verify payload signature (basic check)
        data = json.loads(req.data.decode())
        self.assertEqual(data["agent_id"], openclaw_monitor.AGENT_ID)
        self.assertIn("timestamp", data)
        self.assertIn("signature", data)

    @patch('urllib.request.urlopen')
    def test_perform_handshake_failure(self, mock_urlopen):
        # Setup mock to raise exception
        mock_urlopen.side_effect = Exception("Network error")

        # Capture stdout to avoid cluttering test output
        with patch('sys.stdout', new=io.StringIO()):
            result = openclaw_monitor.perform_handshake()

        self.assertFalse(result)

    @patch('urllib.request.urlopen')
    def test_perform_handshake_no_gateway(self, mock_urlopen):
        # Setup mock response without gateway_url
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "token": "fake_token"
        }).encode()
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        # Call the function
        with patch('sys.stdout', new=io.StringIO()):
            result = openclaw_monitor.perform_handshake()

        self.assertTrue(result)
        self.assertEqual(openclaw_monitor.SESSION_TOKEN, "fake_token")
        self.assertIsNone(openclaw_monitor.GATEWAY_URL)

if __name__ == '__main__':
    unittest.main()
