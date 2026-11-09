# Fachliche Prüfung vor und nach Recovery

Vor dem ersten Block auf der Workstation den [Sitzungseinstieg](README.md#workstation-sitzungen-wieder-aufnehmen) laden:

```bash
source "${INSTALL_REPO:?}/.lab/workstation.env"
```

Alle Git-Arbeitskopien, Anhänge und Packages dieses Kapitels entstehen auf A unter `/root/bartl-reference/forgejo`. Keine Testdaten auf die Workstation laden. Vor Recovery muß der [native Login](Forgejo.md#browser-abnahme) den Forgejo-Benutzer `reference-user` angelegt haben.

## Remote-Testclient

Auf der Workstation die Sitzung öffnen:

```bash
(cd "$INSTALL_REPO/.lab/a"; ssh -F .lab/ssh.config k3s)
```

In der SSH-Sitzung auf A:

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

`client.env` enthält nur die sichtbare Einrichtung des Testclients und eine authentifizierte curl-Abkürzung. Es installiert, sichert, migriert oder schaltet keinen Dienst um. Die folgenden Stationen bleiben einzelne manuell ausgeführte Befehlsblöcke.

## Daten vor Recovery erzeugen

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

Vor dem nächsten Schreibaufruf den nativen Repository-Stand lesen. Der Repository-Owner muß Admin-Zugriff haben; das Repo darf weder leer noch Mirror sein, Pull Requests müssen aktiviert und beide Branches vorhanden sein. Nicht mit einer festen Schlafdauer oder automatischen Schreib-Retries über eine Ablehnung hinweggehen.

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

Stop-Punkt: Jeder Schreibaufruf muß erfolgreich sein. Bei einer Ablehnung den HTTP-Status und den tatsächlichen Zustand prüfen und die Ursache mit dem zuständigen Betreiber klären, statt eine Operation blind zu wiederholen. Ein erfolgreicher Git-Push belegt nicht automatisch, daß jede nachgelagerte native Repository-Funktion bereits verfügbar ist.

Vor dem Wechsel zu [Lifecycle und Recovery](Recovery.md) die SSH-Sitzung mit `exit` verlassen. Die folgenden Abschnitte erst am dort bezeichneten Recovery-Stop-Punkt ausführen.

## Dieselben Daten nach Recovery prüfen

Nach der kontrollierten Hostnamenübernahme auf der Workstation erneut `(cd "$INSTALL_REPO/.lab/a"; ssh -F .lab/ssh.config k3s)` ausführen und auf A `client.env` laden. Eine neue Arbeitskopie verwenden, damit nicht versehentlich der alte Clientbestand als Restore-Nachweis dient.

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

SSH mit dem schon vor Recovery verifizierten Hostschlüssel benutzen. Keine neue Vertrauensentscheidung treffen. Auf der Workstation zusätzlich den öffentlichen Hostschlüssel aus C mittels `kubectl exec` lesen und mit `evidence/forgejo-host-key.pub` vergleichen, wie vor der Recovery.

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

Im Browser alte Forgejo- und Keycloak-Cookies verwerfen und neu über "Sign in with keycloak" anmelden. Der Benutzer muß dasselbe private Repository lesen können. Seine Leseberechtigung darf durch Recovery nicht zu Administration werden. Keycloak-User-ID und Client-ID mit den auf A behaltenen IDs vergleichen. Erst nach diesen Kontrollen den eingeschränkten Kandidaten öffnen. Nach dem neuen Write ist ein Rückwechsel auf B keine verlustfreie Rücknahme mehr.

Nach Abschluß der Client-Prüfung die SSH-Sitzung mit `exit` verlassen und auf der Workstation im Recovery-Kapitel fortfahren.
