import functools
import http.server
import tempfile
import threading
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

import entrega


class Silent(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


class DeliveryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.site = self.root / "staging"
        self.site.mkdir()
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0),
                 functools.partial(Silent, directory=str(self.site)))
        self.base = f"http://127.0.0.1:{server.server_port}"
        worker = threading.Thread(target=server.serve_forever, kwargs={"poll_interval": 0.02}, daemon=True)
        worker.start()
        self.addCleanup(server.server_close)
        self.addCleanup(worker.join)
        self.addCleanup(server.shutdown)

    def candidate(self, version):
        dist = self.root / ("dist-" + version)
        dist.mkdir()
        (dist / "index.html").write_text("<meta content=\"connect-src 'none'; form-action 'none'; base-uri 'none'\">" + version)
        for i in range(5):
            (dist / f"asset-{i}.js").write_text("const version = '" + version + "';")
        package = self.root / ("candidate-" + version)
        entrega.prepare(dist, package, version * 40)
        return package

    def deploy(self, candidate=None):
        return entrega.activate(self.site, self.base, candidate)

    def test_first_release_retry_and_zip(self):
        package = self.candidate("a")
        initial = self.deploy(package)
        self.assertIsNone(initial["version_previa"])
        self.assertEqual(self.deploy(package)["version_activa"], initial["version_activa"])
        receipt = self.root / "recibo.json"
        entrega.write_json(receipt, initial)
        entrega.package_zip(package, receipt, self.root)
        archive, = self.root.glob("*.zip")
        with zipfile.ZipFile(archive) as zipped:
            zipped.extractall(self.root / "extracted")
        extracted, = (self.root / "extracted").iterdir()
        self.assertEqual(entrega.documents(package), entrega.documents(extracted))

    def test_manual_rollback_recovers_first_version(self):
        first = self.deploy(self.candidate("a"))
        second = self.deploy(self.candidate("b"))
        self.assertNotEqual(first["version_activa"], second["version_activa"])
        self.assertEqual(self.deploy()["version_activa"], first["version_activa"])

    def test_post_switch_http_failure_restores_previous_bytes(self):
        first = self.deploy(self.candidate("a"))
        second = self.candidate("b")
        real = entrega.smoke
        def fail_new(base, channel, files):
            if channel == "expo" and entrega.pointer(self.site).startswith("b" * 40):
                raise RuntimeError("HTTP de la versión candidata")
            return real(base, channel, files)
        with patch.object(entrega, "smoke", side_effect=fail_new), self.assertRaises(RuntimeError):
            self.deploy(second)
        self.assertEqual(entrega.pointer(self.site), first["version_activa"])
        self.assertTrue((self.site / "expo/index.html").read_text().endswith("a"))

    def test_interrupted_switch_is_recovered_before_retry(self):
        first = self.deploy(self.candidate("a"))["version_activa"]
        second = self.candidate("b")
        key = entrega.register(self.site, second)
        journal = self.site / ".estado/pendiente.json"
        entrega.write_json(journal, {"before": first, "after": key, "old_previous": None})
        entrega.switch(self.site, key)
        self.assertEqual(self.deploy(second)["version_previa"], first)
        self.assertFalse(journal.exists())

    def test_bad_first_publication_leaves_no_active_url(self):
        first = self.candidate("a")
        real = entrega.smoke
        def broken(base, channel, files):
            if channel == "expo":
                raise RuntimeError("Contenido incorrecto")
            return real(base, channel, files)
        with patch.object(entrega, "smoke", side_effect=broken), self.assertRaises(RuntimeError):
            self.deploy(first)
        self.assertIsNone(entrega.pointer(self.site))

    def test_package_rejects_different_receipt_and_modified_bytes(self):
        package = self.candidate("a")
        receipt = self.root / "recibo.json"
        entrega.write_json(receipt, {"version_activa": "otra", "http_sha256": "ok"})
        with self.assertRaises(ValueError):
            entrega.package_zip(package, receipt, self.root)
        (package / "web-dist/asset-3.js").write_text("cambio")
        with self.assertRaises(RuntimeError):
            self.deploy(package)
        self.assertIsNone(entrega.pointer(self.site))

    def test_no_rollback_when_previous_is_missing(self):
        with self.assertRaisesRegex(ValueError, "versión anterior"):
            self.deploy()


if __name__ == "__main__":
    unittest.main()
