# Integrate Forgejo with Keycloak

Complete [Keycloak installation](applications.md) first. On the workstation:

```bash
source "${WORK_DIR:?}/.lab/workstation.env"
```

Use Forgejo's native OAuth2/OpenID Connect authentication source. Do not insert a login proxy or enable automatic account linking by email address.

## Prepare the protected configuration on A

Copy the nonsecret inputs to A and open SSH:

```bash
(cd "$WORK_DIR/.lab/a";
 scp -F .lab/ssh.config ../../installation.env k3s:/root/bartl-reference/installation.env
 ssh -F .lab/ssh.config k3s)
```

On A:

```bash
source /root/bartl-reference/installation.env
umask 077
mkdir -p /root/bartl-reference/forgejo/bootstrap
cd /root/bartl-reference/forgejo
printf reference-admin > bootstrap/username
printf reference-admin@example.invalid > bootstrap/email
openssl rand -hex 32 | tr -d '\n' > bootstrap/password
openssl rand -hex 32 | tr -d '\n' > secret-key
openssl rand -hex 32 | tr -d '\n' > internal-token
openssl rand -base64 32 | tr '+/' '-_' | tr -d '=\n' > lfs-secret
cat > app-b.ini <<EOF
APP_NAME = Bartl reference
RUN_USER = git
RUN_MODE = prod
WORK_PATH = /data
[server]
APP_DATA_PATH = /data/data
HTTP_ADDR = 0.0.0.0
HTTP_PORT = 3000
DOMAIN = $FORGEJO_HOST
ROOT_URL = https://$FORGEJO_HOST/
LOCAL_ROOT_URL = http://127.0.0.1:3000/
OFFLINE_MODE = true
START_SSH_SERVER = true
SSH_LISTEN_HOST = 0.0.0.0
SSH_LISTEN_PORT = 2222
SSH_PORT = 30222
SSH_DOMAIN = $FORGEJO_HOST
SSH_USER = git
BUILTIN_SSH_SERVER_USER = git
SSH_ROOT_PATH = /data/data/ssh
SSH_SERVER_HOST_KEYS = ssh/forgejo.ed25519
LFS_START_SERVER = true
LFS_JWT_SECRET = $(cat lfs-secret)
[database]
DB_TYPE = sqlite3
PATH = /data/data/forgejo.db
[repository]
ROOT = /data/data/repositories
[security]
INSTALL_LOCK = true
DISABLE_WEBHOOKS = true
SECRET_KEY = $(cat secret-key)
INTERNAL_TOKEN = $(cat internal-token)
[service]
DISABLE_REGISTRATION = true
REQUIRE_SIGNIN_VIEW = true
ENABLE_NOTIFY_MAIL = false
[oauth2_client]
ENABLE_AUTO_REGISTRATION = true
ACCOUNT_LINKING = disabled
[mailer]
ENABLED = false
[email.incoming]
ENABLED = false
[actions]
ENABLED = false
[mirror]
ENABLED = false
[federation]
ENABLED = false
[cron.update_mirrors]
ENABLED = false
[cron.sync_external_users]
ENABLED = false
[cron.update_checker]
ENABLED = false
[webhook]
ALLOWED_HOST_LIST = loopback
[log]
MODE = console
ROOT_PATH = /data/log
EOF
exit
```

Treat `app-b.ini` as a secret and retain all three identity secrets for recovery. The SSH host-key filename does not determine its algorithm; retain Forgejo's actual public key for comparison after recovery.

## Install storage, Secrets and the package on B

Back on the workstation:

