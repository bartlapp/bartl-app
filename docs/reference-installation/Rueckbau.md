# Removal, Reinstall und Rückbau

Vor dem ersten Block auf der Workstation den [Sitzungseinstieg](README.md#workstation-sitzungen-wieder-aufnehmen) laden:

```bash
source "${INSTALL_REPO:?}/.lab/workstation.env"
```

Diese Übungen benutzen die bereits veröffentlichten und geprüften Backups. Sie unterscheiden die Entfernung eines Pakets von der Vernichtung seiner Daten. Kein Namespace wird vor abgeschlossener Finalisierung entfernt.

## Forgejo auf C entfernen und mit behaltenem Zustand starten

Voraussetzung: Die Publikation des neuen Backups nach Übernahme ist abgeschlossen. State- und Capture-PVC sowie Konfigurations- und Backup-Secrets behalten. Zuerst den Application-CR bei laufendem Controller löschen, danach Helm entfernen.

```bash
export KUBECONFIG="$KC"
kubectl -n forgejo get pvc -o json > evidence/forgejo-before-reinstall-pvc.json
helm upgrade forgejo "$FORGEJO_CHART" -n forgejo -f values/forgejo-c.yaml --set replicas=0
kubectl -n forgejo wait forgejoapplication/forgejo --for=condition=Stopped --timeout=10m
current_condition "$KC" forgejo forgejoapplication/forgejo Stopped
kubectl -n forgejo delete forgejoapplication forgejo --wait=true --timeout=20m
helm uninstall forgejo -n forgejo
kubectl -n forgejo get pvc,secret
helm install forgejo "$FORGEJO_CHART" -n forgejo -f values/forgejo-c.yaml --wait=legacy --timeout=5m
kubectl -n forgejo wait forgejoapplication/forgejo --for=condition=Ready --timeout=20m
current_condition "$KC" forgejo forgejoapplication/forgejo Ready
kubectl -n forgejo get pvc -o json | jq -e --slurpfile before evidence/forgejo-before-reinstall-pvc.json \
  '([.items[].metadata.uid]|sort)==([$before[0].items[].metadata.uid]|sort)'
```

Der neue Application-CR hat eine neue Owner-UID. Deshalb den installationsverwalteten SSH-Service erneut aus dem aktuellen Paket-Service-Selector erzeugen und anwenden; nicht den alten Selector behalten. Danach HTTPS-Zugriff, Git-SSH, die neue Datei `recovered.txt`, die Leseberechtigung von `reference-user` und den nativen Keycloak-Login erneut prüfen.

```bash
kubectl -n forgejo get service forgejo -o json | jq '{apiVersion:"v1",kind:"Service",
  metadata:{name:"forgejo-ssh",namespace:"forgejo"},spec:{type:"NodePort",
  externalTrafficPolicy:"Local",selector:.spec.selector,
  ports:[{name:"ssh",port:2222,targetPort:2222,nodePort:30222}]}}' > values/forgejo-ssh-c.json
kubectl apply -f values/forgejo-ssh-c.json
REQUEST="reinstalled-$(date -u +%Y%m%dT%H%M%SZ)"
kubectl -n forgejo annotate forgejoapplication forgejo forgejo.bartl.sh/backup-request="$REQUEST" --overwrite
kubectl -n forgejo wait forgejoapplication/forgejo --for=jsonpath='{.status.backup.request}'="$REQUEST" --timeout=20m
kubectl -n forgejo wait forgejoapplication/forgejo --for=jsonpath='{.status.backup.success}'=true --timeout=20m
kubectl -n forgejo get forgejoapplication/forgejo -o json |
  jq '.status.backup' > evidence/forgejo-reinstalled-backup.json
```

## Neue Arbeit aus dem anschließenden Backup lesen

Den bereinigten Snapshot-Beleg von der Workstation nach A übertragen und dort eine SSH-Sitzung öffnen. Keine Anwendungsdaten auf die Workstation laden.

```bash
jq -e '.success==true and (.snapshot|test("^[a-f0-9]{64}$"))' evidence/forgejo-reinstalled-backup.json
(cd "$INSTALL_REPO/.lab/a";
 scp -F .lab/ssh.config ../../evidence/forgejo-reinstalled-backup.json k3s:/root/bartl-reference/forgejo-reinstalled-backup.json
 ssh -F .lab/ssh.config k3s)
```

Auf A den nativen, qualifizierten Restic-Client herunterladen, verifizieren und den ausgewählten Punkt in ein neues Verzeichnis zurückspielen:

```bash
cd /root/bartl-reference
SNAPSHOT=$(jq -er .snapshot forgejo-reinstalled-backup.json)
umask 077
curl -fL -o restic.bz2 https://github.com/restic/restic/releases/download/v0.19.1/restic_0.19.1_linux_amd64.bz2
printf 'f415415624dcc452f2a02b8c33641791a8c6d6d3b65bbb3543fcf9a25151585c  restic.bz2\n' | sha256sum --check
bzip2 -d restic.bz2
chmod 700 restic
./restic version
source installation.env
export RESTIC_REPOSITORY="rest:https://$BACKUP_HOST/forgejo/"
export RESTIC_PASSWORD_FILE=/root/bartl-reference/repositories/forgejo/reader/password
export RESTIC_REST_USERNAME=reader
export RESTIC_REST_PASSWORD="$(cat repositories/forgejo/reader/restPassword)"
: "${SNAPSHOT:?Vollständige Kennung des geprüften Backups von C einsetzen}"
./restic restore "$SNAPSHOT" --target /root/bartl-reference/reinstalled-restore
repo=/root/bartl-reference/reinstalled-restore/capture/state/data/repositories/reference-admin/reference.git
actual=$(git --git-dir="$repo" show main:recovered.txt)
test "$actual" = 'New write on recovered C'
exit
```

Damit ist nicht nur ein weiterer Snapshot vorhanden: Die erst nach Übernahme auf C geschriebene Datei ist aus dessen anschließendem Backup nativ lesbar. Keinen Live-Mount des Forgejo-PVC für diese Kontrolle verwenden.

## Belege behalten, Testdaten verwerfen

Das Installationsrepo behält ausschließlich die expliziten Werte, festen Paketreferenzen, Secret-Verwahrungsreferenzen und bereinigten Nachweise. Kein `kubectl get secrets -o yaml`, keine Credentials, keine Datenbankdumps oder vollständigen Restores committen. Die kleinen Belege umfassen:

- aktuelle Application-Generationen, Versionen und Operationsergebnisse;
- finale und nach Recovery erzeugte vollständige Snapshot-IDs;
- verschiedene Source-/Target-PVC-UIDs;
- erhaltene fachliche Inhalte, native Identitäten und Rechte;
- bestätigten Source-Stop, Route und aktive Backup-Schedules;
- tatsächlichen Rückbau und Kostenobergrenze;
- Betreiber, Preisstand, Budget und Löschtermin sowie die tatsächlichen Secret-Verwahrungsreferenzen.

Auf der Workstation auch die vollständigen wirksamen Helm-Werte der verbleibenden Releases sichern. Die gestoppten B-Werte wurden bereits vor dem Ausschalten behalten. Diese Pakete erhalten ausschließlich Secret-Referenzen als Helm-Werte; dennoch jeden Export vor dem Commit auf Secret-Inhalte prüfen.

```bash
helm get values backup --kubeconfig "$KA" -n backup --all > values/restic-a-effective.yaml
helm get values keycloak --kubeconfig "$KC" -n keycloak --all > values/keycloak-c-effective.yaml
helm get values forgejo --kubeconfig "$KC" -n forgejo --all > values/forgejo-c-effective.yaml
```

Die synthetischen Daten, Credentials und Restores auf A werden beim Lab-Rückbau verworfen. Für eine dauerhaft zu übergebende Kundeninstallation müßten diese Recovery-Eingaben zuvor in kundenseitig kontrollierter geschützter Verwahrung liegen. Der abgeschlossene Lab-Durchlauf benötigt sie nicht nach dem Rückbau.

## Alle eigens angelegten Ressourcen löschen

Zurück auf der Workstation zuerst die drei eigenen DNS-A-Records entfernen. Vor jeder Löschung den Record lesen und seine Zugehörigkeit bestätigen. Keine Zone oder fremde Records löschen.

```bash
for host in "$BACKUP_HOST" "$KC_HOST" "$FORGEJO_HOST"; do
  subname=${host%.$DNS_ZONE}
  desec "$DNS_API/rrsets/$subname/A/" | jq .
  desec --request DELETE "$DNS_API/rrsets/$subname/A/"
  sleep 2
done
```

Dann für jeden der drei K3s-Checkouts die [vorhandene Rückbauanleitung](https://codeberg.org/bartlapp/base-k3s/src/branch/main/README.md#delete-the-entire-lab) vollständig ausführen. Sie bindet die Löschung an den jeweiligen Erzeugungsbeleg und prüft Server, Primary IPs und Firewall einzeln. Reihenfolge B, C, A; A zuletzt löschen, nachdem die notwendigen Belege behalten sind.

```bash
cd "$INSTALL_REPO/.lab/b"
# K3s: Delete the entire lab, einschließlich Identitätsprüfung und Bestätigung.
cd "$INSTALL_REPO/.lab/c"
# Denselben dokumentierten Rückbau für C ausführen.
cd "$INSTALL_REPO/.lab/a"
# Denselben dokumentierten Rückbau für A ausführen.
```

Das sind Verzeichniswechsel zur bestehenden Anleitung, keine ausführbare Gesamt-Löschroutine. Jede Löschung bleibt eine bewußte menschliche Station. Anschließend das Projektinventar prüfen und nur die Abwesenheit der eigenen Ressourcen als Erfolg werten:

```bash
hcloud server list
hcloud primary-ip list
hcloud firewall list
hcloud volume list
hcloud load-balancer list
unset KUBECONFIG
```

Aus Erzeugungs- und Löschzeit je Server die begonnenen Stunden einschließlich IPv4 berechnen, Preisstand und Reserve notieren und gegen das in `evidence/operator-inputs.txt` festgehaltene eigene Budget prüfen. Die endgültige Providerrechnung ist von dieser Obergrenze zu unterscheiden.

## Privates Installationsrepo abschließen

Erst nach Prüfung der Dateien explizite Pfade stagen. Das Repo hat keinen Remote und bleibt privat. Keine `.lab/`-Dateien oder Testdaten hinzufügen.

```bash
cd "$INSTALL_REPO"
git status --short --branch
git add README.md .gitignore installation.env values evidence
git diff --cached --stat
git diff --cached --check
```

Den staged Inhalt auf Secrets prüfen; dann ein lokaler Commit mit dem verifizierten Betriebsstand. Einen Remote nur nach gesonderter Festlegung von Ziel und privater Sichtbarkeit einrichten.

```bash
git commit -m 'Record verified reference installation'
```
