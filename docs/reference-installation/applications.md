# Install the applications

Install Restic on A and Keycloak on B; leave C empty for recovery. On the workstation:

```bash
source "${WORK_DIR:?}/.lab/workstation.env"
```

Run workstation commands from `$WORK_DIR`. `KA`, `KB` and `KC` are the absolute kubeconfig paths from the [base setup](README.md).

## Prepare the endpoints

```bash
cd "$WORK_DIR"
source installation.env
A_IP=$(cat ".lab/a/.lab/$INSTALLATION-a/host")
B_IP=$(cat ".lab/b/.lab/$INSTALLATION-b/host")
C_IP=$(cat ".lab/c/.lab/$INSTALLATION-c/host")
ADMIN_IP=$(curl --ipv4 --fail --silent --show-error https://api.ipify.org)
```

Check the deSEC zone and existing records. The helper keeps the token out of process arguments:

```bash
desec() {
  printf 'header = "Authorization: Token %s"\n' "${DESEC_TOKEN:?}" |
    curl --config - --fail-with-body --silent --show-error "$@"
}
DNS_API="https://desec.io/api/v1/domains/$DNS_ZONE"
desec "$DNS_API/"
desec "$DNS_API/rrsets/" | jq .
```

Use unused names; do not overwrite records. On HTTP 429, wait for deSEC's specified interval. If a request's outcome is unclear, read the record before retrying.

```bash
for pair in "$BACKUP_HOST $A_IP" "$KC_HOST $B_IP" "$FORGEJO_HOST $B_IP"; do
  read -r host ip <<< "$pair"
  desec --request POST "$DNS_API/rrsets/" --json \
    "$(jq -nc --arg name "${host%.$DNS_ZONE}" --arg ip "$ip" \
      '{subname:$name,type:"A",ttl:900,records:[$ip]}')"
  sleep 2
done
```

Keep the 900-second TTL for handover. Before requesting certificates, check authoritative and public DNS. Do not add AAAA records.

```bash
for host in "$BACKUP_HOST" "$KC_HOST" "$FORGEJO_HOST"; do
  for resolver in ns1.desec.io ns2.desec.org 1.1.1.1 8.8.8.8; do
    dig @"$resolver" "$host" A +noall +comments +answer
  done
done
```

Stop unless authoritative answers carry `aa` and every answer points to the intended VM. If a nameserver's name does not resolve locally, obtain its address through DNS and query it directly. Do not change workstation DNS or weaken TLS verification.

## A: keep the backup repositories separate

```bash
kubectl --kubeconfig "$KA" create namespace backup
(cd .lab/a; ssh -F .lab/ssh.config k3s)
```

On A, create separate reader, writer and administrator credentials for each application. Reader and writer share their repository's encryption key:

```bash
set -euo pipefail
umask 077
mkdir -m 700 /root/bartl-reference
mkdir /root/bartl-reference/repositories
for app in keycloak forgejo; do
  mkdir "/root/bartl-reference/repositories/$app"
  cd "/root/bartl-reference/repositories/$app"
  openssl rand -hex 32 | tr -d '\n' > password
  for role in writer reader admin; do
    mkdir "$role"
    printf '%s' "$role" > "$role/username"
    openssl rand -hex 32 | tr -d '\n' > "$role/restPassword"
    cp password "$role/password"
    cp /etc/ssl/certs/ca-certificates.crt "$role/ca.crt"
    printf '%s:%s\n' "$role" \
      "$(openssl passwd -apr1 -stdin < "$role/restPassword")" >> htpasswd
  done
  kubectl -n backup create secret generic "$app-repository-auth" --from-file=htpasswd
  kubectl -n backup create secret generic "$app-repository-key" --from-file=password
  kubectl -n backup create secret generic "$app-repository-admin" --from-file=admin/
done
exit
```

Back on the workstation. Traefik passes TLS through to Restic; route to Service port 443, not Pod port 8443.

```bash
cat > values/restic-a.yaml <<'YAML'
application:
  replicas: 1
existingClaim: repository
tlsSecret: repository-tls
repositories:
  - name: keycloak
    authSecret: keycloak-repository-auth
    passwordSecret: keycloak-repository-key
  - name: forgejo
    authSecret: forgejo-repository-auth
    passwordSecret: forgejo-repository-key
YAML
cat > values/restic-infrastructure.yaml <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: repository
  namespace: backup
spec:
  accessModes: [ReadWriteOnce]
  storageClassName: local-path
  resources:
    requests:
      storage: 25Gi
---
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: letsencrypt
  namespace: backup
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-account
    solvers:
      - http01:
          ingress:
            ingressClassName: traefik
            serviceType: ClusterIP
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: repository-tls
  namespace: backup
spec:
  secretName: repository-tls
  dnsNames: ["$BACKUP_HOST"]
  issuerRef:
    name: letsencrypt
    kind: Issuer
---
apiVersion: traefik.io/v1alpha1
kind: IngressRouteTCP
metadata:
  name: restic
  namespace: backup
spec:
  entryPoints: [websecure]
  routes:
    - match: HostSNI(\`$BACKUP_HOST\`)
      services:
        - name: backup-restic
          port: 443
  tls:
    passthrough: true
EOF
export KUBECONFIG="$KA"
kubectl apply -f values/restic-infrastructure.yaml
kubectl -n backup wait certificate/repository-tls --for=condition=Ready --timeout=10m
helm install backup "$RESTIC_SOURCE" -n backup -f values/restic-a.yaml \
  --wait=legacy --timeout=5m
kubectl -n backup wait resticapplication/backup-restic --for=condition=Ready --timeout=30m
kubectl -n backup get resticapplication/backup-restic -o json | jq -e '
  .metadata.generation as $g | .status.observedGeneration==$g and
  any(.status.conditions[]; .type=="Ready" and .status=="True" and .observedGeneration==$g)'
curl --silent --show-error --output /dev/null --write-out '%{http_code}\n' \
  "https://$BACKUP_HOST/keycloak/config"
```