```bash
cd "$WORK_DIR"
export KUBECONFIG="$KB"
kubectl create namespace forgejo
for claim in forgejo-state forgejo-capture; do
  jq -n --arg name "$claim" '{apiVersion:"v1",kind:"PersistentVolumeClaim",
    metadata:{name:$name,namespace:"forgejo"},spec:{accessModes:["ReadWriteOnce"],
    storageClassName:"local-path",resources:{requests:{storage:"8Gi"}}}}' |
    kubectl create -f -
done
(cd .lab/a; ssh -F .lab/ssh.config k3s 'bash -se' <<'REMOTE'
set -euo pipefail
cd /root/bartl-reference/forgejo
kubectl -n forgejo create secret generic forgejo-configuration \
  --from-file=app.ini=app-b.ini --dry-run=client -o yaml
printf '\n---\n'
kubectl -n forgejo create secret generic forgejo-bootstrap --from-file=bootstrap/ --dry-run=client -o yaml
for role in reader writer; do
  printf '\n---\n'
  kubectl -n forgejo create secret generic "forgejo-backup-$role" \
    --from-file="/root/bartl-reference/repositories/forgejo/$role/" --dry-run=client -o yaml
done
REMOTE
) | kubectl create -f -
cat > values/forgejo-b.yaml <<EOF
identity:
  installation: "$INSTALLATION"
  instance: forgejo
version: "16.0.7"
replicas: 1
claim: forgejo-state
stagingClaim: forgejo-capture
configurationSecret: forgejo-configuration
bootstrapSecret: forgejo-bootstrap
backup:
  repository: "rest:https://$BACKUP_HOST/forgejo/"
  readerSecret: forgejo-backup-reader
  writerSecret: forgejo-backup-writer
  schedule: "0 2 * * *"
  timeZone: Europe/Berlin
ingress:
  enabled: true
  host: "$FORGEJO_HOST"
  className: traefik
  tlsSecret: forgejo-tls
ssh:
  port: 2222
EOF
```

Use the TLS manifest from the previous chapter; require a Ready certificate before installation:

```bash
kubectl apply -f values/forgejo-tls.yaml
kubectl -n forgejo wait certificate/forgejo-tls --for=condition=Ready --timeout=10m
helm install forgejo "$FORGEJO_CHART" -n forgejo -f values/forgejo-b.yaml \
  --wait=legacy --timeout=5m
kubectl -n forgejo wait forgejoapplication/forgejo --for=condition=Ready --timeout=20m
kubectl -n forgejo get forgejoapplication/forgejo -o json | jq -e '
  .metadata.generation as $g | .status.observedGeneration==$g and
  .status.preparedVersion=="16.0.7" and
  any(.status.conditions[]; .type=="Ready" and .status=="True" and .observedGeneration==$g)'
```

`REQUIRE_SIGNIN_VIEW=true` may reject anonymous API requests. Check the version as the local administrator; do not relax sign-in requirements. Open A from the workstation:

```bash
(cd "$WORK_DIR/.lab/a"; ssh -F .lab/ssh.config k3s)
```

On A; require version `16.0.7`:

```bash
source /root/bartl-reference/installation.env
cd /root/bartl-reference/forgejo
printf 'user = "reference-admin:%s"\n' "$(cat bootstrap/password)" |
  curl --config - --fail --silent --show-error "https://$FORGEJO_HOST/api/v1/version"
exit
```

## Provide a separate Git SSH endpoint

Back on the workstation. HTTP ingress does not carry SSH. Use the package Service's actual selector, not an owner UID from a previous installation:

```bash
export KUBECONFIG="$KB"
kubectl -n forgejo get service forgejo -o json | jq '{apiVersion:"v1",kind:"Service",
  metadata:{name:"forgejo-ssh",namespace:"forgejo"},spec:{type:"NodePort",
  externalTrafficPolicy:"Local",selector:.spec.selector,
  ports:[{name:"ssh",port:2222,targetPort:2222,nodePort:30222}]}}' > values/forgejo-ssh-b.json
kubectl apply -f values/forgejo-ssh-b.json
hcloud firewall add-rule "$INSTALLATION-b" --direction in --protocol tcp --port 30222 \
  --source-ips "$ADMIN_IP/32,$A_IP/32"
POD=$(kubectl -n forgejo get pod -l forgejo.bartl.sh/role=app -o jsonpath='{.items[0].metadata.name}')
kubectl -n forgejo exec "$POD" -- cat /data/data/ssh/forgejo.ed25519.pub \
  > evidence/forgejo-host-key.pub
cat evidence/forgejo-host-key.pub |
  (cd .lab/a; ssh -F .lab/ssh.config k3s 'cat > /root/bartl-reference/forgejo/host-key.pub')
```

Trust this key from the authenticated cluster connection, not an unverified `ssh-keyscan`.

