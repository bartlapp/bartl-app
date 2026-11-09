# Recovering a Bartl installation on a separate cluster

A running application does not tell us whether we can recover it. We need to take away its original environment, reconstruct it from the inputs we have retained, and check that people can use it again. New work must then reach a new backup; otherwise we have restored yesterday's service without restoring its protection.

This walkthrough exercises that sequence with Keycloak and Forgejo in your own Hetzner Cloud project. You build three independent single-node K3s clusters, install the applications, use them with synthetic data, recover them on the replacement cluster and remove the lab afterwards.

## What we are testing

Cluster A runs bartl-restic and holds the protected recovery inputs and test client. Cluster B runs bartl-keycloak and bartl-forgejo, with Forgejo's native OpenID Connect integration against Keycloak. Cluster C starts with only the K3s base. Keeping the clusters separate lets us shut down B and check recovery on C without access to the original application environment. A remains available throughout; losing the backup host is outside this exercise.

The result we want is a usable service on C: authentication works, data and permissions survive, new writes succeed and both applications produce new backups. The later chapters also exercise upgrades, restarts, stop/start and reinstalling with retained storage.

As Installation Administrator, you perform each step that crosses service boundaries. Helm declares the intended state; the existing Application Controllers execute their internal procedures. There is no Company Controller or script coordinating the whole installation. If a prerequisite is unclear or a step fails, stop and resolve the cause with the responsible operator. Do not repair silently, change versions or substitute another procedure.

Use synthetic application data only. Application data, images, backups, databases and build artifacts stay off the workstation. It holds Git sources, installation values, protected cluster access files and small operational records. This exercise uses published artifacts and requires no builds.

## Follow the sequence

Start here with the budget, private installation repository and three K3s bases. Then continue through the linked chapters:

1. [Install the applications](applications.md): configure DNS, Restic on A and Keycloak on B.
2. [Integrate Forgejo](forgejo.md): configure its native settings, storage, SSH and Keycloak integration.
3. [Exercise the service](verification.md): create synthetic data and check Git, LFS, pull requests, issues, attachments, releases and packages.
4. [Exercise lifecycle and recovery](recovery.md): create backups, upgrade packages, restart and stop/start the applications. Take the final capture, fence B, reconstruct and upgrade on C, reinstall Restic with its PVC retained, open access deliberately and create new backups.
5. [Remove the installation](teardown.md): reinstall Forgejo with its PVCs retained, retrieve new work from the subsequent backup, retain the evidence and delete the resources.

These blocks form a one-time sequence, not an idempotent installation script. After a stop, establish the actual state before continuing; do not rerun whole chapters. Each chapter distinguishes workstation commands from SSH sessions. Reload its variables when changing terminals.

## Establish the budget before creating servers

Use a dedicated Hetzner Cloud project with billing enabled, your own read/write API token and capacity for three CPX32 VMs in `nbg1`, running Debian 13 on amd64. Record the project and budget approval in the installation repository. Provision only in that approved project.

The workstation needs Bash, Git, hcloud, jq, curl, OpenSSH with a loaded key, dig, OpenSSL 3, Helm 4.3.0 and a kubectl compatible with Kubernetes 1.36. It must be able to reach SSH and the Kubernetes API over public IPv4.

The DNS commands use your own already-delegated deSEC zone and a token permitted to read, create, change and delete its records. Do not use someone else's zone or token. Another DNS provider needs its own documented procedure; it is not the variant shown here.

Keep shell tracing disabled throughout. Load tokens from protected storage or enter them interactively without putting their values into shell history:

```bash
read -r -s -p 'Hetzner project token: ' HCLOUD_TOKEN; printf '\n'
read -r -s -p 'deSEC token for your own zone: ' DESEC_TOKEN; printf '\n'
export HCLOUD_TOKEN DESEC_TOKEN
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

Calculate the cost of three servers and three IPv4 addresses at the current hourly rates, including taxes, included traffic and possible additional charges. Check it against your approved total budget. Retain the currency, pricing date, calculation and reserve in the installation repository. This walkthrough supplies neither budget approval nor a fixed provider price.

Before provisioning, confirm the project, prices, available capacity and included traffic, and set a concrete deletion deadline in UTC. Do not order additional volumes, load balancers, snapshots or paid backups. Delete the resources created for this exercise by that deadline. An interruption does not stop their cost, and powering off a server does not stop billing. There is no automatic teardown.

## Create the private installation repository

This repository contains the reusable procedure. Your installation needs its own record of actual values, protected-storage references and results. Create that record locally, in a private repository without a remote. The commands below do not publish or push it. Recovery must not depend on the Forgejo instance being recovered.

In a Bash session on the workstation, enter your inputs. The absolute repository path must not exist yet. First register the SSH key in your project as described in the K3s guide, then supply its name here. The protected storage you reference must be accessible independently of B and its Forgejo instance. For lasting operation, it must also be independent of A.

```bash
read -r -p 'New absolute installation repository path: ' INSTALL_REPO
read -r -p 'Hetzner project name: ' HCLOUD_PROJECT
read -r -p 'Your delegated deSEC zone: ' DNS_ZONE
read -r -p 'Existing project SSH key name: ' SSH_KEY_NAME
read -r -p 'Approved total cost limit (including reserve): ' MAX_COST
read -r -p 'Budget currency: ' BUDGET_CURRENCY
read -r -p 'Deletion deadline (UTC, ISO 8601): ' DELETE_BY_UTC
read -r -p 'Independent protected custody reference (no secret): ' SECRET_CUSTODY_REF
export INSTALL_REPO
export K3S_SOURCE="$HOME/repos/bartlapp/base-k3s"
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

