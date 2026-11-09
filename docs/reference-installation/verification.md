# Exercise the service before and after recovery

On the workstation, load the [session](README.md#resume-a-workstation-session):

```bash
source "${WORK_DIR:?}/.lab/workstation.env"
```

Keep all working copies, attachments and packages on A under `/root/bartl-reference/forgejo`, not on the workstation. Complete the [browser acceptance checks](forgejo.md#verify-browser-access) first: native login must have created `reference-user`.

## Prepare the remote test client

Open an SSH session from the workstation:

```bash
(cd "$WORK_DIR/.lab/a"; ssh -F .lab/ssh.config k3s)
```

Run the following on A:

```bash
source /root/bartl-reference/installation.env
cd /root/bartl-reference/forgejo
umask 077
cat > client.env <<'ENV'
source /root/bartl-reference/installation.env
export FORGEJO_URL="https://$FORGEJO_HOST"
export CLIENT=/root/bartl-reference/forgejo
forgejo_api() {
  printf 'user = "reference-admin:%s"\n' "$(cat "$CLIENT/bootstrap/password")" |
    curl --config - --fail-with-body --silent --show-error "$@"
}
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=http.extraHeader
export GIT_CONFIG_VALUE_0="Authorization: Basic $(printf 'reference-admin:%s' "$(cat "$CLIENT/bootstrap/password")" | base64 -w0)"
export GIT_AUTHOR_NAME='Reference operator' GIT_AUTHOR_EMAIL=reference-admin@example.invalid
export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME" GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"
export GIT_TERMINAL_PROMPT=0
export GIT_SSH_COMMAND="ssh -i $CLIENT/client-key -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=$CLIENT/known_hosts"
ENV
source client.env
```

## Create data before recovery

```bash
forgejo_api --json '{"name":"reference","private":true,"auto_init":false,"default_branch":"main"}' \
  "$FORGEJO_URL/api/v1/user/repos" > repository.json
ssh-keygen -q -t ed25519 -N '' -C reference-client -f client-key
printf '[%s]:30222 %s\n' "$FORGEJO_HOST" "$(cat host-key.pub)" > known_hosts
jq -n --rawfile key client-key.pub '{title:"Reference client",key:$key}' > client-key.json
forgejo_api --data-binary @client-key.json -H 'Content-Type: application/json' \
  "$FORGEJO_URL/api/v1/user/keys" > key-result.json
forgejo_api --request PUT --json '{"permission":"read"}' \
  "$FORGEJO_URL/api/v1/repos/reference-admin/reference/collaborators/reference-user"
git clone "$FORGEJO_URL/reference-admin/reference.git" http-client
cd http-client
git checkout -b main
git lfs install --local
git lfs track '*.bin'
printf 'Reference content before recovery\n' > README.md
openssl rand 65536 > payload.bin
sha256sum payload.bin > ../payload.sha256
git add .gitattributes README.md payload.bin
git commit -m 'Create reference data'
git push -u origin main
git checkout -b review
printf 'Reviewable change before recovery\n' > review.txt
git add review.txt
git commit -m 'Propose reference change'
git push origin review
cd ..
```

The checks below must confirm a nonempty, non-mirror repository with admin access, pull requests enabled and both branches present. Stop on failure; do not mask a rejected request with delays or automatic write retries.

```bash
forgejo_api "$FORGEJO_URL/api/v1/repos/reference-admin/reference" |
  jq -e '.empty==false and .mirror==false and .has_pull_requests==true and .permissions.admin==true'
forgejo_api "$FORGEJO_URL/api/v1/repos/reference-admin/reference/branches" |
  jq -e 'map(.name) | index("main")!=null and index("review")!=null'
forgejo_api --json '{"base":"main","head":"review","title":"Reference review","body":"Must survive recovery"}' \
  "$FORGEJO_URL/api/v1/repos/reference-admin/reference/pulls" > pull.json
forgejo_api --json '{"title":"Reference issue","body":"Must survive recovery"}' \
  "$FORGEJO_URL/api/v1/repos/reference-admin/reference/issues" > issue.json
ISSUE=$(jq -er .number issue.json)
printf 'Reference attachment\n' > attachment.txt
forgejo_api -F attachment=@attachment.txt \
  "$FORGEJO_URL/api/v1/repos/reference-admin/reference/issues/$ISSUE/assets" > attachment.json
printf 'Reference package\n' > package.txt
forgejo_api --upload-file package.txt \
  "$FORGEJO_URL/api/packages/reference-admin/generic/reference/1.0.0/package.txt"
forgejo_api --json '{"tag_name":"v1.0.0","target_commitish":"main","name":"Reference release"}' \
  "$FORGEJO_URL/api/v1/repos/reference-admin/reference/releases" > release.json
GIT_LFS_SKIP_SMUDGE=1 git clone \
  "ssh://git@$FORGEJO_HOST:30222/reference-admin/reference.git" ssh-client
cd ssh-client
printf 'SSH write before recovery\n' > ssh.txt
git add ssh.txt
git commit -m 'Exercise SSH write'
git push origin main
git rev-parse HEAD > ../initial-head
cd ..
code=$(curl --silent --show-error -o /dev/null -w '%{http_code}' \
  "$FORGEJO_URL/api/v1/repos/reference-admin/reference")
test "$code" = 403
```

If any write fails, inspect its HTTP status and actual state, then resolve the cause with the responsible operator before proceeding. A successful Git push does not prove downstream repository functions are available.

Exit the SSH session and continue with [Lifecycle and recovery](recovery.md). Return here at its verification checkpoint.

## Verify the same data after recovery

After the controlled hostname takeover, open a new session from the workstation with `(cd "$WORK_DIR/.lab/a"; ssh -F .lab/ssh.config k3s)`. The checks use fresh working copies: old client data cannot prove recovery.

```bash
cd /root/bartl-reference/forgejo
source client.env
forgejo_api "$FORGEJO_URL/api/v1/version" | jq -e '.version|startswith("17.0.1")'
GIT_LFS_SKIP_SMUDGE=1 git clone "$FORGEJO_URL/reference-admin/reference.git" recovered-http
cd recovered-http
git lfs install --local
git lfs pull
sha256sum --check ../payload.sha256
git merge-base --is-ancestor "$(cat ../initial-head)" HEAD
cat README.md ssh.txt
cd ..
ISSUE=$(jq -er .number issue.json)
PULL=$(jq -er .number pull.json)
forgejo_api "$FORGEJO_URL/api/v1/repos/reference-admin/reference/issues/$ISSUE" |
  jq -e '.title=="Reference issue" and .body=="Must survive recovery"'
forgejo_api "$FORGEJO_URL/api/v1/repos/reference-admin/reference/pulls/$PULL" |
  jq -e '.title=="Reference review" and .head.ref=="review" and .base.ref=="main"'
forgejo_api "$FORGEJO_URL/api/v1/repos/reference-admin/reference/issues/$ISSUE/assets" |
  jq -e --slurpfile expected attachment.json 'any(.[]; .uuid==$expected[0].uuid)'
forgejo_api "$(jq -er .browser_download_url attachment.json)" > recovered-attachment.txt
cmp attachment.txt recovered-attachment.txt
forgejo_api "$FORGEJO_URL/api/packages/reference-admin/generic/reference/1.0.0/package.txt" > recovered-package.txt
cmp package.txt recovered-package.txt
forgejo_api "$FORGEJO_URL/api/v1/repos/reference-admin/reference/releases/tags/v1.0.0" |
  jq -e '.name=="Reference release"'
```

Use the previously verified SSH host key; do not accept a new one. From the workstation, also read C's public host key with `kubectl exec` and compare it with `evidence/forgejo-host-key.pub`, as before recovery.

```bash
GIT_LFS_SKIP_SMUDGE=1 git clone \
  "ssh://git@$FORGEJO_HOST:30222/reference-admin/reference.git" recovered-ssh
cd recovered-ssh
printf 'New write on recovered C\n' > recovered.txt
git add recovered.txt
git commit -m 'Verify recovered write authority'
git push origin main
cd ..
code=$(curl --silent --show-error -o /dev/null -w '%{http_code}' \
  "$FORGEJO_URL/api/v1/repos/reference-admin/reference")
test "$code" = 403
```

Clear the old Forgejo and Keycloak browser cookies and sign in through "Sign in with keycloak". Confirm that `reference-user` can still read the private repository without gaining administration rights. Compare the Keycloak user and client IDs with those retained on A. Open access to the restricted candidate only after all checks pass. After the new write on C, switching back to B is no longer a lossless rollback.

Exit the SSH session and resume [Lifecycle and recovery](recovery.md) on the workstation.
