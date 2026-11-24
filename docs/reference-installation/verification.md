# Exercise the service before and after recovery

On the workstation, load the [variables and helpers](README.md#prepare-workstation-commands):

```bash
source "${WORK_DIR:?}/operations/workstation.env"
```

Keep synthetic working copies and payloads on A under `/root/bartl-reference/forgejo` and `/root/bartl-reference/paperless`, not on the workstation. Complete the [Forgejo browser checks](forgejo.md#verify-browser-access) first. Temporary comparison records exist only for this exercise.

## Prepare the remote test client

Open an SSH session from the workstation:

```bash
ssh -F "$WORK_DIR/clusters/cluster-1/base/ssh.config" cluster-1-node1
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
case "$code" in
  401|403|404) ;;
  *) printf 'Expected anonymous access denial, got HTTP %s\n' "$code" >&2; exit 1 ;;
esac
```

The authenticated checks above establish that this private route exists and works. Anonymous access must be denied; Forgejo may conceal the repository with 404 rather than return 403. A server failure is not denial evidence.

If any write fails, inspect its HTTP status and actual state, then resolve the cause with the responsible operator before proceeding. A successful Git push does not prove downstream repository functions are available.

Exit the SSH session and complete [Paperless source acceptance](#paperless-source-acceptance) below before continuing with [Lifecycle and recovery](recovery.md). Return to the relevant recovered-data checkpoints when directed there.

## Verify the same data after recovery

At the recovery chapter's restricted-acceptance checkpoint, after controlled hostname takeover but **before** either package's open/activate step, open a new session with `ssh -F "$WORK_DIR/clusters/cluster-1/base/ssh.config" cluster-1-node1`. Keep A and the administrator allowed through both HTTPS and Git SSH restrictions. The checks use fresh working copies: old client data cannot prove recovery.

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
git rev-parse HEAD > ../recovered-head
cd ..
cd recovered-http
git fetch origin main
git merge-base --is-ancestor "$(cat ../recovered-head)" origin/main
git show origin/main:recovered.txt
cd ..
code=$(curl --silent --show-error -o /dev/null -w '%{http_code}' \
  "$FORGEJO_URL/api/v1/repos/reference-admin/reference")
case "$code" in
  401|403|404) ;;
  *) printf 'Expected anonymous access denial, got HTTP %s\n' "$code" >&2; exit 1 ;;
esac
```

Clear old Forgejo and Keycloak browser cookies and sign in through “Sign in with keycloak”. Confirm that `reference-user` still reads the private repository without administration rights. Compare the realm/user/client IDs with the retained source record through native Keycloak administration. Keep ordinary access restricted until these checks and each package's new-work/subsequent-backup acceptance pass. Only then may the recovery coordinator execute the package activation steps. After the new write on C, switching back to B is no longer a lossless rollback.

Exit the SSH session and resume [Lifecycle and recovery](recovery.md) on the workstation.

## Paperless source acceptance

In the administrator's browser, log in to `https://$PAPERLESS_HOST` through Keycloak as the synthetic `reference-user`. In native Paperless administration select the resulting account; do not link accounts merely by matching email. Grant the [package's native reader permissions](https://github.com/bartlapp/bartl-paperless/blob/main/README.md#oidc-mfa-and-token-recovery), without staff/superuser status or document-change permission. Create a second synthetic active account `reference-denied` with the same model-level reader permissions but no document grants. The document grant below distinguishes the two.

On the workstation select their actual native usernames. The administrator name comes from the retained bootstrap input:

```bash
export PL_SOURCE_DIR="$WORK_DIR/clusters/cluster-2/applications/paperless"
PAPERLESS_ADMIN=$(cat "$PL_SOURCE_DIR/protected/bootstrap-user")
export PAPERLESS_READER=reference-user
export PAPERLESS_DENIED=reference-denied
printf 'PAPERLESS_ADMIN=%q\nPAPERLESS_READER=%q\nPAPERLESS_DENIED=%q\n' \
  "$PAPERLESS_ADMIN" "$PAPERLESS_READER" "$PAPERLESS_DENIED" \
  > "$WORK_DIR/operations/paperless-users.env"
CLIENT_SSH="$WORK_DIR/clusters/cluster-1/base/ssh.config"
ssh -F "$CLIENT_SSH" cluster-1-node1 'umask 077; mkdir -p /root/bartl-reference/paperless/tokens'
for actor in admin reader denied; do
  case "$actor" in
    admin) username=$PAPERLESS_ADMIN ;;
    reader) username=$PAPERLESS_READER ;;
    denied) username=$PAPERLESS_DENIED ;;
  esac
  kubectl --kubeconfig "$KB" -n paperless exec deployment/paperless -c paperless -- \
    uv run --no-project python manage.py drf_create_token "$username" |
    jq -Rer 'select(startswith("Generated token ")) |
      capture("^Generated token (?<token>[0-9a-f]+) for user ").token' |
    ssh -F "$CLIENT_SSH" cluster-1-node1 "umask 077; cat > /root/bartl-reference/paperless/tokens/$actor"
done
ssh -F "$CLIENT_SSH" cluster-1-node1 \
  'umask 077; cat > /root/bartl-reference/paperless/users.env' < "$WORK_DIR/operations/paperless-users.env"
ssh -F "$CLIENT_SSH" cluster-1-node1
```

These are native nonrotating token commands, not new passwords for SSO-only users. On A, prepare the test client and two small PDFs using standard shell tools:

```bash
cd /root/bartl-reference/paperless
umask 077
cat > client.env <<'ENV'
source /root/bartl-reference/installation.env
source /root/bartl-reference/paperless/users.env
export PAPERLESS_URL="https://$PAPERLESS_HOST"
export PAPERLESS_CLIENT=/root/bartl-reference/paperless
paperless_api() {
  local actor=$1
  shift
  printf 'header = "Authorization: Token %s"\n' "$(cat "$PAPERLESS_CLIENT/tokens/$actor")" |
    curl --config - --fail-with-body --silent --show-error "$@"
}
ENV
source client.env
for phase in baseline recovered; do
  body="BT /F1 18 Tf 50 750 Td (BARTL${phase^^} synthetic document) Tj ET"
  length=$(printf '%s' "$body" | wc -c)
  objects=(
    '<< /Type /Catalog /Pages 2 0 R >>'
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>'
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>'
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
    "$(printf '<< /Length %s >>\nstream\n%s\nendstream' "$length" "$body")"
  )
  printf '%%PDF-1.4\n' > "$phase.pdf"
  offsets=()
  for index in "${!objects[@]}"; do
    offsets+=("$(wc -c < "$phase.pdf")")
    printf '%s 0 obj\n%s\nendobj\n' "$((index+1))" "${objects[$index]}" >> "$phase.pdf"
  done
  xref=$(wc -c < "$phase.pdf")
  {
    printf 'xref\n0 6\n0000000000 65535 f \n'
    printf '%010d 00000 n \n' "${offsets[@]}"
    printf 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n%s\n%%%%EOF\n' "$xref"
  } >> "$phase.pdf"
done
paperless_api admin -F document=@baseline.pdf -F 'title=Synthetic Baseline' \
  "$PAPERLESS_URL/api/documents/post_document/" > baseline-task.json
TASK_ID=$(jq -er 'select(type=="string")' baseline-task.json)
paperless_api admin --get --data-urlencode "task_id=$TASK_ID" "$PAPERLESS_URL/api/tasks/"
```

Wait for successful consumption in the native task result/browser before continuing; an accepted upload is not a processed document. Diagnose a failed task rather than re-uploading it. Once settled, query the library and grant the selected reader access:

```bash
paperless_api admin --get --data-urlencode 'query=BARTLBASELINE' \
  "$PAPERLESS_URL/api/documents/" > baseline-search.json
DOC_ID=$(jq -er '.results | map(select(.title=="Synthetic Baseline")) |
  if length==1 then .[0].id else error("Expected one processed baseline") end' baseline-search.json)
paperless_api admin "$PAPERLESS_URL/api/users/?page_size=1000" > users.json
READER_ID=$(jq -er --arg name "$PAPERLESS_READER" '.results |
  map(select(.username==$name)) |
  if length==1 then .[0].id else error("Expected the selected reader") end' users.json)
paperless_api admin --request PATCH --json "$(jq -nc --argjson reader "$READER_ID" \
  '{set_permissions:{view:{users:[$reader],groups:[]},change:{users:[],groups:[]}}}')" \
  "$PAPERLESS_URL/api/documents/$DOC_ID/" > baseline-grant.json
printf '%s\n' "$DOC_ID" > baseline-id
paperless_api admin "$PAPERLESS_URL/api/documents/$DOC_ID/?full_perms=true" |
  jq '{id,title,content,owner,permissions,tags}' > baseline-document.json
jq --arg reader "$PAPERLESS_READER" --arg denied "$PAPERLESS_DENIED" '.results |
  map(select(.username==$reader or .username==$denied) |
    {id,username,is_active,is_staff,is_superuser,groups,user_permissions}) | sort_by(.id)' \
  users.json > baseline-users.json
jq -e 'length==2 and all(.[]; .is_active and (.is_staff|not) and (.is_superuser|not))' baseline-users.json
```

Run the next read/permission checks now. Repeat them after reconstruction with newly issued tokens; they compare the restored service, not cached client files.

### Paperless retained-data checks

On A, in a fresh SSH session if necessary:

```bash
cd /root/bartl-reference/paperless
source client.env
DOC_ID=$(cat baseline-id)
paperless_api admin "$PAPERLESS_URL/api/documents/$DOC_ID/?full_perms=true" |
  jq -S '{id,title,content,owner,permissions,tags}' > current-document.json
jq -S . baseline-document.json > expected-document.json
cmp expected-document.json current-document.json
paperless_api admin "$PAPERLESS_URL/api/users/?page_size=1000" |
  jq -S --arg reader "$PAPERLESS_READER" --arg denied "$PAPERLESS_DENIED" '.results |
    map(select(.username==$reader or .username==$denied) |
      {id,username,is_active,is_staff,is_superuser,groups,user_permissions}) | sort_by(.id)' \
  > current-users.json
jq -S . baseline-users.json > expected-users.json
cmp expected-users.json current-users.json
paperless_api reader "$PAPERLESS_URL/api/documents/$DOC_ID/download/?original=true" > original-readback.pdf
cmp baseline.pdf original-readback.pdf
paperless_api reader --get --data-urlencode 'query=BARTLBASELINE' "$PAPERLESS_URL/api/documents/" |
  jq -e --argjson id "$DOC_ID" '.results | map(.id) == [$id]'
paperless_api denied "$PAPERLESS_URL/api/documents/" | jq -e '.count == 0'
status=$(paperless_api denied -o /dev/null -w '%{http_code}' \
  "$PAPERLESS_URL/api/documents/$DOC_ID/download/?original=true" || test "$?" = 22)
test "$status" = 403
status=$(paperless_api reader --request PATCH --json '{"title":"Synthetic Unauthorized"}' \
  -o /dev/null -w '%{http_code}' "$PAPERLESS_URL/api/documents/$DOC_ID/" || test "$?" = 22)
test "$status" = 403
paperless_api admin "$PAPERLESS_URL/api/documents/$DOC_ID/" |
  jq -e '.title=="Synthetic Baseline"'
```

In a fresh browser session verify reader OIDC login, visible baseline content, search and original download without document modification or administrator access. Confirm the denied account cannot see the document. Exit the SSH session. Before source retirement continue with [Lifecycle and recovery](recovery.md); after reconstruction return to its Paperless checkpoint.

### Paperless new work after recovery

Only on accepted C under restricted access, use A:

```bash
cd /root/bartl-reference/paperless
source client.env
paperless_api admin -F document=@recovered.pdf -F 'title=Synthetic Recovered' \
  "$PAPERLESS_URL/api/documents/post_document/" > recovered-task.json
TASK_ID=$(jq -er 'select(type=="string")' recovered-task.json)
paperless_api admin --get --data-urlencode "task_id=$TASK_ID" "$PAPERLESS_URL/api/tasks/"
```

Wait for native consumption to complete, then verify new content and bytes:

```bash
paperless_api admin --get --data-urlencode 'query=BARTLRECOVERED' "$PAPERLESS_URL/api/documents/" |
  jq -e '.results | map(select(.title=="Synthetic Recovered")) |
    if length==1 then .[0] else error("Expected one recovered write") end' > recovered-document.json
NEW_ID=$(jq -er .id recovered-document.json)
paperless_api admin "$PAPERLESS_URL/api/documents/$NEW_ID/download/?original=true" > recovered-readback.pdf
cmp recovered.pdf recovered-readback.pdf
sha256sum recovered.pdf > recovered.sha256
```

Exit to the workstation and let the recovery coordinator request the subsequent capture. Do not open ordinary access until its independent backup-readback check also passes. These commands use the [native API](https://github.com/paperless-ngx/paperless-ngx/blob/c4d1b0c7325ea8782d87c64b6738ac39d313df2e/docs/api.md), not a qualification-only application interface.
