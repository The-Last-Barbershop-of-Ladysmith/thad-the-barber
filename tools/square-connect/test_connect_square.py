import io
import json
import unittest
from contextlib import redirect_stdout
from unittest import mock
from urllib.parse import parse_qs, urlsplit

import connect_square
from authorize import SCOPES, authorize_url, code_from_redirect
from oauth import Connection
from settings import read_settings

BASE_URL: str = "https://connect.squareupsandbox.com"


class AuthorizeUrlTests(unittest.TestCase):
    def test_asks_for_exactly_the_buyer_level_scopes(self) -> None:
        query: dict[str, list[str]] = parse_qs(urlsplit(authorize_url(BASE_URL, "app-id", "state-1")).query)

        self.assertEqual(query["scope"][0].split(" "), list(SCOPES))
        self.assertNotIn("APPOINTMENTS_ALL_WRITE", SCOPES)
        self.assertEqual(query["client_id"], ["app-id"])
        self.assertEqual(query["state"], ["state-1"])
        self.assertEqual(query["session"], ["false"])

    def test_goes_to_the_environments_square_host(self) -> None:
        self.assertTrue(authorize_url(BASE_URL, "app-id", "s").startswith(f"{BASE_URL}/oauth2/authorize?"))


class RedirectTests(unittest.TestCase):
    def test_returns_the_code_when_the_state_matches(self) -> None:
        self.assertEqual(code_from_redirect("https://site.example/square/connected?code=abc&state=s1", "s1"), "abc")

    def test_rejects_a_wrong_state(self) -> None:
        with self.assertRaisesRegex(SystemExit, "state"):
            code_from_redirect("https://site.example/?code=abc&state=other", "s1")

    def test_rejects_a_missing_state(self) -> None:
        with self.assertRaisesRegex(SystemExit, "state"):
            code_from_redirect("https://site.example/?code=abc", "s1")

    def test_rejects_a_missing_code(self) -> None:
        with self.assertRaisesRegex(SystemExit, "code"):
            code_from_redirect("https://site.example/?state=s1", "s1")

    def test_reports_a_declined_consent(self) -> None:
        with self.assertRaisesRegex(SystemExit, "access_denied"):
            code_from_redirect("https://site.example/?error=access_denied&state=s1", "s1")


class SettingsTests(unittest.TestCase):
    def test_dev_reads_the_apis_development_settings(self) -> None:
        settings = read_settings("dev")

        self.assertEqual(settings.base_url, BASE_URL)
        self.assertEqual(settings.vault_name, "kv-ttb-dev-centralus")
        self.assertTrue(settings.application_id.startswith("sandbox-"))


class MainTests(unittest.TestCase):
    def test_saves_the_refresh_token_and_never_prints_a_secret(self) -> None:
        written: dict[str, str] = {}
        output: io.StringIO = io.StringIO()
        with (
            mock.patch("sys.argv", ["connect_square.py", "--env", "dev"]),
            mock.patch.object(connect_square, "read_secret", return_value="app-secret-value"),
            mock.patch.object(connect_square, "new_state", return_value="s1"),
            mock.patch.object(connect_square.getpass, "getpass", return_value="https://site.example/?code=c&state=s1"),
            mock.patch.object(connect_square, "exchange_code",
                              return_value=Connection("refresh-token-value", "M1", "2026-11-03T00:00:00Z")),
            mock.patch.object(connect_square, "write_secret",
                              side_effect=lambda vault, name, value: written.update({name: value})),
            redirect_stdout(output),
        ):
            connect_square.main()

        self.assertEqual(written, {"Square--RefreshToken": "refresh-token-value"})
        self.assertNotIn("refresh-token-value", output.getvalue())
        self.assertNotIn("app-secret-value", output.getvalue())
        self.assertIn("M1", output.getvalue())


if __name__ == "__main__":
    unittest.main()
