# Integrate Forgejo with Keycloak

Complete [Restic, Keycloak and Paperless installation](applications.md). Use native OAuth2/OpenID Connect; no login proxy or automatic account linking by email.

Enter B's cluster directory and wait for the next prompt. This selects Base access, not a Forgejo deployment:

```bash
cd "$WORK_DIR/clusters/cluster-2"
```

At the next prompt follow the [Forgejo README](https://github.com/bartlapp/bartl-forgejo/blob/main/README.md#supported-profile-and-release) from latest-stable acquisition. Keep the existing `WORK_DIR` and `VALUES`, not its sample paths. In **Configure a new deployment**, choose `DEPLOYMENT=forgejo`, `INSTANCE=forgejo`, `NS=forgejo`, `RELEASE=forgejo` and `PACKAGE=forgejo`. After the grouped creation block enters its directory, wait for the next prompt.

Before the next declaration-rendering block, record the source native version and composition choices:

```bash
yq -i '.operations.deployments.forgejo.version = "16.0.7" |
  .services.forgejo.identityProvider = "keycloak" |
  .services.forgejo.backup.endpoint = "restic" |
  .services.forgejo.backup.schedule = "*/5 * * * *" |
  .services.forgejo.backup.timeZone = "Europe/Berlin" |
  .services.forgejo.ssh.exposure = "NodePort" |
  .services.forgejo.ssh.nodePort = 30222' "$VALUES"
```

The package's selected-deployment procedure applies this native version during rendering and installation. Do not reproduce its Helm argument mapping here. Continue declaration rendering and independent state/staging claim creation; 20Gi each is a synthetic sizing choice subject to the approved capacity.

At **DNS, TLS and SSH exposure**, use the [DNS checkpoint](applications.md#dns-checkpoint) with `HOST="$FORGEJO_HOST"` and `IP="$B_IP"` after sourcing the workstation helper. Continue the package's managed/external TLS path. The SSH firewall checkpoint below supplies the actual NodePort route.

At **Optional composition with Keycloak and Restic**, use these provider selections in its binding blocks instead of its sample locations:

```bash
export KC_DEPLOYMENT=keycloak
export KC_CONNECTIONS="$WORK_DIR/clusters/cluster-2/applications/keycloak/connections.yaml"
export RESTIC_DEPLOYMENT=restic
export RESTIC_CONNECTIONS="$WORK_DIR/clusters/cluster-1/applications/restic/restic-connections.yaml"
export REPOSITORY_NAME=forgejo
```

Before the composed-backup block creates runtime Secrets, supply its repository files. In the separate direnv-hooked Restic terminal, resume `"$WORK_DIR/clusters/cluster-1/applications/restic"` and run **Connect an application** with `REPOSITORY=forgejo` and `CONSUMER_DIR="$WORK_DIR/clusters/cluster-2/applications/forgejo"`. Return to the paused Forgejo terminal. Keep the composed binding, not an additional direct `backup.repository` override.

Run Forgejo's provider-declaration binding and **Provision the native Keycloak client** procedure. Supply the current Keycloak administrator in `"$INSTALL_DIR/protected/keycloak-admin/username"` and `password`; for this exercise copy the retained current files from `"$WORK_DIR/clusters/cluster-2/applications/keycloak/recovery-admin/"` into that new directory. These credentials are preparation-only. The package reads the advertised realm, creates an absent authorized realm/client and retains the actual client secret. Do not hardcode another issuer or rotate a retained secret.

Continue **Prepare native identity and configuration**. In its fresh-bootstrap block choose `ADMIN_USER=reference-admin` and `ADMIN_EMAIL=reference-admin@example.invalid` before generating the account. Preserve all native identity keys. Complete **Install and observe** and **Register Forgejo's native authentication source**, then the SSH and browser checks below. Keep local administration usable independently of Keycloak.

## Provide actual SSH reachability

The retained service choices select NodePort 30222. The chart owns its SSH Service; do not create a competing manual Service or copy a predecessor's selector. Permit this port only from the administrator and test-client A. Read B's retained firewall ID, then inspect live attachment before adding the rule:

```bash
yq -e '.clusters."cluster-2".ownership == "managed" and .vms[strenv(B_VM)].ownership == "managed" and
  .clusters."cluster-2".observed.firewalls.admin.ownership == "managed" and
  .clusters."cluster-2".observed.firewalls.admin.type == "hetzner" and
  .clusters."cluster-2".observed.firewalls.admin.provider == .vms[strenv(B_VM)].provider and
  (.clusters."cluster-2".observed.firewalls.admin.attachedVms | length) == 1 and
  .clusters."cluster-2".observed.firewalls.admin.attachedVms[0] == strenv(B_VM)' "$VALUES" >/dev/null
FIREWALL=$(yq -er '.clusters."cluster-2".observed.firewalls.admin.id' "$VALUES")
hcloud firewall describe "$FIREWALL"
hcloud firewall add-rule "$FIREWALL" --direction in --protocol tcp --port 30222 \
  --source-ips "$ADMIN_IP/32,$A_IP/32"
kubectl --kubeconfig "$KB" -n forgejo get service forgejo-ssh -o wide
POD=$(kubectl --kubeconfig "$KB" -n forgejo get pod -l forgejo.bartl.sh/role=app \
  -o jsonpath='{.items[0].metadata.name}')
kubectl --kubeconfig "$KB" -n forgejo exec "$POD" -- cat /data/data/ssh/forgejo.ed25519.pub \
  > "$WORK_DIR/evidence/forgejo-host-key.pub"
```

If a matching rule exists, verify it rather than adding another. Trust the SSH key obtained through authenticated cluster access, not an unauthenticated scan.

## Prepare the test client on A

On the workstation, stream the source's retained bootstrap files to A, not payload data back to the workstation. Bootstrap credentials were supplied/generated once in the package preparation; for this exercise choose username `reference-admin` and email `reference-admin@example.invalid` before initial initialization. Do not change the account merely to fit a probe after creation.

```bash
ssh -F "$WORK_DIR/clusters/cluster-1/base/ssh.config" cluster-1-node1 'apt-get update && apt-get install -y jq git git-lfs bzip2 sqlite3'
SOURCE_DIR="$WORK_DIR/clusters/cluster-2/applications/forgejo"
ssh -F "$WORK_DIR/clusters/cluster-1/base/ssh.config" cluster-1-node1 \
  'umask 077; mkdir -p /root/bartl-reference/forgejo/bootstrap'
for key in username email password; do
  ssh -F "$WORK_DIR/clusters/cluster-1/base/ssh.config" cluster-1-node1 \
    "cat > /root/bartl-reference/forgejo/bootstrap/$key" < "$SOURCE_DIR/protected/bootstrap/$key"
done
ssh -F "$WORK_DIR/clusters/cluster-1/base/ssh.config" cluster-1-node1 \
  'cat > /root/bartl-reference/forgejo/host-key.pub' < "$WORK_DIR/evidence/forgejo-host-key.pub"
```

Install the pinned native Restic client on A for the later independent backup-readback checks. For a fresh client directory:

```bash
ssh -F "$WORK_DIR/clusters/cluster-1/base/ssh.config" cluster-1-node1 bash -s <<'REMOTE'
set -euo pipefail
cd /root/bartl-reference
test ! -e restic
curl -fL -o restic.bz2 https://github.com/restic/restic/releases/download/v0.19.1/restic_0.19.1_linux_amd64.bz2
printf 'f415415624dcc452f2a02b8c33641791a8c6d6d3b65bbb3543fcf9a25151585c  restic.bz2\n' | sha256sum --check
bzip2 -d restic.bz2
chmod 700 restic
./restic version
REMOTE
```

For a resumed test client, retain the existing verified binary and check its version rather than downloading over it.

Once all four source declarations exist, publish nonsecret test-client endpoint exports from the workstation:

```bash
source "$WORK_DIR/operations/workstation.env"
{
  printf 'BACKUP_HOST=%q\n' "$BACKUP_HOST"
  printf 'KC_HOST=%q\n' "$KC_HOST"
  printf 'FORGEJO_HOST=%q\n' "$FORGEJO_HOST"
  printf 'PAPERLESS_HOST=%q\n' "$PAPERLESS_HOST"
  printf 'INSTALLATION_ID=%q\n' "$(yq -er '.installation' "$VALUES")"
} | ssh -F "$WORK_DIR/clusters/cluster-1/base/ssh.config" cluster-1-node1 \
  'umask 077; mkdir -p /root/bartl-reference; cat > /root/bartl-reference/installation.env'
```

This remote file is derived test input only. Configuration, placement, package selection and teardown always read workstation `VALUES`.

## Verify browser access

In the provider realm selected by Keycloak's declaration, create a synthetic enabled user `reference-user` with verified email `reference-user@example.invalid`, a retained password and no pending required action. Use native Keycloak administration, not consumer-side email linking. Retain the realm/user/client IDs as temporary comparison inputs; they must survive recovery.

Open `https://$FORGEJO_HOST`, choose “Sign in with keycloak”, authenticate as that user and verify a distinct Forgejo `reference-user` account. Check logout and new login through the real HTTPS endpoint. Do not grant this user administration. Verify local `reference-admin` login separately. Keep comparison IDs under the exercise's ignored `evidence/` directory, without passwords or tokens.

Keep this Forgejo terminal for its package operations. Other packages use their own direnv-hooked terminals and resumption procedures. Continue with [service data and access checks](verification.md), including Paperless's source acceptance.
