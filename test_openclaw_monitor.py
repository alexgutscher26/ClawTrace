import unittest
from unittest.mock import patch, MagicMock
import json
import sys
import io
import importlib.util

# Load the openclaw-monitor.py module
spec = importlib.util.spec_from_file_location("openclaw_monitor", "openclaw-monitor.py")
openclaw_monitor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(openclaw_monitor)

class TestHandshake(unittest.TestCase):
    def setUp(self):
        # Store original global variables to restore after tests
        self.original_token = openclaw_monitor.SESSION_TOKEN
        self.original_gateway = openclaw_monitor.GATEWAY_URL

    def tearDown(self):
        # Restore global variables
        openclaw_monitor.SESSION_TOKEN = self.original_token
        openclaw_monitor.GATEWAY_URL = self.original_gateway

    @patch('urllib.request.urlopen')
    def test_perform_handshake_success(self, mock_urlopen):
        # Setup mock response
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "token": "fake_token_123",
            "gateway_url": "http://gateway.example.com"
        }).encode()
        # Mock context manager behavior
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        # Call the function, capturing stdout
        captured_output = io.StringIO()
        sys.stdout = captured_output
        try:
            result = openclaw_monitor.perform_handshake()
        finally:
            sys.stdout = sys.__stdout__

        # Assertions
        self.assertTrue(result)
        self.assertIn("Handshake successful", captured_output.getvalue())
        self.assertIn("Probing active", captured_output.getvalue())
        self.assertEqual(openclaw_monitor.SESSION_TOKEN, "fake_token_123")
        self.assertEqual(openclaw_monitor.GATEWAY_URL, "http://gateway.example.com")

        # Verify request details
        args, _ = mock_urlopen.call_args
        req = args[0]
        self.assertEqual(req.full_url, f"{openclaw_monitor.SAAS_URL}/api/agents/handshake")
        self.assertEqual(req.get_method(), "POST")

        # Verify payload content
        data = json.loads(req.data.decode())
        self.assertEqual(data["agent_id"], openclaw_monitor.AGENT_ID)
        self.assertIn("timestamp", data)
        self.assertIn("signature", data)

    @patch('urllib.request.urlopen')
    def test_perform_handshake_failure(self, mock_urlopen):
        # Setup mock to raise exception
        mock_urlopen.side_effect = Exception("Network error")

        # Capture stdout to avoid cluttering test output
        captured_output = io.StringIO()
        sys.stdout = captured_output
        try:
            result = openclaw_monitor.perform_handshake()
        finally:
            sys.stdout = sys.__stdout__

        self.assertFalse(result)
        self.assertIn("Handshake failed", captured_output.getvalue())

    @patch('urllib.request.urlopen')
    def test_perform_handshake_no_gateway(self, mock_urlopen):
        # Setup mock response without gateway_url
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "token": "fake_token_456"
        }).encode()
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        # Ensure GATEWAY_URL is None initially
        openclaw_monitor.GATEWAY_URL = None

        # Capture stdout
        captured_output = io.StringIO()
        sys.stdout = captured_output
        try:
            result = openclaw_monitor.perform_handshake()
        finally:
            sys.stdout = sys.__stdout__

        self.assertTrue(result)
        self.assertEqual(openclaw_monitor.SESSION_TOKEN, "fake_token_456")
        self.assertIsNone(openclaw_monitor.GATEWAY_URL)
        self.assertIn("Handshake successful", captured_output.getvalue())
        self.assertNotIn("Probing active", captured_output.getvalue())

if __name__ == '__main__':
    unittest.main()
