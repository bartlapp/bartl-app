# Recover a Bartl installation on a separate cluster

Run one customer installation across three independent single-node K3s clusters: A (`cluster-1`) holds Restic and the synthetic test client; B (`cluster-2`) runs Keycloak and Forgejo; C (`cluster-3`) starts empty and replaces B. A remains available. A/B/C are shorthand for these fixed IDs throughout the walkthrough. This exercises planned source retirement and recovery, not loss of the backup provider or source-independent fencing.

Follow [application installation](applications.md), [Forgejo integration](forgejo.md), [service acceptance](verification.md), [lifecycle and recovery](recovery.md), then [cleanup](#cleanup). Run workstation blocks in Bash with tracing off. Package READMEs own application preparation and lifecycle commands; this walkthrough supplies composition, retained targets and acceptance order. No company tooling or password store is required when the operator supplies protected credentials.

## Prerequisites and cost

Use the [operator workstation](../operator-workstation.md), compatible kubectl, Helm 4, Mike Farah yq v4, jq, OpenSSL, curl and shasum. You need an authorized dedicated Hetzner project, a registered SSH identity, a delegated deSEC zone and usable credentials for both providers. Check capacity and approved spending/lifetime for three Debian 13 amd64 CPX32 servers in `hel1` (or the retained cluster locations), including IPv4 and traffic. Powered-off servers still cost money. No volumes, load balancers, snapshots or paid backups are required by this exercise.

```bash
set -euo pipefail
set +x
set +o history
umask 077
: "${HCLOUD_TOKEN:?Supply the authorized project credential}"
: "${DESEC_TOKEN:?Supply the authorized zone credential}"
export HCLOUD_TOKEN DESEC_TOKEN
export CUSTOMER_ID=${CUSTOMER_ID:-acme}
: "${HETZNER_PROJECT:?Supply the authorized Hetzner project designation}"
export HETZNER_PROJECT
export INSTALLATION_ID=${INSTALLATION_ID:-$CUSTOMER_ID}
export WORK_DIR_ROOT=${WORK_DIR_ROOT:-"$HOME/bartl"}
export WORK_DIR=${WORK_DIR:-"$WORK_DIR_ROOT/$CUSTOMER_ID/${INSTALLATION_ID}-installation"}
case "$WORK_DIR" in /*) ;; *) printf 'Absolute WORK_DIR required\n' >&2; exit 1;; esac
export VALUES="$WORK_DIR/installation.yaml"
case "$VALUES" in /*) ;; *) printf 'Absolute VALUES required\n' >&2; exit 1;; esac
mkdir -p "$WORK_DIR/packages" "$WORK_DIR/operations" "$WORK_DIR/evidence"
if test ! -e "$VALUES"; then
  BASE_DOMAIN="${BASE_DOMAIN:-acme.fke.systems}" yq -n '
    .schemaVersion = 1 | .customer = strenv(CUSTOMER_ID) |
    .installation = strenv(INSTALLATION_ID) | .dns.root = strenv(BASE_DOMAIN)
  ' > "$VALUES"
fi
yq -e '.schemaVersion == 1' "$VALUES" >/dev/null
cd "$WORK_DIR"
hcloud server list
hcloud primary-ip list
hcloud server-type describe cpx32
hcloud api /pricing | jq '.pricing | {currency,vat_rate,server_types,primary_ips}'
```

For a real run, review the retained installation identity and DNS root before provisioning. Existing values are authoritative. Do not regenerate identity or start another installation file when resuming an interrupted run.

## Build three independent K3s bases

Use the [base-k3s recipe](https://github.com/bartlapp/base-k3s/blob/main/README.md) with its checkout selected as `BASE_REPO`, the existing `WORK_DIR` and authorized `HETZNER_PROJECT`. Do not recreate `installation.yaml`. Before the first pass, if the supplied record has no root `.envrc` yet:

```bash
cp "$BASE_REPO/installation.envrc" "$WORK_DIR/.envrc"
cd "$WORK_DIR"
cat .envrc
direnv allow
```

For a prepared installation, use only `cd "$WORK_DIR"` instead. At the next prompt, the first pass for a fresh record starts at **Register the Hetzner project** before **Define the new cluster**; preserve that provider binding on subsequent passes. Choose `NEW_CLUSTER_ID=cluster-1` and `NEW_VM_ID=vm-1`, followed by `cluster-2`/`vm-2` and `cluster-3`/`vm-3` for the next passes, and continue through handover. Subsequent new-cluster passes start at **Define the new cluster**. These are creation inputs, separate from active cluster selection. Existing clusters use **Work with an existing cluster**.

Each server must be independent, not joined to another cluster. Base records machine identities and IP allocations under the referenced `vms` entry, and API access and typed firewall observations under the cluster. Do not repeat uncertain creation: reconcile the retained intent and live provider inventory first.

The root `.envrc` defines access paths; cluster selectors choose the target. After the three passes, use those definitions for verification:

```bash
for cluster in cluster-1 cluster-2 cluster-3; do
  direnv exec "$WORK_DIR/clusters/$cluster" kubectl get nodes,storageclass
  direnv exec "$WORK_DIR/clusters/$cluster" kubectl get namespace kube-system -o jsonpath='{.metadata.uid}{"\n"}'
done
direnv exec "$WORK_DIR/clusters/cluster-3" kubectl get namespaces,pvc --all-namespaces
```

Require three distinct `kube-system` UIDs, one Ready node per cluster, usable CoreDNS/local-path/Traefik/cert-manager, enforced NetworkPolicy and empty application state on C. Restrict SSH/API to the administrator; allow required HTTPS and Git SSH paths deliberately.

## Package handoffs

Create each deployment only in its package's new-installation procedure, in the order Restic on A, Keycloak on B, then Forgejo on B. Do not pre-create package, service or replacement records: creation blocks require unused keys and may initialize the selected service entry.

| Package | Deployment / instance / package key | Cluster | Namespace | Helm release |
| --- | --- | --- | --- | --- |
| Restic | `restic` | `cluster-1` | `backup` | `backup` |
| Keycloak | `keycloak` | `cluster-2` | `keycloak` | `keycloak` |
| Forgejo | `forgejo` | `cluster-2` | `forgejo` | `forgejo` |

Use the current Keycloak README's latest-stable acquisition and normalized chart cache; its deployment selector loads the recorded package. This documents the current delivery interface, which still awaits stable publication and live qualification. Do not substitute historical 0.6.1 commands if the registry does not yet provide that interface: stop before Keycloak installation until the matching stable artifacts are available.

Restic 0.3.0 and Forgejo 0.2.2 retain their README-owned verified archives and explicit recorded-deployment resumption. They do not gain deployment selectors merely because Base provides a loader. Their package procedures own instance selection and operation-intent precedence; this walkthrough does not reproduce that mapping.

Use empty application targets. These interface changes are not a qualified upgrade from the historical walkthrough. For an existing deployment, use its package's resume/recovery procedure, never rerun new-installation blocks. Choose `keycloak-replacement` and `forgejo-replacement` only when the recovery chapter reaches the respective package's replacement setup on C.

Local verification on 2026-11-23 checked shell syntax and cross-package handoff links, the relocated ingress configuration merge, and native subsequent-backup content checks against a synthetic capture. Git readback, manifest hashes, SQLite integrity/issue content and package bytes passed; missing issue content and corrupt package bytes were refused. No cloud, cluster, real backup restoration or browser acceptance was executed. The coordinated three-cluster path remains unqualified until those live procedures run against the selected artifacts.

## Prepare workstation commands

Retain the walkthrough's workstation helper under `operations/` alongside its operating records. On resume source it after selecting `WORK_DIR` and `VALUES`. It reads cross-service endpoints and test facts only; it neither selects a package nor renders Helm inputs. Package commands may replace shell variables, so resume the intended package before each package operation. Endpoint exports appear as their package procedures create declarations.

```bash
cat > "$WORK_DIR/operations/workstation.env" <<'ENV'
: "${WORK_DIR:?}" "${VALUES:?}"
export KA="$WORK_DIR/clusters/cluster-1/base/kubeconfig"
export KB="$WORK_DIR/clusters/cluster-2/base/kubeconfig"
export KC="$WORK_DIR/clusters/cluster-3/base/kubeconfig"
A_VM=$(yq -o=json '.clusters."cluster-1".nodes' "$VALUES" | jq -er 'if length == 1 and (to_entries[0].value.role == "server") then keys[0] else error("Expected one server VM") end')
B_VM=$(yq -o=json '.clusters."cluster-2".nodes' "$VALUES" | jq -er 'if length == 1 and (to_entries[0].value.role == "server") then keys[0] else error("Expected one server VM") end')
C_VM=$(yq -o=json '.clusters."cluster-3".nodes' "$VALUES" | jq -er 'if length == 1 and (to_entries[0].value.role == "server") then keys[0] else error("Expected one server VM") end')
export A_VM B_VM C_VM
A_IP=$(yq -er '.vms[strenv(A_VM)].observed.primaryIPv4.address' "$VALUES")
B_IP=$(yq -er '.vms[strenv(B_VM)].observed.primaryIPv4.address' "$VALUES")
C_IP=$(yq -er '.vms[strenv(C_VM)].observed.primaryIPv4.address' "$VALUES")
DNS_ZONE=$(yq -er '.providers[.dns.provider].scope.zone // .dns.root' "$VALUES")
export RESTIC_CONNECTIONS="$WORK_DIR/clusters/cluster-1/applications/restic/restic-connections.yaml"
export KC_CONNECTIONS="$WORK_DIR/clusters/cluster-2/applications/keycloak/connections.yaml"
export FORGEJO_CONNECTIONS="$WORK_DIR/clusters/cluster-2/applications/forgejo/forgejo-connections.yaml"
if [ -s "$RESTIC_CONNECTIONS" ]; then
  BACKUP_HOST=$(yq -er '.services.restic.endpoints.https.hostname' "$RESTIC_CONNECTIONS")
  export BACKUP_HOST
fi
if [ -s "$KC_CONNECTIONS" ]; then
  KC_HOST=$(yq -er '.services.keycloak.endpoints.https.hostname' "$KC_CONNECTIONS")
  export KC_HOST
fi
if [ -s "$FORGEJO_CONNECTIONS" ]; then
  FORGEJO_HOST=$(yq -er '.services.forgejo.endpoints.https.hostname' "$FORGEJO_CONNECTIONS")
  export FORGEJO_HOST
fi
ADMIN_IP=$(curl --ipv4 --fail --silent --show-error https://api.ipify.org)
DNS_API="https://desec.io/api/v1/domains/$DNS_ZONE"
desec() {
  printf 'header = "Authorization: Token %s"\n' "${DESEC_TOKEN:?}" |
    curl --config - --fail-with-body --silent --show-error "$@"
}
current_condition() {
  kubectl --kubeconfig "$1" -n "$2" get "$3" -o json |
    jq -e --arg condition "$4" '.metadata.generation as $g |
      .status.observedGeneration==$g and any(.status.conditions[];
      .type==$condition and .status=="True" and .observedGeneration==$g)'
}
ENV
source "$WORK_DIR/operations/workstation.env"
```

Protected inputs remain independently usable outside B/C and their Keycloak. The test client and synthetic payloads may live on A under `/root/bartl-reference/forgejo`. Configuration is only `VALUES`; a derived remote `installation.env` may export endpoint variables for that client but must never be used as authoritative installation configuration.

## Cleanup

Retain `VALUES` and access files until all cloud deletions finish. Remove only this run's retained DNS records after reading live identity/address and checking against `operations.dns`; never delete the zone or unrelated names. For each recorded A record:

```bash
for host in "$BACKUP_HOST" "$KC_HOST" "$FORGEJO_HOST"; do
  subname=${host%.$DNS_ZONE}
  desec "$DNS_API/rrsets/$subname/A/" | jq .
  # Compare the result with operations.dns and the currently active cluster first.
  desec --request DELETE "$DNS_API/rrsets/$subname/A/"
done
```

Complete package removal on reachable targets; B's confirmed source retirement must not be undone merely to uninstall it. After confirming data disposition, enter the directories for `cluster-2`, `cluster-3`, then `cluster-1` and follow Base's [Remove the selected cluster](https://github.com/bartlapp/base-k3s/blob/main/README.md#remove-the-selected-cluster). Inspect remaining consumers and compare the live resources with the retained observations before authorizing deletion; Base relies on operator inspection, not an automated resource-graph guard. It removes the selected cluster/VM and retired deployment/operation/recovery records only after verifying resource absence. For interrupted provisioning or deletion, reconcile the provider inventory and remove only the remaining owned resources instead of replaying the normal recipe. Deleting A destroys this exercise's synthetic backup history and credentials. Confirm the provider inventory contains no remaining resources from the run. Local deletion is a separate explicit retention decision, not an automatic command in this recipe.

## Historical version evidence

The preceding walkthrough used Restic 0.2.0 (`sha256:aeaa22dd009fd505c86049de285c81e0a44ab68640f528dc297d6d67efd306de`) then 0.2.1 (`sha256:78d118df791192bcc8dc08ce7ce13ded3ac01b51c33cd19090c30cb7c2d8f20a`), Keycloak 0.5.0 (`sha256:e5ec4b622b6b1aec736ae9aecec298c706d12aeed78215c154ddeacbb59257c4`) then 0.5.1 (`sha256:05e664e8c561685ba605a5a02ccc6649aafbb7c3bf3a0c808abc91cffae53aa0`), and Forgejo 0.1.0 (`sha256:c9d6e7189d29b7b2923a61c5036e38197005912fdd68c6acec6a78654e297f3c`). References were OCI charts under `ghcr.io/bartlapp/bartl-<package>`. Native Keycloak stayed at 26.6.2; Forgejo moved from 16.0.7 to 17.0.1. Historical package qualification remains attached to those artifacts; it does not qualify this shared-file composition. Retain the original Git revision with any historical execution record rather than interpreting these current commands as its transcript.
