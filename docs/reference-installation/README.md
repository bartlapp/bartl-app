# Recovering a Bartl installation on a separate cluster

Recover Keycloak and Forgejo on a separate K3s cluster with their source powered off. Check login, data, permissions, new writes and their backups, then remove the lab.

## What we are testing

Use three independent single-node clusters in your Hetzner Cloud project. A runs Restic and holds recovery inputs and the test client. B runs Keycloak and Forgejo with native OpenID Connect integration. C starts empty and becomes the replacement. A remains available; this exercise does not cover its loss.

You perform cross-service steps; the Application Controllers handle their internal procedures. Stop on failures or unclear prerequisites and resolve the cause with the responsible operator. Do not substitute versions or improvise repairs.

Use synthetic data and published packages; no builds are needed. Keep application data, images, backups and databases off the workstation. It holds only sources, installation values, protected access files and small operational records.

## Follow the sequence

Complete this page, then:

1. [Install Restic and Keycloak](applications.md).
2. [Integrate Forgejo](forgejo.md).
3. [Create and verify service data](verification.md).
4. [Exercise lifecycle and recovery](recovery.md).
5. [Verify reinstall and backup retrieval, then remove the lab](teardown.md).

Run the blocks once, in order. After a failure, establish the actual state before continuing; do not rerun whole chapters.

## Establish the budget before creating servers

You need:

- A dedicated Hetzner project with billing enabled, a read/write token and capacity for three Debian 13 amd64 CPX32 VMs in `nbg1`.
- Your own delegated deSEC zone and a token with record read/write/delete access.
- Bash, Git, hcloud, jq, curl, OpenSSH with a loaded key, dig, OpenSSL 3, Helm 4.3.0 and kubectl compatible with Kubernetes 1.36.
- Public IPv4 access from the workstation to SSH and the Kubernetes API.

In Bash, disable tracing and history before entering tokens. Keep secret values out of Git.

```bash
set +x
set +o history
```

Fill in this variable block, then run it:

```bash
export HCLOUD_TOKEN=''  # Token for your Hetzner project
export DESEC_TOKEN=''   # Token for your deSEC zone
```

Inspect existing resources and current prices:

```bash
hcloud server list
hcloud primary-ip list
hcloud volume list
hcloud load-balancer list
hcloud server-type describe cpx32
hcloud api /pricing | jq '.pricing | {
  currency, vat_rate,
  server: [.server_types[] | select(.name == "cpx32")
    | .prices[] | select(.location == "nbg1")],
  ipv4: [.primary_ips[] | select(.type == "ipv4")
    | .prices[] | select(.location == "nbg1")]
}'
```

Budget for three servers and three IPv4 addresses, including taxes, traffic charges and a reserve. Retain the current rates, currency, pricing date and calculation with the approval.

Before provisioning, confirm capacity and set a UTC deletion deadline. Use only the approved project and budget; add no volumes, load balancers, snapshots or paid backups. Teardown is manual. Delete the lab by the deadline even if the exercise is interrupted; powered-off servers still cost money.

## Create the private installation repository

Keep installation values and results in a private local repository, independent of the Forgejo being recovered. Use a new absolute path and an SSH key already registered in your Hetzner project.

Edit the values below. The protected-storage reference must identify custody accessible without B; lasting operation also requires independence from A.

```bash
export INSTALL_REPO="$HOME/repos/bartl-installation"
export K3S_SOURCE="$HOME/repos/bartlapp/base-k3s"
HCLOUD_PROJECT=''
DNS_ZONE=''
SSH_KEY_NAME=''
MAX_COST=''             # Approved total, including reserve
BUDGET_CURRENCY='EUR'
DELETE_BY_UTC=''        # ISO 8601 UTC timestamp
SECRET_CUSTODY_REF=''   # Storage reference, not secret contents
```

Create the repository:

