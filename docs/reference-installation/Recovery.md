# Recover on C and return the service to use

Recovery is complete when people can use the replacement and their new work reaches a backup. This chapter first exercises the applications on B, then closes writes, captures their final state and powers B off. Only then do we reconstruct on C, check the service and open access.

Start with the installed applications and [verified test data](Pruefung.md). A continues to provide backup storage; B is the source and C the independent replacement. Run commands on the workstation in `$INSTALL_REPO` unless a block explicitly opens an SSH session.

Load the [workstation session](README.md#resume-a-workstation-session):

```bash
source "${INSTALL_REPO:?}/.lab/workstation.env"
```

## Check the generation, not just the condition

`kubectl wait` can accept a condition left over from an earlier operation. After each change, check that both the observed generation and the requested condition belong to the current generation. This helper reads status without changing it:

```bash
current_condition() {
  local config="$1" namespace="$2" resource="$3" condition="$4"
  kubectl --kubeconfig "$config" -n "$namespace" get "$resource" -o json |
    jq -e --arg condition "$condition" '
      .metadata.generation as $g | .status.observedGeneration==$g and
      any(.status.conditions[]; .type==$condition and .status=="True" and .observedGeneration==$g)'
}
```

Stop on `False`, a timeout or a failed job, and retain status and logs. Do not remove failure markers, finalizers or Restic locks to force progress. A client timeout does not stop the server-side job.

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

Keycloak validates its native dump and reads the published snapshot back in full. Forgejo captures state with its writers stopped, resumes service and publishes the protected capture. Check those application-specific results; a successful Helm command does not establish that a backup is usable.

## Upgrade the packages

Proceed only after both backups succeed. Apply the CRDs from the selected new chart explicitly because Helm does not update existing CRD definitions automatically. Use the installation's declared values rather than carrying old package defaults forward with `--reuse-values`.

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

Expect Restic 0.2.1 and Keycloak package 0.5.1. Native Keycloak remains at 26.6.2. Forgejo's native version changes later, during reconstruction on C, rather than through independently selected image tags.

## Restart without access to backups

A restart with existing state must work while the backup service is unavailable. Stop Restic through its application interface, restart the two serving deployments, then bring Restic back. The deployment restarts test that path; they are not a substitute for the supported stop interface or permission to scale against the controller's declared intent.

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

Stop Forgejo before Keycloak; start them in the reverse order so identity is available before the service that depends on it. For this short exercise, the values files still declare a running installation. If the stop is meant to persist beyond the exercise, version the stopped state in those files as well.

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

Allow no further user or configuration changes on B from this point. First remove HTTP and SSH access to Forgejo. Stopping Keycloak then closes identity changes. Retain the two snapshots as separate, explicitly recorded recovery points; this sequence does not create an atomic snapshot of the whole installation.

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

Record the stopped state in B's values files now. Otherwise, applying them later could reactivate the source. Change only the fields shown below and retain all other values. In these diffs, `-` marks the old value and `+` the replacement; neither marker belongs in the YAML file.

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

With the application already stopped through its own interface, follow Keycloak's documented source-independent recovery test: stop its controller, then PostgreSQL. Finally, power off the entire VM through the independently accessible Hetzner API:

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

Do not activate C without successful final backups and a confirmed stop. Changing DNS does not fence the source. Keep B powered off until teardown; once C has accepted new writes, restarting B is not a rollback.

## Isolate C and supply the recovery inputs

Reconstruction must not borrow the source's mutable state. Give C new PVCs and new PostgreSQL credentials; do not mount source PVCs or copy data from B. Preserve the installation and instance identities, hostnames, Forgejo identity secrets, repository keys and retained Keycloak recovery administrator.

Initially, allow HTTPS to C only from the workstation, test client A and C's own public address. Keep HTTP available for ACME. Do not add a Keycloak maintenance allowlist: it would also restrict the native communication Forgejo needs with Keycloak.

```bash
hcloud firewall delete-rule "$INSTALLATION-c" --direction in --protocol tcp --port 443 --source-ips 0.0.0.0/0,::/0
hcloud firewall add-rule "$INSTALLATION-c" --direction in --protocol tcp --port 443 \
  --source-ips "$ADMIN_IP/32,$A_IP/32,$C_IP/32"
export KUBECONFIG="$KC"
kubectl create namespace keycloak
kubectl create namespace forgejo
```

Open an SSH session on A to create the new database credentials:

```bash
(cd .lab/a; ssh -F .lab/ssh.config k3s)
```

In that SSH session:

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

Back on the workstation, stream the protected inputs from A directly into C. Reuse the retained recovery administrator and Forgejo identity secrets; do not generate replacements.

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

These complete target values preserve the installation's explicit choices without inheriting old package defaults. C takes over the existing hostnames. Keycloak receives new database credentials and its retained recovery administrator; Forgejo receives its protected native configuration from A.

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

Check the last JSON receipt in the Forgejo prepare log. It must name the final snapshot recorded in `evidence/forgejo-final-backup.json`, the same logical identity and version 17.0.1. The package performs reconstruction and native migration; there is no restore switch to set or database migration to perform manually.

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

For each existing deSEC A record, read it, confirm that it belongs to this installation and still points to B, then change it to C. Wait out the entire previous TTL, which is 900 seconds for these records. API success alone does not establish that clients see the new address. Before requesting HTTP-01 certificates, check both authoritative servers and both public resolvers:

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

Every answer must point to C. Leave the restricted firewall in place while applying the retained TLS manifests and waiting for the certificates to become Ready:

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

If an ACME request is invalid, diagnose it before trying again. `kubectl describe challenge -n keycloak` includes the address the CA actually reached. Resolve the DNS or routing cause with the responsible administrator. If a new request is then needed, follow the native [cert-manager procedure](https://cert-manager.io/docs/usage/certificate/) below and wait for Certificate Ready again. Do not bypass TLS validation.

Use this renewal procedure only after the cause is resolved and the responsible administrator approves it. From the workstation, open an SSH session on C:

```bash
(cd "$INSTALL_REPO/.lab/c"; ssh -F .lab/ssh.config k3s)
```

In that session, download and verify the pinned upstream client before running it:

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

Back on the workstation, run `kubectl --kubeconfig "$KC" -n keycloak wait certificate/keycloak-tls --for=condition=Ready --timeout=15m`. Continue only after it succeeds.

Create C's SSH service from the selector of its current package service. Save the recovered public host key separately so the original remains available as the trust anchor:

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

Matching keys produce no `cmp` output and exit with code 0. If they differ, stop and resolve the cause with the responsible operator; do not replace the original key. Then run all [post-recovery service checks](Pruefung.md#verify-the-same-data-after-recovery), including a fresh browser login.

Keep public access closed until native login through the recovered installation works, identities and permissions are unchanged, data is retained and new writes succeed. An HTTP `500` when starting OIDC requires Forgejo logs; in particular, check that no additional Keycloak maintenance rule blocks discovery. A middleware's existence does not establish that it is active. Check its reference on the Ingress.

## Reinstall Restic without replacing its PVC

This step checks that removing and reinstalling the backup service preserves its repository storage. Only Restic 0.2.1 may perform finalization; do not bypass old 0.2.0 finalizers. Run no backups, restore jobs or other maintenance concurrently with this step.

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

The maintenance jobs run `check --read-data` with separate administrative credentials and native locks. The remaining steps check new backups and native retrieval from the retained repositories. Keep the snapshot history; do not introduce automatic retention or deletion here.

## Open C and back up new work

Record C's running state in its values files before opening access. Change only the fields shown and retain the rest. As above, `-` and `+` mark the old and new values; omit the markers from the YAML.

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

Leave B's values stopped. HTTPS will become public; Git over SSH remains restricted to the intended lab administrators and A. First confirm that B is still off:

```bash
hcloud server describe "$INSTALLATION-b" --output json | jq -e '.status=="off"'
```

Proceed only if the result is `true`. On `false` or an error, stop and keep C closed to the public.

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

Both backup schedules must be active. This sequence invokes their backup interfaces manually and checks the resulting records. An enabled schedule does not establish that an overnight run has already succeeded.

Continue with [Reinstall Forgejo and remove the lab](Rueckbau.md).