This private installation record follows a synthetic exercise from preparation through recovery and teardown. Record the current state and observed results as the work proceeds.

## Scope and authority

- Hetzner project: $HCLOUD_PROJECT
- deSEC DNS zone: $DNS_ZONE
- Approved total budget, including reserve: $MAX_COST $BUDGET_CURRENCY
- Deletion deadline in UTC: $DELETE_BY_UTC
- Protected storage reference, without secret contents: $SECRET_CUSTODY_REF

A holds the backup service, recovery inputs and test client. B runs Keycloak and Forgejo. C is the independent replacement. The exercise checks recovery with B powered off: native authentication, retained data and permissions, new writes and their backup. A must remain available. For lasting operation, retain the recovery inputs in protected storage independent of A as well.

## Operation and evidence

Follow the [manual walkthrough](https://github.com/bartlapp/bartl-app/blob/main/docs/reference-installation/README.md) for setup, verification, recovery and teardown. The administrator performs each cross-service step.

[installation.env](installation.env) records the immutable packages and nonsecret inputs. [values/](values/) contains the declared configuration, installation-specific infrastructure manifests and effective Helm values exported before shutdown. [evidence/](evidence/) contains operator inputs and sanitized results. Record each secret's name, purpose, owner and actual protected-storage reference there, never its contents.

At each write boundary, update this record with the current operating state, deviations and observed results. Support success claims with retained evidence. Before deleting A, decide whether its synthetic recovery inputs may be discarded or must remain independently protected for a continuing installation.
EOF
)
```

If initialization fails, stop here and resolve the input or directory state. The subshell leaves the interactive shell open; that is not permission to continue after a failure. Do not overwrite an existing repository.

Only after successful initialization, enter the new repository:

```bash
cd "$INSTALL_REPO"
```

Keep complete effective Helm values in `values/` and small, sanitized operational records in `evidence/`. Neither may contain secrets. `.lab/` is excluded from Git and holds protected local files such as kubeconfigs, SSH host keys and resource-creation records. Passwords and other secret contents must never enter Git.

### Use the pinned packages

The package selection belongs to the procedure, not to the installation's free inputs:

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

Expect Restic packages 0.2.0 and 0.2.1, Keycloak packages 0.5.0 and 0.5.1, and Forgejo package 0.1.0. Both Keycloak packages run native Keycloak 26.6.2. The native application version change in this exercise is Forgejo 16.0.7 to 17.0.1. Do not use image overrides or mutable chart tags.

## Build three independent K3s bases

Follow the [K3s guide](https://github.com/bartlapp/base-k3s/blob/main/README.md) for provisioning, SSH, installation and teardown. Each pass creates a separate K3s server. Do not join the three nodes into one cluster or use another cluster's join token.

If `base-k3s` is not already present at the sibling-repository path set above, clone it from `https://github.com/bartlapp/base-k3s.git`. Then create one working copy per cluster. This prevents the guide's `.lab/kubeconfig` and `.lab/ssh.config` files from overwriting those of the previous cluster:

```bash
git clone --no-hardlinks "$K3S_SOURCE" "$INSTALL_REPO/.lab/a"
git clone --no-hardlinks "$K3S_SOURCE" "$INSTALL_REPO/.lab/b"
git clone --no-hardlinks "$K3S_SOURCE" "$INSTALL_REPO/.lab/c"
```

Use this entry block for each pass, setting `SLOT=a`, then `SLOT=b`, then `SLOT=c`:

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

In that working copy, follow the K3s guide from "Create the VM with Hetzner". Keep the values just set rather than replacing them with the guide's examples, and reuse the registered project SSH key. Complete "Connect and follow logs", "Install K3s", "Enable workstation access", "Install certificate management" and "Verify and hand over the base". Skip the optional Hello World run.

For each cluster, check that its single node is Ready; the CoreDNS, local-path, Traefik and cert-manager deployments are available; `local-path` is the default StorageClass; and the Traefik IngressClass exists. Verify the KUBE-ROUTER-FORWARD rules and the assigned Hetzner firewall. SSH and the Kubernetes API must be reachable only from the administrator's IPv4 address. HTTP and HTTPS are needed for the application endpoints.

After all three passes, return to the installation repository on the workstation:

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

The three `kube-system` UIDs must differ. C must have no application namespaces or PVCs yet. From here on, always use the specified kubeconfig; the last terminal you used does not establish the target cluster.

## Resume a workstation session

After completing the bases, create the local session entry point below. It contains no tokens. Keep it and the other small files under `.lab/` protected and outside Git.

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

In each new workstation terminal, set `INSTALL_REPO` to your absolute path, load your two API tokens securely and run `source "$INSTALL_REPO/.lab/workstation.env"`. If the administrator's IPv4 address has changed, first follow "Update administrator access" in every base checkout, then adjust any application-specific allowlists through their documented procedures. The later chapters open a separate SSH session on A for each block that needs one; after `exit`, continue on the workstation.

## Keep recovery inputs accessible

The later steps generate secrets on A. Record their names, purposes, owners and actual protected-storage references in the installation repository, not their contents.

Before handing over a lasting installation, also place the repository keys, reader/writer/admin credentials, native configuration and identity secrets, Keycloak recovery access and administrative infrastructure access in the named customer-controlled storage independent of A. Check that they can be read without the services they are meant to recover. Agree retention, acceptable data loss, recovery time and responsibility for deletion before lasting operation. The lab teardown discards only the synthetic data created here.

Continue with [Install the applications](applications.md).