## Create the realm, user and OIDC client

Open A from the workstation:

```bash
(cd "$WORK_DIR/.lab/a"; ssh -F .lab/ssh.config k3s)
```

On A, create the synthetic identities through Keycloak's Admin API:

```bash
apt-get install -y jq git git-lfs
source /root/bartl-reference/installation.env
cd /root/bartl-reference/keycloak
umask 077
curl --fail --silent --show-error \
  --data-urlencode grant_type=password --data-urlencode client_id=admin-cli \
  --data-urlencode username=admin --data-urlencode password@bootstrap/password \
  "https://$KC_HOST/realms/master/protocol/openid-connect/token" > admin-token.json
kc() {
  printf 'header = "Authorization: Bearer %s"\n' "$(jq -r .access_token admin-token.json)" |
    curl --config - --fail-with-body --silent --show-error "$@"
}
kc --json '{"realm":"reference","enabled":true,"registrationAllowed":false,"sslRequired":"all"}' \
  "https://$KC_HOST/admin/realms"
openssl rand -hex 32 | tr -d '\n' > user-password
jq -n --rawfile password user-password '{username:"reference-user",enabled:true,
  email:"reference-user@example.invalid",emailVerified:true,firstName:"Reference",lastName:"User",
  credentials:[{type:"password",value:$password,temporary:false}]}' > user.json
kc --data-binary @user.json -H 'Content-Type: application/json' \
  "https://$KC_HOST/admin/realms/reference/users"
openssl rand -hex 32 | tr -d '\n' > client-secret
jq -n --rawfile secret client-secret --arg host "$FORGEJO_HOST" \
  '{clientId:"forgejo",enabled:true,protocol:"openid-connect",publicClient:false,
    secret:$secret,standardFlowEnabled:true,directAccessGrantsEnabled:false,
    serviceAccountsEnabled:false,redirectUris:["https://"+$host+"/user/oauth2/keycloak/callback"],
    webOrigins:["https://"+$host],defaultClientScopes:["profile","email","roles","web-origins","acr"]}' \
  > client.json
kc --data-binary @client.json -H 'Content-Type: application/json' \
  "https://$KC_HOST/admin/realms/reference/clients"
kc "https://$KC_HOST/admin/realms/reference/users?username=reference-user" |
  jq 'map({id,username,emailVerified})' > user-identity.json
kc "https://$KC_HOST/admin/realms/reference/clients?clientId=forgejo" |
  jq 'map({id,clientId,redirectUris})' > client-identity.json
exit
```

Recovery reuses these hostnames only after B is off, initially with restricted HTTPS access. Keep the stable callback; no candidate callback is needed.

Back on the workstation, stream the client secret into Forgejo without local files or shell-history exposure:

```bash
export KUBECONFIG="$KB"
POD=$(kubectl -n forgejo get pod -l forgejo.bartl.sh/role=app -o jsonpath='{.items[0].metadata.name}')
(cd .lab/a; ssh -F .lab/ssh.config k3s 'bash -se' <<'REMOTE'
set -euo pipefail
source /root/bartl-reference/installation.env
printf 'umask 077\nexec env HOME=/data/home USER=git LOGNAME=git /usr/local/lib/forgejo/16.0.7/forgejo --work-path /data --custom-path /data/custom --config /data/app.ini admin auth add-oauth --name keycloak --provider openidConnect --key forgejo --secret %s --auto-discover-url https://%s/realms/reference/.well-known/openid-configuration --scopes openid --scopes profile --scopes email\n' \
  "$(cat /root/bartl-reference/keycloak/client-secret)" "$KC_HOST"
REMOTE
) | kubectl -n forgejo exec -i "$POD" -- /bin/sh -s
```

## Verify browser access

In a fresh browser context, open `https://$FORGEJO_HOST/user/login` and choose "Sign in with keycloak". Use `reference-user` and the `user-password` retained on A; keep the password out of configuration and evidence files. Require a new Keycloak sign-in and callback to that user's Forgejo dashboard, not access through an existing Forgejo cookie.

Keep the local Forgejo administrator for independent recovery access. Continue with [service data and access checks](verification.md).
