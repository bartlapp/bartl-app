# Integrate Forgejo with Keycloak

Keycloak must be usable before Forgejo can delegate sign-in to it. Continue from [Install the applications](Anwendungen.md), starting on the workstation with the [session environment](README.md#resume-a-workstation-session):

```bash
source "${INSTALL_REPO:?}/.lab/workstation.env"
```

Use Forgejo's native OAuth2/OpenID Connect authentication source. Do not insert a login proxy or enable automatic account linking by email address.

## Prepare the protected configuration on A

Copy the shared nonsecret installation inputs to A, then open an SSH session there:

```bash
(cd "$INSTALL_REPO/.lab/a";
 scp -F .lab/ssh.config ../../installation.env k3s:/root/bartl-reference/installation.env
 ssh -F .lab/ssh.config k3s)
```

In that SSH session:

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

Treat `app-b.ini` as a secret. Retain the three identity secrets for recovery rather than generating new ones. The SSH host-key filename does not determine its algorithm; later, save the public key that Forgejo actually generates and compare it after recovery.

## Install storage, Secrets and the package on B

Back on the workstation, create the state and capture PVCs, stream the Secrets from A into B, and write the installation values:

```bash
cd "$INSTALL_REPO"
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

Apply `values/forgejo-tls.yaml`, generated in the previous chapter. Wait for the certificate to become Ready before installing Forgejo:

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

With `REQUIRE_SIGNIN_VIEW=true`, Forgejo may reject anonymous API requests. Check the native version as the local administrator rather than relaxing sign-in requirements. Open an SSH session on A from the workstation:

```bash
(cd "$INSTALL_REPO/.lab/a"; ssh -F .lab/ssh.config k3s)
```

In that SSH session:

```bash
source /root/bartl-reference/installation.env
cd /root/bartl-reference/forgejo
printf 'user = "reference-admin:%s"\n' "$(cat bootstrap/password)" |
  curl --config - --fail --silent --show-error "https://$FORGEJO_HOST/api/v1/version"
exit
```

## Provide a separate Git SSH endpoint

HTTP ingress does not provide SSH access. Back on the workstation, create an installation-managed Service using the package Service's actual selector. Do not copy an owner UID from an earlier installation.

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

This public host key comes through the administratively authenticated cluster connection. Do not use an unverified `ssh-keyscan` result as the trust anchor.

## Create the realm, user and OIDC client

Create the synthetic identities through Keycloak's native Admin API on A. The commands below install `jq`, Git and Git LFS there, where the test data belongs. First open the SSH session from the workstation:

```bash
(cd "$INSTALL_REPO/.lab/a"; ssh -F .lab/ssh.config k3s)
```

In that SSH session:

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

During recovery, C takes over the existing hostnames only after B is powered off, with HTTPS access initially restricted. The stable callback configured above is sufficient for that sequence; no additional candidate callback is needed.

Back on the workstation, add the native authentication source to Forgejo. Stream the client secret through stdin so that it does not enter local files or shell history:

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

Open `https://$FORGEJO_HOST/user/login` in a fresh browser context and choose "Sign in with keycloak". Sign in to Keycloak as `reference-user`, using the `user-password` retained on A. The callback must take you to that user's Forgejo dashboard. Do not copy the password into the installation repository.

This check requires a complete new sign-in through the stable issuer and callback. An existing Forgejo session cookie does not demonstrate that the integration works. Keep the local Forgejo administrator account as an independent recovery access path. Then continue with [service data and access checks](Pruefung.md).