```bash
export INSTALLATION="bartl-$(date -u +%Y%m%d%H%M%S)-$(openssl rand -hex 3)"
export DNS_SUFFIX="$INSTALLATION.$DNS_ZONE"
(
set -euo pipefail
: "${INSTALL_REPO:?}" "${HCLOUD_PROJECT:?}" "${DNS_ZONE:?}" "${SSH_KEY_NAME:?}"
: "${MAX_COST:?}" "${BUDGET_CURRENCY:?}" "${DELETE_BY_UTC:?}" "${SECRET_CUSTODY_REF:?}"
case "$INSTALL_REPO" in /*) ;; *) printf 'Absolute path required\n' >&2; exit 1;; esac
umask 077
test ! -e "$INSTALL_REPO"
mkdir -m 700 "$INSTALL_REPO"
git init --initial-branch=work-reference-installation "$INSTALL_REPO"
cd "$INSTALL_REPO"
mkdir values evidence .lab
printf '%s\n' "Project: $HCLOUD_PROJECT" "Approved limit: $MAX_COST $BUDGET_CURRENCY" \
  "Delete by UTC: $DELETE_BY_UTC" "Protected custody reference: $SECRET_CUSTODY_REF" > evidence/operator-inputs.txt
printf '.lab/\n' > .gitignore
cat > README.md <<EOF
# Installation $INSTALLATION

Record progress, deviations and verified results here at each write boundary.

## Scope and authority

- Hetzner project: $HCLOUD_PROJECT
- deSEC DNS zone: $DNS_ZONE
- Approved total budget, including reserve: $MAX_COST $BUDGET_CURRENCY
- Deletion deadline in UTC: $DELETE_BY_UTC
- Protected storage reference, without secret contents: $SECRET_CUSTODY_REF

Recover Keycloak and Forgejo from B onto C with B powered off. A supplies backups and recovery inputs. Verify login, retained data and permissions, new writes and their backups.

## Operation and evidence

Follow the [walkthrough](https://github.com/bartlapp/bartl-app/blob/main/docs/reference-installation/README.md). Keep package pins and nonsecret inputs in [installation.env](installation.env); configuration, infrastructure manifests and exported effective Helm values in [values/](values/); sanitized results in [evidence/](evidence/).

For each secret, record its name, purpose, owner and custody reference, never its contents. Before deleting A, either discard the synthetic recovery inputs or retain them independently for continuing operation.
EOF
)
```

If initialization fails, stop and resolve the input or directory state. Do not overwrite an existing repository. Otherwise:

```bash
cd "$INSTALL_REPO"
```

Keep `.lab/` protected and outside Git. It holds kubeconfigs, SSH host keys and resource-creation records.

### Use the pinned packages

Keep these pins unchanged:

```bash
cat > installation.env <<EOF
INSTALLATION=$INSTALLATION
DNS_ZONE=$DNS_ZONE
BACKUP_HOST=backup.$DNS_SUFFIX
KC_HOST=keycloak.$DNS_SUFFIX
FORGEJO_HOST=forgejo.$DNS_SUFFIX
LOCATION=nbg1
SERVER_TYPE=cpx32
SSH_KEY_NAME="$SSH_KEY_NAME"
RESTIC_SOURCE=oci://ghcr.io/bartlapp/bartl-restic@sha256:aeaa22dd009fd505c86049de285c81e0a44ab68640f528dc297d6d67efd306de
RESTIC_CHART=oci://ghcr.io/bartlapp/bartl-restic@sha256:78d118df791192bcc8dc08ce7ce13ded3ac01b51c33cd19090c30cb7c2d8f20a
KEYCLOAK_SOURCE=oci://ghcr.io/bartlapp/bartl-keycloak@sha256:e5ec4b622b6b1aec736ae9aecec298c706d12aeed78215c154ddeacbb59257c4
KEYCLOAK_CHART=oci://ghcr.io/bartlapp/bartl-keycloak@sha256:05e664e8c561685ba605a5a02ccc6649aafbb7c3bf3a0c808abc91cffae53aa0
FORGEJO_CHART=oci://ghcr.io/bartlapp/bartl-forgejo@sha256:c9d6e7189d29b7b2923a61c5036e38197005912fdd68c6acec6a78654e297f3c
EOF
source installation.env

helm show chart "$RESTIC_SOURCE"
helm show chart "$RESTIC_CHART"
helm show chart "$KEYCLOAK_SOURCE"
helm show chart "$KEYCLOAK_CHART"
helm show chart "$FORGEJO_CHART"
```

Expect Restic 0.2.0 and 0.2.1, Keycloak packages 0.5.0 and 0.5.1, and Forgejo package 0.1.0. Native Keycloak stays at 26.6.2; Forgejo upgrades from 16.0.7 to 17.0.1. Use no image overrides or mutable chart tags.

## Build three independent K3s bases

