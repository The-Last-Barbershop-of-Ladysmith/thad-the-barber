import base64
import io
import json
import subprocess
import unittest
from contextlib import redirect_stdout
from unittest import mock

import session_token
from key_vault import sign_es256
from session_jwt import build_token
from settings import SigningSettings, read_settings

FAKE_SIGNATURE: bytes = bytes(range(64))


def decode(segment: str) -> bytes:
    return base64.urlsafe_b64decode(segment + "=" * (-len(segment) % 4))


def az_result(stdout: str = "", returncode: int = 0, stderr: str = "") -> subprocess.CompletedProcess[str]:
    return subprocess.CompletedProcess(args=["az"], returncode=returncode, stdout=stdout, stderr=stderr)


class BuildTokenTests(unittest.TestCase):
    def test_matches_the_apis_session_token(self) -> None:
        token: str = build_token(1_790_000_000, 3600, lambda data: FAKE_SIGNATURE)

        header, claims, signature = token.split(".")
        self.assertEqual(json.loads(decode(header)), {"alg": "ES256", "typ": "JWT"})
        payload: dict = json.loads(decode(claims))
        self.assertEqual(payload["iss"], "ttb-api")
        self.assertEqual(payload["aud"], "ttb-api")
        self.assertEqual(payload["iat"], 1_790_000_000)
        self.assertEqual(payload["exp"], 1_790_003_600)
        self.assertRegex(payload["sub"], r"^[0-9a-f]{32}$")
        self.assertEqual(decode(signature), FAKE_SIGNATURE)

    def test_signs_exactly_the_header_and_claims(self) -> None:
        signed: list[bytes] = []

        token: str = build_token(0, 60, lambda data: signed.append(data) or FAKE_SIGNATURE)

        self.assertEqual(signed, [token.rsplit(".", 1)[0].encode("ascii")])

    def test_segments_are_unpadded_base64url(self) -> None:
        token: str = build_token(0, 60, lambda data: b"\xfb\xff" * 32)

        self.assertNotRegex(token, r"[=+/]")


@mock.patch("key_vault.shutil.which", new=mock.Mock(return_value="az"))
class SignTests(unittest.TestCase):
    @mock.patch("key_vault.subprocess.run")
    def test_returns_the_raw_signature_whichever_base64_key_vault_uses(self, run: mock.Mock) -> None:
        for encoded in (base64.b64encode(b"\xfb\xff" * 32).decode(), base64.urlsafe_b64encode(b"\xfb\xff" * 32).decode().rstrip("=")):
            with self.subTest(encoded=encoded):
                run.return_value = az_result(json.dumps({"signature": encoded}))

                self.assertEqual(sign_es256("kv-example", "signing-key", b"data"), b"\xfb\xff" * 32)

    @mock.patch("key_vault.subprocess.run", return_value=az_result(json.dumps({"signature": base64.b64encode(FAKE_SIGNATURE).decode()})))
    def test_sends_the_sha256_digest_to_the_named_key(self, run: mock.Mock) -> None:
        sign_es256("kv-example", "signing-key", b"abc")

        args: list[str] = run.call_args.args[0]
        self.assertEqual(args[args.index("--vault-name") + 1], "kv-example")
        self.assertEqual(args[args.index("--name") + 1], "signing-key")
        self.assertEqual(args[args.index("--algorithm") + 1], "ES256")
        self.assertEqual(args[args.index("--digest") + 1], "ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=")

    @mock.patch("key_vault.subprocess.run", return_value=az_result(returncode=1, stderr="Forbidden"))
    def test_a_refused_signature_stops_with_the_reason(self, _run: mock.Mock) -> None:
        with self.assertRaisesRegex(SystemExit, "Forbidden"):
            sign_es256("kv-example", "signing-key", b"data")

    @mock.patch("key_vault.subprocess.run", return_value=az_result(json.dumps({"signature": base64.b64encode(b"short").decode()})))
    def test_a_signature_of_the_wrong_length_stops(self, _run: mock.Mock) -> None:
        with self.assertRaisesRegex(SystemExit, "64"):
            sign_es256("kv-example", "signing-key", b"data")

    def test_a_missing_az_cli_stops(self) -> None:
        with mock.patch("key_vault.shutil.which", return_value=None), self.assertRaisesRegex(SystemExit, "az"):
            sign_es256("kv-example", "signing-key", b"data")


class MainTests(unittest.TestCase):
    @mock.patch("session_token.sign_es256", side_effect=SystemExit("Forbidden"))
    def test_a_refused_signature_prints_no_token(self, _sign: mock.Mock) -> None:
        output: io.StringIO = io.StringIO()

        with mock.patch("sys.argv", ["session_token.py"]), redirect_stdout(output), self.assertRaises(SystemExit):
            session_token.main()

        self.assertEqual(output.getvalue(), "")

    @mock.patch("session_token.sign_es256", return_value=FAKE_SIGNATURE)
    def test_prints_one_token_lasting_the_asked_minutes(self, _sign: mock.Mock) -> None:
        output: io.StringIO = io.StringIO()

        with mock.patch("sys.argv", ["session_token.py", "--minutes", "5"]), redirect_stdout(output):
            session_token.main()

        payload: dict = json.loads(decode(output.getvalue().strip().split(".")[1]))
        self.assertEqual(payload["exp"] - payload["iat"], 300)

    def test_rejects_a_lifetime_under_a_minute(self) -> None:
        with mock.patch("sys.argv", ["session_token.py", "--minutes", "0"]), redirect_stdout(io.StringIO()), \
                mock.patch("sys.stderr", io.StringIO()), self.assertRaises(SystemExit):
            session_token.main()


class SettingsTests(unittest.TestCase):
    def test_reads_devs_vault_and_key_name_from_the_apis_appsettings(self) -> None:
        settings: SigningSettings = read_settings()

        self.assertTrue(settings.vault_name.startswith("kv-ttb-dev"))
        self.assertEqual(settings.signing_key_name, "session-jwt-signing")


if __name__ == "__main__":
    unittest.main()