Require `401` with valid TLS; a TLS failure does not prove access control. Check authenticated reader access without printing the repository configuration:

```bash
(cd .lab/a;
 scp -F .lab/ssh.config ../../installation.env k3s:/root/bartl-reference/installation.env
 ssh -F .lab/ssh.config k3s)
```

On A:

```bash
cd /root/bartl-reference/repositories/keycloak/reader
source /root/bartl-reference/installation.env
printf 'user = "reader:%s"\n' "$(cat restPassword)" |
  curl --config - --fail --silent --show-error --output /dev/null \
  "https://$BACKUP_HOST/keycloak/config"
exit
```

## B: Keycloak

Follow the [Keycloak installation guide](https://github.com/bartlapp/bartl-keycloak/blob/main/README.md#install-keycloak) for TLS, Secrets and installation, with these inputs:

- B, namespace and release `keycloak`; initially `$KEYCLOAK_SOURCE`, later upgrade to `$KEYCLOAK_CHART`.
- Installation `$INSTALLATION`, instance `keycloak`, hostname `https://$KC_HOST`.
- Database: 5 GiB on `local-path`.
- Retain credentials on A under `/root/bartl-reference/keycloak/`. Skip the guide's bootstrap-credential deletion: recovery needs the same protected native administrator, not a replacement user.
- Back up to the empty repository on A from the outset, not a temporary endpoint on B.

On the workstation:

```bash
cat > values/keycloak-b.yaml <<EOF
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
bootstrapAdminSecret: keycloak-bootstrap
recoveryAdminSecret: keycloak-recovery
ingress:
  enabled: true
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
kubectl --kubeconfig "$KB" create namespace keycloak
```

Open A from the workstation:

```bash
(cd "$WORK_DIR/.lab/a"; ssh -F .lab/ssh.config k3s)
```

On A:

```bash
umask 077
mkdir -p /root/bartl-reference/keycloak/{database-b,database-admin-b,bootstrap}
cd /root/bartl-reference/keycloak
printf keycloak > database-b/username
printf keycloak > database-b/database
openssl rand -hex 32 | tr -d '\n' > database-b/password
printf postgres > database-admin-b/username
openssl rand -hex 32 | tr -d '\n' > database-admin-b/password
printf admin > bootstrap/username
openssl rand -hex 32 | tr -d '\n' > bootstrap/password
exit
```

Back on the workstation, stream Secrets from A to B without local secret files:

```bash
(cd .lab/a; ssh -F .lab/ssh.config k3s 'bash -se' <<'REMOTE'
set -euo pipefail
cd /root/bartl-reference/keycloak
kubectl -n keycloak create secret generic keycloak-database --from-file=database-b/ --dry-run=client -o yaml
printf '\n---\n'
kubectl -n keycloak create secret generic keycloak-database-admin --from-file=database-admin-b/ --dry-run=client -o yaml
printf '\n---\n'
kubectl -n keycloak create secret generic keycloak-bootstrap --from-file=bootstrap/ --dry-run=client -o yaml
printf '\n---\n'
kubectl -n keycloak create secret generic keycloak-recovery --from-file=bootstrap/ --dry-run=client -o yaml
for role in reader writer; do
  printf '\n---\n'
  kubectl -n keycloak create secret generic "keycloak-backup-$role" \
    --from-file="/root/bartl-reference/repositories/keycloak/$role/" --dry-run=client -o yaml
done
REMOTE
) | kubectl --kubeconfig "$KB" create -f -
```

Generate TLS manifests for both applications:

```bash
for app in keycloak forgejo; do
  case "$app" in
    keycloak) host=$KC_HOST ;;
    forgejo) host=$FORGEJO_HOST ;;
  esac
  cat > "values/$app-tls.yaml" <<EOF
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: letsencrypt
  namespace: $app
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-account
    solvers:
      - http01:
          ingress:
            ingressClassName: traefik
            serviceType: ClusterIP
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: $app-tls
  namespace: $app
spec:
  secretName: $app-tls
  dnsNames: ["$host"]
  issuerRef:
    name: letsencrypt
    kind: Issuer
EOF
done
```

```bash
export KUBECONFIG="$KB"
kubectl apply -f values/keycloak-tls.yaml
kubectl -n keycloak wait certificate/keycloak-tls --for=condition=Ready --timeout=10m
helm install keycloak "$KEYCLOAK_SOURCE" -n keycloak -f values/keycloak-b.yaml \
  --wait=legacy --timeout=10m
kubectl -n keycloak wait keycloakapplication/keycloak --for=condition=Ready --timeout=10m
kubectl -n keycloak get keycloakapplication/keycloak -o json
curl --fail --silent --show-error \
  "https://$KC_HOST/realms/master/.well-known/openid-configuration" | jq .issuer
```

Stop unless `status.observedGeneration` and the Ready condition refer to the current generation. Sign in to `https://$KC_HOST/admin/` with the protected administrator credentials and verify administration before continuing with [Forgejo](forgejo.md).
