# Exercise the service before and after recovery

Recovery must preserve what people can do with the service, not just start its processes. Create a known set of synthetic data before recovery, then read it from fresh clients afterwards. Check permissions and new writes as well.

Before the first workstation command, load the [workstation session](README.md#resume-a-workstation-session):

```bash
source "${INSTALL_REPO:?}/.lab/workstation.env"
```

Keep every Git working copy, attachment and package in this chapter on A under `/root/bartl-reference/forgejo`. Do not download test data to the workstation. Before creating the data, complete the [browser acceptance checks](Forgejo.md#verify-browser-access): the native login must have created the Forgejo user `reference-user`.

## Prepare the remote test client

Open an SSH session from the workstation:

```bash
(cd "$INSTALL_REPO/.lab/a"; ssh -F .lab/ssh.config k3s)
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

`client.env` configures the test client and provides an authenticated curl helper. It does not install, back up, migrate or switch a service. Run the following blocks manually, in order.

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

Before the next write, read the repository's native state. Its owner must have admin access. The repository must be nonempty, must not be a mirror, and must have pull requests enabled and both branches present. If a request is rejected, do not mask the cause with a fixed delay or automatic write retries.

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

Stop if any write fails. Inspect the HTTP status and actual state, then resolve the cause with the responsible operator before proceeding. A successful Git push does not establish that every downstream native repository function is already available.

Leave the SSH session with `exit`, then continue with [Lifecycle and recovery](Recovery.md). Return to the remaining checks only at the recovery checkpoint identified there.

## Verify the same data after recovery

After the controlled hostname takeover, open a new session from the workstation with `(cd "$INSTALL_REPO/.lab/a"; ssh -F .lab/ssh.config k3s)` and load `client.env` on A. Use a fresh working copy: data left in the old client cannot prove that recovery succeeded.

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

Use SSH with the host key verified before recovery. Do not make a new trust decision. Also use `kubectl exec` from the workstation to read the public host key on C and compare it with `evidence/forgejo-host-key.pub`, as before recovery.

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

Clear the old Forgejo and Keycloak cookies in the browser, then sign in again through "Sign in with keycloak". The user must still be able to read the same private repository. Recovery must not turn read permission into administration. Compare the Keycloak user ID and client ID with the IDs retained on A. Open access to the restricted candidate only after these checks pass. Once you have written new data on C, switching back to B is no longer a lossless rollback.

When the client checks are complete, leave the SSH session with `exit` and resume the recovery chapter on the workstation.
