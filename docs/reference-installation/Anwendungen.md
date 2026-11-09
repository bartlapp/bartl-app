# Install the applications

The three K3s bases are ready. Install the backup service on A and Keycloak on B; leave C without applications until recovery. Start on the workstation by loading the [session environment](README.md#resume-a-workstation-session):

```bash
source "${INSTALL_REPO:?}/.lab/workstation.env"
```

Run workstation commands from `$INSTALL_REPO`. The instructions explicitly identify each SSH session on A and when to return. `KA`, `KB` and `KC` are the absolute kubeconfig paths established in the [base setup](README.md); use the specified path for every cluster operation.

## Prepare the endpoints

```bash
cd "$INSTALL_REPO"
source installation.env
A_IP=$(cat ".lab/a/.lab/$INSTALLATION-a/host")
B_IP=$(cat ".lab/b/.lab/$INSTALLATION-b/host")
C_IP=$(cat ".lab/c/.lab/$INSTALLATION-c/host")
ADMIN_IP=$(curl --ipv4 --fail --silent --show-error https://api.ipify.org)
```

Read your deSEC zone and its existing records before creating anything. The helper passes the token through stdin so that it does not appear in process arguments:

```bash
desec() {
  printf 'header = "Authorization: Token %s"\n' "${DESEC_TOKEN:?}" |
    curl --config - --fail-with-body --silent --show-error "$@"
}
DNS_API="https://desec.io/api/v1/domains/$DNS_ZONE"
desec "$DNS_API/"
desec "$DNS_API/rrsets/" | jq .
```

Use names that are not already in use. Create the three records in sequence without overwriting existing records. If deSEC returns HTTP 429, wait for the interval it specifies. If a request's outcome is unclear, read the record before trying again.

```bash
for pair in "$BACKUP_HOST $A_IP" "$KC_HOST $B_IP" "$FORGEJO_HOST $B_IP"; do
  read -r host ip <<< "$pair"
  desec --request POST "$DNS_API/rrsets/" --json \
    "$(jq -nc --arg name "${host%.$DNS_ZONE}" --arg ip "$ip" \
      '{subname:$name,type:"A",ttl:900,records:[$ip]}')"
  sleep 2
done
```

The 900-second TTL prepares for the later handover. Before requesting certificates, check that both authoritative nameservers and the public resolvers return the intended IPv4 address. Do not add AAAA records.

```bash
for host in "$BACKUP_HOST" "$KC_HOST" "$FORGEJO_HOST"; do
  for resolver in ns1.desec.io ns2.desec.org 1.1.1.1 8.8.8.8; do
    dig @"$resolver" "$host" A +noall +comments +answer
  done
done
```

Do not continue until the authoritative answers carry the `aa` flag and every answer points to the intended VM. If local resolution of a nameserver's name fails, obtain its address through DNS and query that same authoritative server directly. Do not change the workstation's DNS configuration or weaken TLS verification.

## A: keep the backup repositories separate

```bash
kubectl --kubeconfig "$KA" create namespace backup
(cd .lab/a; ssh -F .lab/ssh.config k3s)
```

The next block runs in the SSH session on A. It creates the protected inputs there, not on the workstation. Each application gets separate reader, writer and administrator passwords. Within one repository, reader and writer use the same repository encryption key.

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

You are back on the workstation. Create the Restic PVC and a publicly trusted TLS certificate. Traefik passes TLS through to Restic without terminating it. Route to Service port 443, not Pod port 8443.

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

The final request must return `401` with valid TLS verification. A TLS failure does not demonstrate access control. Next, check authenticated reader access from A without printing the encrypted repository configuration:

```bash
(cd .lab/a;
 scp -F .lab/ssh.config ../../installation.env k3s:/root/bartl-reference/installation.env
 ssh -F .lab/ssh.config k3s)
```

In the SSH session now open on A:

```bash
cd /root/bartl-reference/repositories/keycloak/reader
source /root/bartl-reference/installation.env
printf 'user = "reader:%s"\n' "$(cat restPassword)" |
  curl --config - --fail --silent --show-error --output /dev/null \
  "https://$BACKUP_HOST/keycloak/config"
exit
```

## B: Keycloak

The [Keycloak installation guide](https://github.com/bartlapp/bartl-keycloak/blob/main/README.md#install-keycloak) owns the complete TLS, Secret and installation procedure. Use the inputs below for this exercise:

- Install on B, with both namespace and release named `keycloak`.
- Start with chart `$KEYCLOAK_SOURCE`; the later upgrade uses `$KEYCLOAK_CHART`.
- Use installation `$INSTALLATION`, instance `keycloak` and hostname `https://$KC_HOST`.
- Allocate 5 GiB for the database on `local-path`.
- Generate credentials on A under `/root/bartl-reference/keycloak/` and retain them there. Do not run the guide's example block that deletes bootstrap credentials after creating the Secret: recovery needs those credentials.
- Use the same protected native administrator for recovery. Do not generate a replacement user.
- Configure backup against the empty repository on A from the outset. Do not create a second or temporary backup endpoint on B.

Write the complete intended values on the workstation:

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

Prepare the three credential directories on A. Open an SSH session from the workstation:

```bash
(cd "$INSTALL_REPO/.lab/a"; ssh -F .lab/ssh.config k3s)
```

In that SSH session:

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

Back on the workstation, stream the Secrets directly from A into B through stdin. This avoids creating local files containing secret contents:

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

Generate the TLS manifests for both applications on the workstation, using the shared installation inputs:

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

Apply Keycloak's TLS manifest, wait for the certificate, then install the package:

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

Stop here unless `status.observedGeneration` and the Ready condition both refer to the current generation. Sign in to `https://$KC_HOST/admin/` with the protected administrator credentials and verify that administration works. Only then continue with [Forgejo](Forgejo.md).