Follow the [K3s guide](https://github.com/bartlapp/base-k3s/blob/main/README.md) three times, creating independent servers without joining nodes.

Clone `https://github.com/bartlapp/base-k3s.git` to `$K3S_SOURCE` if absent. Separate working copies prevent one cluster's kubeconfig and SSH configuration from overwriting another's:

```bash
git clone --no-hardlinks "$K3S_SOURCE" "$INSTALL_REPO/.lab/a"
git clone --no-hardlinks "$K3S_SOURCE" "$INSTALL_REPO/.lab/b"
git clone --no-hardlinks "$K3S_SOURCE" "$INSTALL_REPO/.lab/c"
```

Repeat for `SLOT=a`, `SLOT=b` and `SLOT=c`:

```bash
SLOT=a
cd "$INSTALL_REPO/.lab/$SLOT"
source "$INSTALL_REPO/installation.env"
export NAME="$INSTALLATION-$SLOT"
export LOCATION SERVER_TYPE SSH_KEY_NAME
SSH_PUBLIC_KEY=$(ssh-add -L)
export SSH_PUBLIC_KEY="${SSH_PUBLIC_KEY%%$'\n'*}"
export STATE="$PWD/.lab/$NAME"
```

In each copy, follow the K3s guide from "Create the VM with Hetzner" through "Verify and hand over the base", including SSH, workstation access and certificate management. Keep the values above and reuse the registered SSH key. Skip Hello World.

Each cluster must have one Ready node; available CoreDNS, local-path, Traefik and cert-manager deployments; default StorageClass `local-path`; the Traefik IngressClass; KUBE-ROUTER-FORWARD rules; and the correct Hetzner firewall. Restrict SSH and the Kubernetes API to the administrator's IPv4 address; allow HTTP and HTTPS.

After all three passes, on the workstation:

```bash
cd "$INSTALL_REPO"
export KA="$INSTALL_REPO/.lab/a/.lab/kubeconfig"
export KB="$INSTALL_REPO/.lab/b/.lab/kubeconfig"
export KC="$INSTALL_REPO/.lab/c/.lab/kubeconfig"
for config in "$KA" "$KB" "$KC"; do
  kubectl --kubeconfig "$config" config current-context
  kubectl --kubeconfig "$config" get namespace kube-system \
    -o jsonpath='{.metadata.uid}{"\n"}'
done
kubectl --kubeconfig "$KC" get namespaces,pvc --all-namespaces
```

The three `kube-system` UIDs must differ. C must have no application namespaces or PVCs. Always select the target cluster explicitly by kubeconfig.

## Resume a workstation session

After the base setup, create the token-free session file:

```bash
cat > .lab/workstation.env <<'ENV'
: "${INSTALL_REPO:?Absolute path of your installation repository required}"
: "${HCLOUD_TOKEN:?Load your own project token from protected custody}"
: "${DESEC_TOKEN:?Load your own deSEC zone token from protected custody}"
export HCLOUD_TOKEN DESEC_TOKEN
cd "$INSTALL_REPO"
source installation.env
export KA="$INSTALL_REPO/.lab/a/.lab/kubeconfig"
export KB="$INSTALL_REPO/.lab/b/.lab/kubeconfig"
export KC="$INSTALL_REPO/.lab/c/.lab/kubeconfig"
A_IP=$(cat ".lab/a/.lab/$INSTALLATION-a/host")
B_IP=$(cat ".lab/b/.lab/$INSTALLATION-b/host")
C_IP=$(cat ".lab/c/.lab/$INSTALLATION-c/host")
ADMIN_IP=$(curl --ipv4 --fail --silent --show-error https://api.ipify.org)
DNS_API="https://desec.io/api/v1/domains/$DNS_ZONE"
desec() {
  printf 'header = "Authorization: Token %s"\n' "${DESEC_TOKEN:?}" |
    curl --config - --fail-with-body --silent --show-error "$@"
}
current_condition() {
  local config="$1" namespace="$2" resource="$3" condition="$4"
  kubectl --kubeconfig "$config" -n "$namespace" get "$resource" -o json |
    jq -e --arg condition "$condition" '
      .metadata.generation as $g | .status.observedGeneration==$g and
      any(.status.conditions[]; .type==$condition and .status=="True" and .observedGeneration==$g)'
}
ENV
source .lab/workstation.env
git -C "$K3S_SOURCE" rev-parse HEAD > evidence/base-k3s-revision.txt
```

In a new Bash session, repeat the token setup above, then edit the path and load the session:

```bash
export INSTALL_REPO="$HOME/repos/bartl-installation"
source "$INSTALL_REPO/.lab/workstation.env"
```

If your public IPv4 address changes, run "Update administrator access" in each base checkout and update application allowlists. After an SSH `exit`, continue on the workstation.

## Keep recovery inputs accessible

Secrets are generated on A. Record only their names, purposes, owners and custody references in the installation repository.

For lasting handover, retain repository keys, credentials, native configuration, identity secrets and recovery/infrastructure access in customer-controlled storage independent of A. Verify access without the services being recovered. Agree retention, acceptable data loss, recovery time and deletion responsibility before continuing beyond the lab.

Continue with [Install the applications](applications.md).
