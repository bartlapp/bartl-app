# Recover on C and return the service to use

After [verifying the test data](verification.md), run this chapter on the workstation in `$WORK_DIR` unless an SSH session is specified. A remains available; B is the source and C the replacement.

Load the [workstation variables and helpers](README.md#prepare-workstation-commands):

```bash
source "${WORK_DIR:?}/.lab/workstation.env"
```

## Check the generation, not just the condition

`kubectl wait` can accept an old condition. After each change, verify that status and condition both match the current generation:

```bash
current_condition() {
  local config="$1" namespace="$2" resource="$3" condition="$4"
  kubectl --kubeconfig "$config" -n "$namespace" get "$resource" -o json |
    jq -e --arg condition "$condition" '
      .metadata.generation as $g | .status.observedGeneration==$g and
      any(.status.conditions[]; .type==$condition and .status=="True" and .observedGeneration==$g)'
}
```

Stop on `False`, timeout or job failure; retain status and logs. A timeout does not stop the server-side job. Do not remove failure markers, finalizers or Restic locks to force progress.

## Publish the first backups to A

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

Keycloak validates and reads back its dump; Forgejo captures with writers stopped, then resumes service and publishes. Require both backup records before upgrading.

## Upgrade the packages

Apply the new CRDs explicitly; Helm does not update existing definitions. Use declared values, not old defaults carried forward with `--reuse-values`.

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

Expect Restic 0.2.1 and Keycloak package 0.5.1, still running Keycloak 26.6.2. Forgejo upgrades during recovery on C.

## Restart without access to backups

Stop Restic through its application interface, then restart both serving deployments. They must restart from existing state without backup access.

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

## Stop and start through the application interfaces

Stop Forgejo before Keycloak; start in reverse order. The values files still declare running services. For a lasting stop, record the stopped state there too.

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

## Close writes, capture the final state and power off B

Allow no further user or configuration changes on B. Remove Forgejo's HTTP/SSH access, then stop Keycloak to close identity changes. Retain separate recovery points for each application; these are not an atomic stack snapshot.

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

Record B's stopped state so reapplying its values cannot reactivate it. Change only the fields shown; omit the diff markers from YAML.

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

Export effective values, stop Keycloak's controller and PostgreSQL, then power off B through the Hetzner API:

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

Require successful final backups and confirmed shutdown before activating C. DNS alone is not fencing. B stays off until teardown; do not use it as a rollback after C accepts new writes.

## Isolate C and supply the recovery inputs

Use new PVCs and PostgreSQL credentials, without mounting or copying from B. Preserve installation/instance identities, hostnames, Forgejo identity secrets, repository keys and the retained Keycloak recovery administrator.

Restrict HTTPS to the workstation, A and C's public address; leave HTTP open for ACME. Do not add a Keycloak maintenance allowlist: it would block Forgejo's required communication.

```bash
hcloud firewall delete-rule "$INSTALLATION-c" --direction in --protocol tcp --port 443 --source-ips 0.0.0.0/0,::/0
hcloud firewall add-rule "$INSTALLATION-c" --direction in --protocol tcp --port 443 \
  --source-ips "$ADMIN_IP/32,$A_IP/32,$C_IP/32"
export KUBECONFIG="$KC"
kubectl create namespace keycloak
kubectl create namespace forgejo
```

From the workstation, open A:

```bash
(cd .lab/a; ssh -F .lab/ssh.config k3s)
```

On A, create new database credentials:

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

Back on the workstation, stream the retained recovery inputs from A into C:

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

The last JSON receipt in Forgejo's prepare log must name the snapshot in `evidence/forgejo-final-backup.json`, the same logical identity and version 17.0.1. Reconstruction and migration are automatic.

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

## Move the hostnames while C remains restricted

Confirm each deSEC record belongs to this installation and points to B before changing it to C. Wait the full previous TTL (900 seconds), then check authoritative and public DNS before requesting certificates:

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

Every answer must point to C. Keep the restricted firewall while obtaining certificates:

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

If ACME fails, inspect `kubectl describe challenge -n keycloak` for the address reached by the CA. Resolve DNS/routing before retrying; do not bypass TLS.

Only if renewal is needed and the responsible administrator approves it, follow the [cert-manager procedure](https://cert-manager.io/docs/usage/certificate/) below. From the workstation, open C:

```bash
(cd "$WORK_DIR/.lab/c"; ssh -F .lab/ssh.config k3s)
```

On C:

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

Back on the workstation, wait for `kubectl --kubeconfig "$KC" -n keycloak wait certificate/keycloak-tls --for=condition=Ready --timeout=15m` to succeed.

Create SSH access from the current Service selector. Compare the recovered host key against the retained trust anchor:

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

`cmp` must exit 0. On a mismatch, stop; do not replace the original key. Run all [post-recovery checks](verification.md#verify-the-same-data-after-recovery), including fresh login, data, identities, permissions and new writes, before opening public access.

For an OIDC HTTP `500`, inspect Forgejo logs and check whether a Keycloak maintenance rule blocks discovery. Check the middleware reference on the Ingress, not merely its existence.

## Reinstall Restic without replacing its PVC

Use Restic 0.2.1 for finalization; do not bypass old 0.2.0 finalizers. Run no concurrent backups, restores or maintenance.

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

The jobs run `check --read-data` with separate admin credentials and native locks. Retain all snapshot history.

## Open C and back up new work

Record C's running state, changing only these fields:

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

Keep B's values stopped. Open HTTPS publicly; leave Git SSH restricted to lab administrators and A. First confirm B is off:

```bash
hcloud server describe "$INSTALLATION-b" --output json | jq -e '.status=="off"'
```

Continue only on `true`; otherwise keep C closed.

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

Both schedules must be active. The manual backup results above do not prove an overnight scheduled run.

Continue with [Reinstall Forgejo and remove the lab](teardown.md).
