# Lifecycle, Recovery und kontrollierte Übernahme

Vor dem ersten Block auf der Workstation den [Sitzungseinstieg](README.md#workstation-sitzungen-wieder-aufnehmen) laden:

```bash
source "${INSTALL_REPO:?}/.lab/workstation.env"
```

Voraussetzung sind die installierten Anwendungen und [geprüften Testdaten](Pruefung.md). Alle Befehle dieses Kapitels laufen auf der Workstation in `$INSTALL_REPO`, soweit keine SSH-Sitzung bezeichnet ist. A bleibt Backup-Dienst, B ist Quelle, C das unabhängige Ziel.

## Jede Operation an ihrer aktuellen Generation prüfen

`kubectl wait` allein kann eine alte Condition akzeptieren. Nach jeder Änderung die Generation und die angeforderte Condition gemeinsam prüfen. Die folgende Funktion beobachtet nur; sie koordiniert keine Anwendung und verändert keinen Zustand:

```bash
current_condition() {
  local config="$1" namespace="$2" resource="$3" condition="$4"
  kubectl --kubeconfig "$config" -n "$namespace" get "$resource" -o json |
    jq -e --arg condition "$condition" '
      .metadata.generation as $g | .status.observedGeneration==$g and
      any(.status.conditions[]; .type==$condition and .status=="True" and .observedGeneration==$g)'
}
```

Bei `False`, Timeout oder einem fehlgeschlagenen Job anhalten. Status und Logs behalten. Keine Failure-Marker, Finalizer oder Restic-Locks löschen, um fortfahren zu können. Ein Timeout beendet den serverseitigen Job nicht.

## Erste Backups auf A veröffentlichen

```bash
export KUBECONFIG="$KB"
JOB="keycloak-backup-$(date -u +%Y%m%d%H%M%S)"
kubectl -n keycloak create job "$JOB" --from=cronjob/keycloak-backup
kubectl -n keycloak wait job/"$JOB" --for=condition=complete --timeout=30m
kubectl -n keycloak logs job/"$JOB" -c backup > evidence/keycloak-source-backup.json
jq -e '.snapshotID|test("^[a-f0-9]{64}$")' evidence/keycloak-source-backup.json
REQUEST="source-$(date -u +%Y%m%dT%H%M%SZ)"
kubectl -n forgejo annotate forgejoapplication forgejo \
  forgejo.bartl.sh/backup-request="$REQUEST" --overwrite
kubectl -n forgejo wait forgejoapplication/forgejo \
  --for=jsonpath='{.status.backup.request}'="$REQUEST" --timeout=20m
kubectl -n forgejo wait forgejoapplication/forgejo \
  --for=jsonpath='{.status.backup.success}'=true --timeout=20m
kubectl -n forgejo get forgejoapplication/forgejo -o json |
  jq '.status.backup' > evidence/forgejo-source-backup.json
jq -e '.success==true and (.snapshot|test("^[a-f0-9]{64}$"))' evidence/forgejo-source-backup.json
```

Keycloak prüft den nativen Dump und liest den veröffentlichten Snapshot vollständig zurück. Forgejo erfaßt seinen Zustand bei gestoppten Writern, nimmt den Dienst wieder auf und veröffentlicht den geschützten Capture. Helm-Erfolg ersetzt diese anwendungsspezifischen Belege nicht.

## Paket-Upgrades

Erst nach erfolgreichen Backups fortfahren. Die CRDs aus dem ausgewählten neuen Chart explizit aktualisieren; Helm übernimmt bestehende CRD-Definitionen nicht automatisch. Keine alten Paketdefaults mit `--reuse-values` übernehmen.

```bash
mkdir .lab/restic-chart .lab/keycloak-chart
helm pull "$RESTIC_CHART" --untar --untardir .lab/restic-chart
kubectl --kubeconfig "$KA" apply -f .lab/restic-chart/bartl-restic/crds/
helm upgrade backup "$RESTIC_CHART" --kubeconfig "$KA" -n backup \
  --reset-values -f values/restic-a.yaml --wait=legacy --timeout=5m
kubectl --kubeconfig "$KA" -n backup rollout status deployment/backup-restic-controller --timeout=3m
kubectl --kubeconfig "$KA" -n backup wait resticapplication/backup-restic --for=condition=Ready --timeout=30m
current_condition "$KA" backup resticapplication/backup-restic Ready
helm pull "$KEYCLOAK_CHART" --untar --untardir .lab/keycloak-chart
kubectl --kubeconfig "$KB" apply -f .lab/keycloak-chart/bartl-keycloak/crds/
helm upgrade keycloak "$KEYCLOAK_CHART" --kubeconfig "$KB" -n keycloak \
  --reset-values -f values/keycloak-b.yaml --wait=legacy --timeout=10m
kubectl --kubeconfig "$KB" -n keycloak wait keycloakapplication/keycloak --for=condition=Ready --timeout=10m
current_condition "$KB" keycloak keycloakapplication/keycloak Ready
kubectl --kubeconfig "$KB" -n keycloak get keycloakapplication/keycloak \
  -o jsonpath='{.status.packageRelease}{"\n"}'
```

Erwartet werden Restic 0.2.1 und Keycloak-Paket 0.5.1. Keycloak bleibt nativ 26.6.2. Der native Forgejo-Upgrade erfolgt später bei der Rekonstruktion auf C, nicht durch Änderung unabhängiger Image-Tags.

## Restart ohne Backup-Zugriff

Restic über seine Anwendungsschnittstelle stoppen, dann die beiden Serving-Deployments neu starten. Dies ist ein Restart-Test, keine alternative Stop-Schnittstelle und kein Skalieren gegen die Controller-Absicht.

```bash
helm upgrade backup "$RESTIC_CHART" --kubeconfig "$KA" -n backup \
  -f values/restic-a.yaml --set application.replicas=0
kubectl --kubeconfig "$KA" -n backup wait resticapplication/backup-restic --for=condition=Stopped --timeout=5m
current_condition "$KA" backup resticapplication/backup-restic Stopped
kubectl --kubeconfig "$KB" -n keycloak rollout restart deployment/keycloak
kubectl --kubeconfig "$KB" -n keycloak rollout status deployment/keycloak --timeout=10m
kubectl --kubeconfig "$KB" -n forgejo rollout restart deployment/forgejo
kubectl --kubeconfig "$KB" -n forgejo rollout status deployment/forgejo --timeout=5m
curl --fail --silent --show-error "https://$KC_HOST/realms/reference/.well-known/openid-configuration" |
  jq -e --arg issuer "https://$KC_HOST/realms/reference" '.issuer==$issuer'
helm upgrade backup "$RESTIC_CHART" --kubeconfig "$KA" -n backup -f values/restic-a.yaml
kubectl --kubeconfig "$KA" -n backup wait resticapplication/backup-restic --for=condition=Ready --timeout=30m
current_condition "$KA" backup resticapplication/backup-restic Ready
```

## Dauerhafter Stop und Start

Forgejo vor Keycloak stoppen; in umgekehrter Reihenfolge starten. Die unveränderten Werte enthalten noch die laufende Absicht. Für einen dauerhaften Betriebsstop außerhalb dieser kurzen Übung auch die Werte versionieren.

```bash
helm upgrade forgejo "$FORGEJO_CHART" --kubeconfig "$KB" -n forgejo \
  -f values/forgejo-b.yaml --set replicas=0
kubectl --kubeconfig "$KB" -n forgejo wait forgejoapplication/forgejo --for=condition=Stopped --timeout=10m
current_condition "$KB" forgejo forgejoapplication/forgejo Stopped
helm upgrade keycloak "$KEYCLOAK_CHART" --kubeconfig "$KB" -n keycloak \
  -f values/keycloak-b.yaml --set application.replicas=0
kubectl --kubeconfig "$KB" -n keycloak wait keycloakapplication/keycloak --for=condition=Stopped --timeout=10m
current_condition "$KB" keycloak keycloakapplication/keycloak Stopped
helm upgrade keycloak "$KEYCLOAK_CHART" --kubeconfig "$KB" -n keycloak -f values/keycloak-b.yaml
kubectl --kubeconfig "$KB" -n keycloak wait keycloakapplication/keycloak --for=condition=Ready --timeout=10m
current_condition "$KB" keycloak keycloakapplication/keycloak Ready
helm upgrade forgejo "$FORGEJO_CHART" --kubeconfig "$KB" -n forgejo -f values/forgejo-b.yaml
kubectl --kubeconfig "$KB" -n forgejo wait forgejoapplication/forgejo --for=condition=Ready --timeout=10m
current_condition "$KB" forgejo forgejoapplication/forgejo Ready
```

## Finale Schreibgrenze festlegen und B ausschalten

Ab hier keine weiteren Benutzer- oder Konfigurationsänderungen auf B zulassen. Zuerst HTTP- und SSH-Zugänge zu Forgejo entfernen. Der Keycloak-Stop beendet anschließend Identitätsänderungen. Die beiden Snapshots bleiben getrennte, explizit dokumentierte Recovery-Punkte; die Sequenz behauptet keinen atomaren Stack-Snapshot.

```bash
export KUBECONFIG="$KB"
helm upgrade forgejo "$FORGEJO_CHART" -n forgejo -f values/forgejo-b.yaml --set ingress.enabled=false
kubectl -n forgejo delete service forgejo-ssh
kubectl -n forgejo wait --for=delete ingress/forgejo --timeout=5m
REQUEST="final-$(date -u +%Y%m%dT%H%M%SZ)"
kubectl -n forgejo annotate forgejoapplication forgejo forgejo.bartl.sh/backup-request="$REQUEST" --overwrite
kubectl -n forgejo wait forgejoapplication/forgejo --for=jsonpath='{.status.backup.request}'="$REQUEST" --timeout=20m
kubectl -n forgejo wait forgejoapplication/forgejo --for=jsonpath='{.status.backup.success}'=true --timeout=20m
kubectl -n forgejo get forgejoapplication/forgejo -o json | jq '.status.backup' > evidence/forgejo-final-backup.json
helm upgrade forgejo "$FORGEJO_CHART" -n forgejo -f values/forgejo-b.yaml --set replicas=0,ingress.enabled=false
kubectl -n forgejo wait forgejoapplication/forgejo --for=condition=Stopped --timeout=10m
current_condition "$KB" forgejo forgejoapplication/forgejo Stopped
helm upgrade keycloak "$KEYCLOAK_CHART" -n keycloak -f values/keycloak-b.yaml \
  --set application.replicas=0,ingress.enabled=false,backup.suspend=true
kubectl -n keycloak wait keycloakapplication/keycloak --for=condition=Stopped --timeout=10m
current_condition "$KB" keycloak keycloakapplication/keycloak Stopped
JOB="keycloak-final-$(date -u +%Y%m%d%H%M%S)"
kubectl -n keycloak create job "$JOB" --from=cronjob/keycloak-backup
kubectl -n keycloak wait job/"$JOB" --for=condition=complete --timeout=30m
kubectl -n keycloak logs job/"$JOB" -c backup > evidence/keycloak-final-backup.json
jq -e '.snapshotID|test("^[a-f0-9]{64}$")' evidence/keycloak-final-backup.json
kubectl -n keycloak get pvc -o json > evidence/keycloak-source-pvc.json
kubectl -n forgejo get pvc -o json > evidence/forgejo-source-pvc.json
```

Jetzt die gestoppte Absicht in den B-Wertedateien festhalten, damit eine spätere Anwendung dieser Dateien B nicht reaktiviert. Nur die gezeigten Felder in der vorhandenen Datei ändern; alle übrigen Werte behalten. Die mit `-` markierten Zeilen zeigen den bisherigen, die mit `+` markierten den gewünschten Wert. Die Markierungen selbst gehören nicht in die YAML-Datei.

In `values/keycloak-b.yaml`:

```diff
 application:
-  replicas: 1
+  replicas: 0
 ingress:
-  enabled: true
+  enabled: false
 backup:
   suspend: true
```

In `values/forgejo-b.yaml`:

```diff
-replicas: 1
+replicas: 0
 ingress:
-  enabled: true
+  enabled: false
```

Keycloaks dokumentierter source-unabhängiger Recovery-Test hält erst den Controller an und dann PostgreSQL. Die Anwendung ist bereits über ihre eigene Schnittstelle gestoppt. Danach die ganze VM über die unabhängig erreichbare Hetzner-API ausschalten:

```bash
helm get values keycloak --kubeconfig "$KB" -n keycloak --all > values/keycloak-b-effective.yaml
helm get values forgejo --kubeconfig "$KB" -n forgejo --all > values/forgejo-b-effective.yaml
kubectl -n keycloak scale deployment/keycloak-controller --replicas=0
kubectl -n keycloak wait --for=delete pod -l app.kubernetes.io/name=keycloak-controller --timeout=5m
kubectl -n keycloak scale statefulset/keycloak-db --replicas=0
kubectl -n keycloak wait --for=delete pod/keycloak-db-0 --timeout=5m
hcloud server poweroff "$INSTALLATION-b"
hcloud server describe "$INSTALLATION-b" --output json | jq -e '.status=="off"'
```

Stop-Punkt: Ohne bestätigten Stop und erfolgreiche finale Backups keine Aktivierung von C. DNS allein ist kein Fencing. B bleibt bis zum Rückbau ausgeschaltet; nach neuen Writes auf C niemals als vermeintlichen Rollback wieder starten.

## C isolieren und Eingaben rekonstruieren

C verwendet neue PVCs und neue PostgreSQL-Credentials. Installation, Instanz, Hostnamen, Forgejo-Identity-Secrets, Repository-Schlüssel und der gesicherte Keycloak-Recovery-Administrator bleiben unverändert. Keine Source-PVCs mounten und keine Daten aus B kopieren.

C erhält zunächst nur HTTPS-Zugriff von Workstation, Testclient A und seiner eigenen öffentlichen Adresse. HTTP bleibt für ACME erreichbar. Die Anwendungen bekommen keine zusätzliche Keycloak-Maintenance-Allowlist: diese würde auch die benötigte native Kommunikation zwischen Forgejo und Keycloak einschränken.

```bash
hcloud firewall delete-rule "$INSTALLATION-c" --direction in --protocol tcp --port 443 --source-ips 0.0.0.0/0,::/0
hcloud firewall add-rule "$INSTALLATION-c" --direction in --protocol tcp --port 443 \
  --source-ips "$ADMIN_IP/32,$A_IP/32,$C_IP/32"
export KUBECONFIG="$KC"
kubectl create namespace keycloak
kubectl create namespace forgejo
```

Auf A neue DB-Credentials anlegen:

```bash
(cd .lab/a; ssh -F .lab/ssh.config k3s)
```

In der geöffneten SSH-Sitzung auf A:

```bash
umask 077
cd /root/bartl-reference/keycloak
mkdir database-c database-admin-c
printf keycloak > database-c/username
printf keycloak > database-c/database
openssl rand -hex 32 | tr -d '\n' > database-c/password
printf postgres > database-admin-c/username
openssl rand -hex 32 | tr -d '\n' > database-admin-c/password
exit
```

Zurück auf der Workstation die geschützten Eingaben von A unmittelbar in C anlegen. Kein neuer Bootstrap-Administrator und keine neuen Forgejo-Identity-Secrets:

```bash
(cd .lab/a; ssh -F .lab/ssh.config k3s 'bash -se' <<'REMOTE'
set -euo pipefail
cd /root/bartl-reference/keycloak
kubectl -n keycloak create secret generic keycloak-database --from-file=database-c/ --dry-run=client -o yaml
printf '\n---\n'
kubectl -n keycloak create secret generic keycloak-database-admin --from-file=database-admin-c/ --dry-run=client -o yaml
printf '\n---\n'
kubectl -n keycloak create secret generic keycloak-recovery --from-file=bootstrap/ --dry-run=client -o yaml
for app in keycloak forgejo; do
  for role in reader writer; do
    printf '\n---\n'
    kubectl -n "$app" create secret generic "$app-backup-$role" \
      --from-file="/root/bartl-reference/repositories/$app/$role/" --dry-run=client -o yaml
  done
done
printf '\n---\n'
kubectl -n forgejo create secret generic forgejo-configuration \
  --from-file=app.ini=/root/bartl-reference/forgejo/app-b.ini --dry-run=client -o yaml
REMOTE
) | kubectl --kubeconfig "$KC" create -f -
cat > values/keycloak-c.yaml <<EOF
identity:
  installation: "$INSTALLATION"
  instance: keycloak
configuration:
  hostname: "https://$KC_HOST"
application:
  replicas: 1
database:
  secretName: keycloak-database
  adminSecretName: keycloak-database-admin
  size: 5Gi
recoveryAdminSecret: keycloak-recovery
ingress:
  enabled: false
  className: traefik
  tlsSecretName: keycloak-tls
  maintenance: false
  administratorSourceRanges: ["$ADMIN_IP/32", "$A_IP/32"]
  controllerNamespace: kube-system
backup:
  repository: "rest:https://$BACKUP_HOST/keycloak/"
  readerSecret: keycloak-backup-reader
  writerSecret: keycloak-backup-writer
  schedule: "0 2 * * *"
  timeZone: Europe/Berlin
  suspend: true
EOF
cat > values/forgejo-c.yaml <<EOF
identity:
  installation: "$INSTALLATION"
  instance: forgejo
version: "17.0.1"
replicas: 1
claim: forgejo-state
stagingClaim: forgejo-capture
configurationSecret: forgejo-configuration
backup:
  repository: "rest:https://$BACKUP_HOST/forgejo/"
  readerSecret: forgejo-backup-reader
  writerSecret: forgejo-backup-writer
  schedule: "0 2 * * *"
  timeZone: Europe/Berlin
ingress:
  enabled: false
  host: "$FORGEJO_HOST"
  className: traefik
  tlsSecret: forgejo-tls
ssh:
  port: 2222
EOF
```

Die vollständigen Zielwerte behalten die expliziten Installationsentscheidungen, nicht alte Paketdefaults. Die vorhandenen Source-Hostnamen werden auf C übernommen. Keycloak startet mit neuen Datenbank-Credentials, aber dem gesicherten Recovery-Administrator; Forgejo übernimmt sein geschütztes natives Konfigurationsmaterial von A.

```bash
export KUBECONFIG="$KC"
helm install keycloak "$KEYCLOAK_CHART" -n keycloak -f values/keycloak-c.yaml --wait=legacy --timeout=30m
kubectl -n keycloak wait keycloakapplication/keycloak --for=condition=Ready --timeout=20m
current_condition "$KC" keycloak keycloakapplication/keycloak Ready
kubectl -n keycloak get keycloakapplication/keycloak -o json > evidence/keycloak-recovery.json
jq -e --slurpfile receipt evidence/keycloak-final-backup.json \
  '.status.operation.snapshot.id==$receipt[0].snapshotID' evidence/keycloak-recovery.json
for claim in forgejo-state forgejo-capture; do
  jq -n --arg name "$claim" '{apiVersion:"v1",kind:"PersistentVolumeClaim",metadata:{name:$name,namespace:"forgejo"},
    spec:{accessModes:["ReadWriteOnce"],storageClassName:"local-path",resources:{requests:{storage:"8Gi"}}}}' | kubectl create -f -
done
helm install forgejo "$FORGEJO_CHART" -n forgejo -f values/forgejo-c.yaml --wait=legacy --timeout=5m
kubectl -n forgejo wait forgejoapplication/forgejo --for=condition=Ready --timeout=20m
current_condition "$KC" forgejo forgejoapplication/forgejo Ready
kubectl -n forgejo get forgejoapplication/forgejo -o json > evidence/forgejo-recovery.json
kubectl -n forgejo logs -l forgejo.bartl.sh/role=prepare --all-containers=true --tail=-1 > evidence/forgejo-recovery-native.log
```

Der letzte JSON-Beleg im Forgejo-Prepare-Log muß den finalen Snapshot aus `evidence/forgejo-final-backup.json`, dieselbe logische Identity und Version 17.0.1 nennen. Die eigentliche Rekonstruktion und native Migration erledigt das Paket. Es gibt keinen Restore-Schalter und keine manuelle Datenbankmigration.

```bash
for app in keycloak forgejo; do
  kubectl -n "$app" get pvc -o json > "evidence/$app-target-pvc.json"
  jq -e --slurpfile source "evidence/$app-source-pvc.json" \
    'all(.items[]; . as $target | all($source[0].items[];
      .metadata.uid!=$target.metadata.uid and .spec.volumeName!=$target.spec.volumeName))' \
    "evidence/$app-target-pvc.json"
done
hcloud server describe "$INSTALLATION-b" --output json | jq -e '.status=="off"'
```

## Hostnamen kontrolliert auf C übernehmen

Bei deSEC die bestehenden A-Records einzeln lesen, ihre Zugehörigkeit und bisherige B-Adresse bestätigen und dann auf C ändern. Die komplette vorherige TTL abwarten, nicht nur eine erfolgreiche API-Antwort. Die hier angelegten Records haben 900 Sekunden TTL. Vor einer neuen HTTP-01-Anforderung zusätzlich beide autoritativen und beide öffentlichen Resolver prüfen.

```bash
for host in "$KC_HOST" "$FORGEJO_HOST"; do
  subname=${host%.$DNS_ZONE}
  desec "$DNS_API/rrsets/$subname/A/" | jq .
  desec --request PATCH "$DNS_API/rrsets/$subname/A/" \
    --json "$(jq -nc --arg ip "$C_IP" '{ttl:900,records:[$ip]}')"
  sleep 2
done
sleep 900
for host in "$KC_HOST" "$FORGEJO_HOST"; do
  for resolver in ns1.desec.io ns2.desec.org 1.1.1.1 8.8.8.8; do
    dig @"$resolver" "$host" A +noall +comments +answer
  done
done
```

Alle Antworten müssen C nennen. Die Anwendungen bleiben währenddessen hinter der eingeschränkten Firewall. Danach die behaltenen TLS-Manifeste auf C anwenden und Ready abwarten:

```bash
export KUBECONFIG="$KC"
kubectl apply -f values/keycloak-tls.yaml
kubectl apply -f values/forgejo-tls.yaml
kubectl -n keycloak wait certificate/keycloak-tls --for=condition=Ready --timeout=15m
kubectl -n forgejo wait certificate/forgejo-tls --for=condition=Ready --timeout=15m
helm upgrade keycloak "$KEYCLOAK_CHART" -n keycloak -f values/keycloak-c.yaml \
  --set ingress.enabled=true,ingress.maintenance=false
helm upgrade forgejo "$FORGEJO_CHART" -n forgejo -f values/forgejo-c.yaml --set ingress.enabled=true
kubectl -n keycloak wait keycloakapplication/keycloak --for=condition=Ready --timeout=10m
kubectl -n forgejo wait forgejoapplication/forgejo --for=condition=Ready --timeout=10m
current_condition "$KC" keycloak keycloakapplication/keycloak Ready
current_condition "$KC" forgejo forgejoapplication/forgejo Ready
curl --fail --silent --show-error "https://$KC_HOST/realms/reference/.well-known/openid-configuration" |
  jq -e --arg issuer "https://$KC_HOST/realms/reference" '.issuer==$issuer'
```

Bei einer invaliden ACME-Anforderung nicht blind erneut anwenden. `kubectl describe challenge -n keycloak` zeigt unter anderem, welche Adresse die CA tatsächlich erreichte. Erst die DNS- oder Routing-Ursache klären. Falls danach eine native Neuanforderung nötig ist, das [cert-manager-Verfahren](https://cert-manager.io/docs/usage/certificate/) mit der zuständigen Administration ausführen und erneut Certificate-Ready abwarten. Keine TLS-Ausnahme verwenden.

Nur nach geklärter Ursache und Freigabe durch die zuständige Administration ist folgende native Neuanforderung vorgesehen. Auf der Workstation die Sitzung auf C öffnen:

```bash
(cd "$INSTALL_REPO/.lab/c"; ssh -F .lab/ssh.config k3s)
```

In dieser SSH-Sitzung den festen Upstream-Client herunterladen und verifizieren:

```bash
umask 077
mkdir -p /root/cmctl-download
cd /root/cmctl-download
curl -fL -o cmctl https://github.com/cert-manager/cmctl/releases/download/v2.6.2/cmctl_linux_amd64
printf '690f38f71bb5540ea98bc6a33e1ab0caad246a3c2b932a84d4671369b6736fe4  cmctl\n' | sha256sum --check
chmod 700 cmctl
KUBECONFIG=/etc/rancher/k3s/k3s.yaml ./cmctl renew keycloak-tls -n keycloak
exit
```

Zurück auf der Workstation `kubectl --kubeconfig "$KC" -n keycloak wait certificate/keycloak-tls --for=condition=Ready --timeout=15m` ausführen. Erst danach fortfahren.

Den SSH-Service auf C aus dessen aktuellem Paket-Service-Selector erzeugen. Den öffentlichen Hostschlüssel separat speichern, damit der ursprüngliche Vertrauensanker erhalten bleibt:

```bash
export KUBECONFIG="$KC"
kubectl -n forgejo get service forgejo -o json | jq '{apiVersion:"v1",kind:"Service",
  metadata:{name:"forgejo-ssh",namespace:"forgejo"},spec:{type:"NodePort",
  externalTrafficPolicy:"Local",selector:.spec.selector,
  ports:[{name:"ssh",port:2222,targetPort:2222,nodePort:30222}]}}' > values/forgejo-ssh-c.json
kubectl apply -f values/forgejo-ssh-c.json
hcloud firewall add-rule "$INSTALLATION-c" --direction in --protocol tcp --port 30222 \
  --source-ips "$ADMIN_IP/32,$A_IP/32"
POD=$(kubectl -n forgejo get pod -l forgejo.bartl.sh/role=app -o jsonpath='{.items[0].metadata.name}')
kubectl -n forgejo exec "$POD" -- cat /data/data/ssh/forgejo.ed25519.pub \
  > evidence/forgejo-recovered-host-key.pub
cmp evidence/forgejo-host-key.pub evidence/forgejo-recovered-host-key.pub
```

Bei identischen Schlüsseln bleibt `cmp` ohne Ausgabe und endet mit Exitcode 0. Bei einer Abweichung anhalten und die Ursache mit dem zuständigen Betreiber klären; den ursprünglichen Schlüssel nicht ersetzen. Anschließend sämtliche [Recovery-Funktionsprüfungen](Pruefung.md#dieselben-daten-nach-recovery-prüfen) einschließlich frischem Browser-Login durchführen.

Stop-Punkt: Ohne erfolgreichen nativen Login durch den vollständig wiederhergestellten Stack, unveränderte Identitäten und Rechte, erhaltene Daten und erfolgreiche neue Writes keine Öffnung. Ein `500` beim OIDC-Start verlangt Forgejo-Logs; insbesondere darf eine zusätzliche Keycloak-Maintenance-Regel die Discovery nicht blockieren. Eine vorhandene Middleware ist allein kein Wirksamkeitsbeleg: maßgeblich ist ihre Referenz am Ingress.

## Restic mit behaltenem PVC neu installieren

Nur Restic 0.2.1 darf die Finalisierung ausführen. Keine alten 0.2.0-Finalizer umgehen. Während dieser Station keine Backups, Restore-Jobs oder Maintenance parallel starten.

```bash
export KUBECONFIG="$KA"
kubectl -n backup get pvc repository -o json > evidence/restic-pvc-before-reinstall.json
helm upgrade backup "$RESTIC_CHART" -n backup -f values/restic-a.yaml --set application.replicas=0
kubectl -n backup wait resticapplication/backup-restic --for=condition=Stopped --timeout=5m
current_condition "$KA" backup resticapplication/backup-restic Stopped
kubectl -n backup delete resticapplication backup-restic --wait=true --timeout=3m
helm uninstall backup -n backup --wait --timeout=3m
kubectl -n backup get pvc repository
kubectl -n backup get secret repository-tls keycloak-repository-key forgejo-repository-key
helm install backup "$RESTIC_CHART" -n backup -f values/restic-a.yaml --wait=legacy --timeout=5m
kubectl -n backup wait resticapplication/backup-restic --for=condition=Ready --timeout=30m
current_condition "$KA" backup resticapplication/backup-restic Ready
kubectl -n backup get pvc repository -o json |
  jq -e --slurpfile before evidence/restic-pvc-before-reinstall.json '.metadata.uid==$before[0].metadata.uid'
for app in keycloak forgejo; do
  helm template backup "$RESTIC_CHART" -n backup -f values/restic-a.yaml \
    --set maintenance.enabled=true --set maintenance.name="check-$app" \
    --set maintenance.repository="$app" --set maintenance.action=check \
    --set maintenance.host="$BACKUP_HOST" --set maintenance.credentialsSecret="$app-repository-admin" \
    --show-only templates/maintenance.yaml | kubectl -n backup apply -f -
  kubectl -n backup wait job/backup-restic-check-"$app" --for=condition=complete --timeout=30m
  kubectl -n backup logs job/backup-restic-check-"$app" > "evidence/restic-check-$app.log"
done
```

Die Maintenance-Jobs führen `check --read-data` mit separaten administrativen Credentials und nativen Locks aus. Der nachfolgende Backup-Betrieb und native Abruf aus den behaltenen Repositories werden in den folgenden Stationen geprüft. Keine automatische Retention oder Löschung alter Snapshots einführen.

## C öffnen und anschließend sichern

Jetzt die laufende Absicht in den C-Wertedateien festhalten. Nur die gezeigten Felder in der vorhandenen Datei ändern; alle übrigen Werte behalten. Wie oben zeigen `-` und `+` den bisherigen und den gewünschten Wert; die Markierungen nicht in die YAML-Datei übernehmen.

In `values/keycloak-c.yaml`:

```diff
 ingress:
-  enabled: false
+  enabled: true
   maintenance: false
 backup:
-  suspend: true
+  suspend: false
```

In `values/forgejo-c.yaml`:

```diff
 ingress:
-  enabled: false
+  enabled: true
```

B-Werte bleiben gestoppt. HTTPS öffentlich öffnen; Git-SSH bleibt für die vorgesehenen Lab-Administratoren und A freigegeben.

```bash
hcloud server describe "$INSTALLATION-b" --output json | jq -e '.status=="off"'
```

Nur bei Ausgabe `true` fortfahren. Bei `false` oder einem Fehler anhalten; C nicht öffentlich öffnen.

```bash
hcloud firewall add-rule "$INSTALLATION-c" --direction in --protocol tcp --port 443 --source-ips 0.0.0.0/0,::/0
hcloud firewall delete-rule "$INSTALLATION-c" --direction in --protocol tcp --port 443 \
  --source-ips "$ADMIN_IP/32,$A_IP/32,$C_IP/32"
export KUBECONFIG="$KC"
helm upgrade keycloak "$KEYCLOAK_CHART" -n keycloak -f values/keycloak-c.yaml --wait=legacy --timeout=10m
helm upgrade forgejo "$FORGEJO_CHART" -n forgejo -f values/forgejo-c.yaml --wait=legacy --timeout=5m
JOB="keycloak-recovered-$(date -u +%Y%m%d%H%M%S)"
kubectl -n keycloak create job "$JOB" --from=cronjob/keycloak-backup
kubectl -n keycloak wait job/"$JOB" --for=condition=complete --timeout=30m
kubectl -n keycloak logs job/"$JOB" -c backup > evidence/keycloak-recovered-backup.json
jq -e --slurpfile source evidence/keycloak-final-backup.json \
  '.snapshotID!=$source[0].snapshotID and .applicationUID!=$source[0].applicationUID and .pvcUID!=$source[0].pvcUID' \
  evidence/keycloak-recovered-backup.json
REQUEST="recovered-$(date -u +%Y%m%dT%H%M%SZ)"
kubectl -n forgejo annotate forgejoapplication forgejo forgejo.bartl.sh/backup-request="$REQUEST" --overwrite
kubectl -n forgejo wait forgejoapplication/forgejo --for=jsonpath='{.status.backup.request}'="$REQUEST" --timeout=20m
kubectl -n forgejo wait forgejoapplication/forgejo --for=jsonpath='{.status.backup.success}'=true --timeout=20m
kubectl -n forgejo get forgejoapplication/forgejo -o json | jq '.status.backup' > evidence/forgejo-recovered-backup.json
jq -e --slurpfile source evidence/forgejo-final-backup.json \
  '.success==true and .snapshot!=$source[0].snapshot' evidence/forgejo-recovered-backup.json
kubectl -n keycloak get cronjob keycloak-backup
kubectl -n forgejo get cronjob forgejo-backup
```

Beide Schedules müssen aktiv sein. Der Durchlauf führt deren Backup-Schnittstellen manuell aus und prüft die erzeugten Belege; die Anzeige eines aktivierten Schedules ist kein Nachweis eines bereits erfolgten Nachtlaufs.

Weiter mit [Removal, Reinstall und Rückbau](Rueckbau.md).
