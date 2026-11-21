-- FREEPORT 008 / Neon branch-first review-only archive.
-- Apply only to the dedicated FREEPORT project, after the existing freeport schema.
-- Signature validation MUST happen in a trusted adapter using reLATTE native code.
-- These columns record claims and signed material; SQL alone cannot prove authenticity.
CREATE TABLE freeport.relatte_review_records (
  crossing_id text PRIMARY KEY CHECK (crossing_id ~ '^relatte-crossing-v0:[0-9a-f]{64}$'),
  source_world text NOT NULL CHECK (length(source_world) BETWEEN 1 AND 200),
  destination_world text NOT NULL CHECK (length(destination_world) BETWEEN 1 AND 200),
  source_key_fingerprint text NOT NULL CHECK (source_key_fingerprint ~ '^[0-9a-f]{64}$'),
  payload_sha256 text NOT NULL CHECK (payload_sha256 ~ '^[0-9a-f]{64}$'),
  payload_base64 text NOT NULL CHECK (length(payload_base64) BETWEEN 4 AND 22000),
  crossing_envelope jsonb NOT NULL CHECK (jsonb_typeof(crossing_envelope)='object'),
  response_bundle jsonb NOT NULL CHECK (jsonb_typeof(response_bundle)='object'),
  disposition text NOT NULL CHECK (disposition IN ('HOLD','REFUSE')),
  received_at timestamptz NOT NULL DEFAULT now(),
  CHECK (source_world <> destination_world)
);
CREATE INDEX relat_review_source_idx ON freeport.relatte_review_records(source_world,received_at);
CREATE INDEX relat_review_destination_idx ON freeport.relatte_review_records(destination_world,received_at);
REVOKE ALL ON freeport.relatte_review_records FROM PUBLIC;
COMMENT ON TABLE freeport.relatte_review_records IS
'Private append-only-by-API archive of reLATTE review-only crossing claims. SQL rows alone are not signature proof, local admission, or live broadcast.';

-- Next phase: a deliberately authenticated Neon Function (not the public Data API)
-- validates source AND receiver pinned keys and writes rows using a restricted
-- database role. Do not expose arbitrary insert/update/delete to browsers.
