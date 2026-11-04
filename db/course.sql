CREATE TABLE IF NOT EXISTS forma_members (
 user_id text PRIMARY KEY REFERENCES forma_user(id) ON DELETE CASCADE,
 student_number varchar(40) NOT NULL DEFAULT '', group_name varchar(80) NOT NULL DEFAULT '',
 joined_at timestamptz NOT NULL DEFAULT now(), last_active timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS forma_documents (
 owner_id text NOT NULL REFERENCES forma_members(user_id) ON DELETE CASCADE, id text NOT NULL,
 kind text NOT NULL CHECK (kind IN ('project','playground')), data jsonb NOT NULL,
 name varchar(200) NOT NULL DEFAULT '', progress smallint NOT NULL DEFAULT 0,
 revision integer NOT NULL DEFAULT 1, mutation_id uuid NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
 PRIMARY KEY (owner_id,id)
);
CREATE TABLE IF NOT EXISTS forma_assets (
 owner_id text NOT NULL REFERENCES forma_members(user_id) ON DELETE CASCADE,
 hash char(64) NOT NULL, mime text NOT NULL, data bytea NOT NULL,
 byte_size integer NOT NULL CHECK(byte_size>0 AND byte_size<=2250000), created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (owner_id,hash)
);
CREATE TABLE IF NOT EXISTS forma_document_assets (
 owner_id text NOT NULL, document_id text NOT NULL, hash char(64) NOT NULL,
 PRIMARY KEY (owner_id,document_id,hash),
 FOREIGN KEY (owner_id,document_id) REFERENCES forma_documents(owner_id,id) ON DELETE CASCADE,
 FOREIGN KEY (owner_id,hash) REFERENCES forma_assets(owner_id,hash)
);
CREATE TABLE IF NOT EXISTS forma_submissions (
 id uuid PRIMARY KEY, owner_id text NOT NULL REFERENCES forma_members(user_id), project_id text NOT NULL,
 project_name varchar(200) NOT NULL, author_name varchar(200) NOT NULL, project_revision integer NOT NULL,
 version integer NOT NULL, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','changes_requested','reviewed')),
 comment text NOT NULL DEFAULT '', criteria jsonb NOT NULL DEFAULT '{}',
 reviewer_id text REFERENCES forma_user(id), reviewed_at timestamptz,
 UNIQUE(owner_id,project_id,project_revision), UNIQUE(owner_id,project_id,version)
);
CREATE TABLE IF NOT EXISTS forma_submission_assets (
 owner_id text NOT NULL, submission_id uuid NOT NULL REFERENCES forma_submissions(id) ON DELETE CASCADE,
 hash char(64) NOT NULL, PRIMARY KEY(submission_id,hash),
 FOREIGN KEY(owner_id,hash) REFERENCES forma_assets(owner_id,hash)
);
CREATE INDEX IF NOT EXISTS forma_submissions_owner ON forma_submissions(owner_id,created_at DESC);
CREATE INDEX IF NOT EXISTS forma_submissions_status ON forma_submissions(status,created_at DESC);
CREATE TABLE IF NOT EXISTS forma_api_limits (
 key text PRIMARY KEY, count integer NOT NULL, resets_at timestamptz NOT NULL
);
