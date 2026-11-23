# Integrate Forgejo with Keycloak

Complete [Restic and Keycloak installation](applications.md). Use native OAuth2/OpenID Connect; no login proxy or automatic account linking by email.

Enter B's cluster directory and wait for the next prompt. This selects Base access, not a Forgejo deployment:

```bash
cd "$WORK_DIR/clusters/cluster-2"
```

At that next prompt, start a child Bash without direnv's prompt hook:

```bash
bash --noprofile --norc
source "$WORK_DIR/operations/workstation.env"
```

Run this chapter in that child shell. Base's watched-record reload clears deployment fields at cluster scope, whereas Forgejo's recorded/manual interface retains the variables set by its own procedure. The additional Restic handoff shell below is nested inside this Forgejo shell; its `exit` returns here, not to the parent direnv shell.

Follow the [Forgejo README](https://github.com/bartlapp/bartl-forgejo/blob/main/README.md#supported-profile-and-release) through acquisition of its verified 0.2.2 archive. Preserve the existing `WORK_DIR` and `VALUES`, not its sample paths. In **Configure a new deployment**, choose `DEPLOYMENT=forgejo`, `INSTANCE=forgejo`, `CLUSTER_ID=cluster-2`, `NS=forgejo`, `RELEASE=forgejo` and `PACKAGE=forgejo`. Run the creation block once.

Before the next declaration-rendering block, record the source native version and composition choices:

```bash
yq -i '.operations.deployments.forgejo.version = "16.0.7" |
  .services.forgejo.identityProvider = "keycloak" |
  .services.forgejo.backup.endpoint = "restic" |
  .services.forgejo.backup.schedule = "0 2 * * *" |
  .services.forgejo.backup.timeZone = "Europe/Berlin" |
  .services.forgejo.ssh.exposure = "NodePort" |
  .services.forgejo.ssh.nodePort = 30222' "$VALUES"
```

The package's recorded-deployment logic applies this native version during rendering and installation. Do not reproduce its Helm argument mapping or assume a deployment directory selector exists for Forgejo. Continue declaration rendering and independent state/staging claim creation; 20Gi each is a synthetic sizing choice.

At **DNS, TLS and SSH exposure**, use the [DNS checkpoint](applications.md#dns-checkpoint) with `HOST="$FORGEJO_HOST"` and `IP="$B_IP"` after sourcing the workstation helper. Continue the package's managed/external TLS path. The SSH firewall checkpoint below supplies the actual NodePort route.

At **Optional composition with Keycloak and Restic**, use these provider selections in its binding blocks instead of its sample locations:

```bash
export KC_DEPLOYMENT=keycloak
export KC_CONNECTIONS="$WORK_DIR/clusters/cluster-2/applications/keycloak/connections.yaml"
export RESTIC_DEPLOYMENT=restic
export RESTIC_CONNECTIONS="$WORK_DIR/clusters/cluster-1/applications/restic/restic-connections.yaml"
export REPOSITORY_NAME=forgejo
```

Before executing the composed-backup block that creates runtime Secrets, supply its repository files: open a child Bash with `bash --noprofile --norc`, follow Restic's **Resume an existing deployment** for `DEPLOYMENT=restic` using the same `WORK_DIR` and `VALUES`, then **Connect an application** with `REPOSITORY=forgejo` and `CONSUMER_DIR="$WORK_DIR/clusters/cluster-2/applications/forgejo"`. Run `exit` to return to the Forgejo shell. Keep the composed binding, not an additional direct `backup.repository` override.

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

Once all three source declarations exist, publish nonsecret test-client endpoint exports from the workstation:

```bash
source "$WORK_DIR/operations/workstation.env"
{
  printf 'BACKUP_HOST=%q\n' "$BACKUP_HOST"
  printf 'KC_HOST=%q\n' "$KC_HOST"
  printf 'FORGEJO_HOST=%q\n' "$FORGEJO_HOST"
} | ssh -F "$WORK_DIR/clusters/cluster-1/base/ssh.config" cluster-1-node1 \
  'umask 077; mkdir -p /root/bartl-reference; cat > /root/bartl-reference/installation.env'
```

This remote file is derived test input only. Configuration, placement, package selection and teardown always read workstation `VALUES`.

## Verify browser access

In the provider realm selected by Keycloak's declaration, create a synthetic enabled user `reference-user` with verified email `reference-user@example.invalid`, a retained password and no pending required action. Use native Keycloak administration, not Forgejo-side email linking. Record the realm, user UUID and Forgejo client UUID in the nonsecret operating record; these identities must survive recovery.

Open `https://$FORGEJO_HOST`, choose “Sign in with keycloak”, authenticate as that user and verify a distinct Forgejo `reference-user` account. Check logout and new login through the real HTTPS endpoint. Do not grant this user administration. Verify local `reference-admin` login separately. Retain provider/user/client IDs and acceptance results under `operations` or `evidence`, without passwords or tokens. Continue with [service data and access checks](verification.md).

After these checks, leave the Forgejo child shell and restore the parent shell's Keycloak selection:

```bash
exit
cd "$WORK_DIR/clusters/cluster-2/applications/keycloak"
```

Wait for the next prompt before continuing. Keycloak again uses its deployment selector; Forgejo operations in the recovery chapter use their explicitly separated manual shell.
