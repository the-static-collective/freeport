import json
from pathlib import Path
import http.server
import tempfile
import threading
import unittest
from urllib import request, error

from harbor import media_harbor as h

class HarborTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.home = Path(self.temp.name)
        self.root = self.home / "harbor"
        h.initialize(self.root)
        self.src = self.home / "strange name — source.mp4"
        self.payload = b"FAKE_MP4_DO_NOT_PLAY_" * 400
        self.src.write_bytes(self.payload)
        self.ingested = h.ingest(self.root, self.src)
        self.digest = self.ingested["sha256"]
        self.packet = self.home / "rights.json"
        self.packet.write_text(json.dumps(self.valid_packet()), encoding="utf-8")

    def tearDown(self):
        self.temp.cleanup()

    def valid_packet(self):
        return {
            "source_sha256": self.digest,
            "title": "Synthetic kitchen scene (not real footage)",
            "creator": "Synthetic test author",
            "attestor": "Test operator",
            "attestation": "I attest I have authority to grant the stated public reuse rights",
            "license_id": "CC-BY-4.0",
            "license_url": "https://creativecommons.org/licenses/by/4.0/",
            "attribution": "Synthetic test author — CC BY 4.0",
            "scope": {
                "public_redistribution": True,
                "derivatives": True,
                "commercial_use": True
            },
            "checks": {
                "source_platform_terms_checked": True,
                "all_contributors_authorized": True,
                "third_party_material_cleared": True,
                "likeness_voice_privacy_checked": True
            },
            "parents": []
        }

    def serve(self):
        cls = h.make_handler(self.root, "https://media.example.test",
                             "https://humkin.abundent.org", 0, 2)
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), cls)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        self.addCleanup(thread.join, 2)
        return "http://127.0.0.1:" + str(server.server_port)

    def do(self, url, headers=None, method=None):
        req = request.Request(url, headers=headers or {}, method=method)
        try:
            with request.urlopen(req, timeout=5) as resp:
                return resp.status, dict(resp.headers), resp.read()
        except error.HTTPError as ex:
            return ex.code, dict(ex.headers), ex.read()

    def test_private_ingest_cannot_be_requested(self):
        url = self.serve()
        public = url + "/media/" + self.digest + ".mp4"
        self.assertEqual(self.do(public)[0], 404)
        code, _, body = self.do(url + "/v1/catalog.json")
        self.assertEqual(code, 200)
        self.assertEqual(json.loads(body)["entries"], [])
        self.assertNotIn(b"strange name", body)
        self.assertEqual(self.do(url + "/hold/objects/" + self.digest)[0], 404)
        self.assertEqual(self.do(url + "/?path=/etc/passwd")[0], 404)
        self.assertEqual(self.do(url + "/%2e%2e/hold/objects")[0], 404)
        self.assertEqual(self.do(url + "/v1/catalog.json", method="POST")[0], 405)
        self.assertEqual(self.do(url + "/healthz")[2], b"ok\n")

    def test_operator_release_allows_exact_bytes_and_range(self):
        h.release(self.root, self.digest, self.packet, self.digest[:12])
        url = self.serve()
        cat_status, cat_headers, body = self.do(url + "/v1/catalog.json",
                                                 headers={"Origin":"https://humkin.abundent.org"})
        self.assertEqual(cat_status, 200)
        self.assertEqual(cat_headers["Access-Control-Allow-Origin"], "https://humkin.abundent.org")
        data = json.loads(body)
        self.assertEqual(len(data["entries"]), 1)
        entry = data["entries"][0]
        self.assertTrue(entry["rights"]["allow_remix"])
        self.assertEqual(entry["parents"], [])
        self.assertEqual(entry["asset_url"], "https://media.example.test/media/" + self.digest + ".mp4")
        self.assertNotIn("strange name", json.dumps(entry))
        direct = url + "/media/" + self.digest + ".mp4"
        code, headers, body = self.do(direct)
        self.assertEqual(code, 200)
        self.assertEqual(body, self.payload)
        self.assertEqual(headers["Accept-Ranges"], "bytes")
        self.assertEqual(headers["Content-Type"], "video/mp4")
        code, headers, body = self.do(direct, headers={"Range":"bytes=7-18"})
        self.assertEqual(code, 206)
        self.assertEqual(body, self.payload[7:19])
        self.assertEqual(headers["Content-Range"], "bytes 7-18/" + str(len(self.payload)))
        code, headers, body = self.do(direct, headers={"Range":"bytes=-6"})
        self.assertEqual(code, 206)
        self.assertEqual(body, self.payload[-6:])
        code, headers, body = self.do(direct, method="HEAD")
        self.assertEqual(code, 200)
        self.assertEqual(body, b"")
        self.assertEqual(int(headers["Content-Length"]), len(self.payload))
        code, headers, body = self.do(direct, headers={"Range":"bytes=9999999-"})
        self.assertEqual(code, 416)
        self.assertEqual(headers["Content-Range"], "bytes */" + str(len(self.payload)))
        code, _, body = self.do(direct, headers={"Range":"bytes=0-1,3-4"})
        self.assertEqual(code, 416)
        code, headers, _ = self.do(direct, headers={"Origin":"https://unrelated.example"})
        self.assertNotIn("Access-Control-Allow-Origin", headers)
        self.assertEqual(self.do(direct, method="PUT")[0], 405)

    def test_release_gate_refuses_mismatched_rights_and_overwrites(self):
        with self.assertRaises(ValueError):
            h.release(self.root, self.digest, self.packet, "no-confirm")
        packet = self.valid_packet()
        packet["checks"]["all_contributors_authorized"] = False
        self.packet.write_text(json.dumps(packet), encoding="utf-8")
        with self.assertRaises(ValueError):
            h.release(self.root, self.digest, self.packet, self.digest[:12])
        packet = self.valid_packet()
        packet["scope"]["commercial_use"] = False
        self.packet.write_text(json.dumps(packet), encoding="utf-8")
        with self.assertRaises(ValueError):
            h.release(self.root, self.digest, self.packet, self.digest[:12])
        self.packet.write_text(json.dumps(self.valid_packet()), encoding="utf-8")
        h.release(self.root, self.digest, self.packet, self.digest[:12])
        with self.assertRaises(ValueError):
            h.release(self.root, self.digest, self.packet, self.digest[:12])
        # Publication record is not sufficient if the public bytes disappear.
        pub = h.paths(self.root)["public_obj"] / (self.digest + ".mp4")
        pub.unlink()
        self.assertEqual(h.list_public(self.root, "https://test")["entries"], [])
        self.assertEqual(self.do(self.serve() + "/media/" + self.digest + ".mp4")[0], 404)

    def test_ingest_duplicate_and_verified_mirror(self):
        other = self.home / "different-name.mp4"
        other.write_bytes(self.payload)
        second = h.ingest(self.root, other)
        self.assertEqual(second["sha256"], self.digest)
        self.assertEqual(len(list(h.paths(self.root)["hold_obj"].iterdir())), 1)
        dest = self.home / "offline-mirror"
        result = h.mirror(self.root, dest)
        self.assertEqual(result["new_objects_and_records"], 2)
        self.assertEqual(h.mirror(self.root, dest)["new_objects_and_records"], 0)
        with self.assertRaises(ValueError):
            h.mirror(self.root, self.root / "nested")
        copied = dest / "hold" / "objects" / self.digest
        self.assertEqual(h.sha256(copied), self.digest)
        copied.write_bytes(b"tampered")
        with self.assertRaises(ValueError):
            h.mirror(self.root, dest)

if __name__ == "__main__":
    unittest.main()
