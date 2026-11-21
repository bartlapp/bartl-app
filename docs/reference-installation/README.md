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
export CUSTOMER=${CUSTOMER:-acme}
: "${HETZNER_PROJECT:?Supply the authorized Hetzner project designation}"
export HETZNER_PROJECT
export INSTALLATION_ID=${INSTALLATION_ID:-$CUSTOMER}
export WORK_DIR=${WORK_DIR:-"$HOME/bartl/$INSTALLATION_ID"}
case "$WORK_DIR" in /*) ;; *) printf 'Absolute WORK_DIR required\n' >&2; exit 1;; esac
export VALUES=${VALUES:-"$WORK_DIR/installation.yaml"}
case "$VALUES" in /*) ;; *) printf 'Absolute VALUES required\n' >&2; exit 1;; esac
mkdir -p "$WORK_DIR/packages" "$WORK_DIR/operations" "$WORK_DIR/evidence"
if test ! -e "$VALUES"; then
  DNS_ROOT="${DNS_ROOT:-acme.fke.systems}" yq -n '
    .schemaVersion = 1 | .customer = strenv(CUSTOMER) |
    .installation = strenv(INSTALLATION_ID) | .dns.root = strenv(DNS_ROOT)
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

Follow the [base-k3s recipe](https://github.com/bartlapp/base-k3s/blob/main/README.md) three times in fresh shells, starting with the read block in **B. Use an existing installation** and continuing through handover. Supply the same absolute `VALUES` path and authorized `HETZNER_PROJECT`; the record already exists. In Base's **Define the new cluster** block, choose `CLUSTER=cluster-1` and `VM=vm-1`, then `cluster-2` and `vm-2`, then `cluster-3` and `vm-3`. These are explicit assignments in that block, not environment overrides. The recipe initializes the provider binding, desired VM configuration, cluster node reference and derived kubeconfig context. Do not precreate partial cluster entries or run **A. Create a new installation** again. Existing clusters use the read-only resumption path.

Each server must be independent, not joined to another cluster. Base records machine identities and IP allocations under the referenced `vms` entry, and API access and typed firewall observations under the cluster. Do not repeat uncertain creation: reconcile the retained intent and live provider inventory first.

Base access is under `$WORK_DIR/clusters/<id>/base/{kubeconfig,ssh.config,known_hosts}`. Derive addresses from the retained observations. After the three passes:

```bash
for CLUSTER in cluster-1 cluster-2 cluster-3; do
  config="$WORK_DIR/clusters/$CLUSTER/base/kubeconfig"
  kubectl --kubeconfig "$config" get nodes,storageclass
  kubectl --kubeconfig "$config" get namespace kube-system -o jsonpath='{.metadata.uid}{"\n"}'
done
kubectl --kubeconfig "$WORK_DIR/clusters/cluster-3/base/kubeconfig" get namespaces,pvc --all-namespaces
```

Require three distinct `kube-system` UIDs, one Ready node per cluster, usable CoreDNS/local-path/Traefik/cert-manager, enforced NetworkPolicy and empty application state on C. Restrict SSH/API to the administrator; allow required HTTPS and Git SSH paths deliberately.

## Retain packages and deployment mappings

These current shared-interface packages replace the historical flat-interface versions. The change of operating interface is not a qualified upgrade path from the old walkthrough. Use empty application targets for this exercise; existing production installations need their package's supported migration procedure.

```bash
yq -i '
  .packages.restic = ({"version":"0.3.0","chart":"oci://ghcr.io/bartlapp/bartl-restic","chartSha256":"57feb5b39b325e3972fe9a9c870cd6c0c5fe54f2f91faba8b4b1652fb4918253"} * (.packages.restic // {})) |
  .packages.keycloak = ({"version":"0.6.1","chart":"oci://ghcr.io/bartlapp/bartl-keycloak","chartSha256":"7abb55bcefbcde70dc8f29309d508d314a48783547067b529d48617d23c9225a"} * (.packages.keycloak // {})) |
  .packages.forgejo = ({"version":"0.2.2","chart":"oci://ghcr.io/bartlapp/bartl-forgejo","chartSha256":"16405a6d485138d16ebe4afca0c7a3d9a68705194a39ed430311ea16d9bf0664"} * (.packages.forgejo // {})) |
  .deployments.restic = ({"instance":"restic","cluster":"cluster-1","namespace":"backup","release":"backup","package":"restic"} * (.deployments.restic // {})) |
  .deployments.keycloak = ({"instance":"keycloak","cluster":"cluster-2","namespace":"keycloak","release":"keycloak","package":"keycloak"} * (.deployments.keycloak // {})) |
  .deployments.forgejo = ({"instance":"forgejo","cluster":"cluster-2","namespace":"forgejo","release":"forgejo","package":"forgejo"} * (.deployments.forgejo // {})) |
  .deployments."keycloak-replacement" = ({"instance":"keycloak","cluster":"cluster-3","namespace":"keycloak","release":"keycloak","package":"keycloak"} * (.deployments."keycloak-replacement" // {})) |
  .deployments."forgejo-replacement" = ({"instance":"forgejo","cluster":"cluster-3","namespace":"forgejo","release":"forgejo","package":"forgejo"} * (.deployments."forgejo-replacement" // {})) |
  .services[.deployments.restic.instance] = (.services[.deployments.restic.instance] // {}) |
  .services[.deployments.keycloak.instance] = (.services[.deployments.keycloak.instance] // {}) |
  .services[.deployments.forgejo.instance] = (.services[.deployments.forgejo.instance] // {})
' "$VALUES"
```

Retain archives under `$WORK_DIR/packages`, acquire and checksum them through each package's README. Preserve any different retained package choice; do not silently substitute the defaults above. Several deployments refer to one stable instance, not separate customer configurations.

## Prepare workstation commands

Retain the walkthrough's workstation helper under `operations/` alongside its operating records. On resume source it after selecting `WORK_DIR` and `VALUES`. Package setup blocks may define similarly named shell variables: reselect the target before every cross-cluster command. Endpoint exports become available after the next chapter renders the selected charts' connection declarations.

```bash
cat > "$WORK_DIR/operations/workstation.env" <<'ENV'
: "${WORK_DIR:?}" "${VALUES:?}"
cd "$WORK_DIR"
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
for DEPLOYMENT in restic keycloak forgejo; do
  INSTANCE=$(DEPLOYMENT="$DEPLOYMENT" yq -er '.deployments[strenv(DEPLOYMENT)].instance' "$VALUES")
  CLUSTER=$(DEPLOYMENT="$DEPLOYMENT" yq -er '.deployments[strenv(DEPLOYMENT)].cluster' "$VALUES")
  DIRECTORY="$WORK_DIR/clusters/$CLUSTER/applications/$INSTANCE"
  if [ "$DEPLOYMENT" != "$INSTANCE" ]; then DIRECTORY="$DIRECTORY/deployments/$DEPLOYMENT"; fi
  case "$INSTANCE" in keycloak) DECLARATION="$DIRECTORY/connections.yaml" ;;
    *) DECLARATION="$DIRECTORY/$INSTANCE-connections.yaml" ;; esac
  if [ -s "$DECLARATION" ]; then
    HOST=$(INSTANCE="$INSTANCE" yq -er '.services[strenv(INSTANCE)].endpoints.https.hostname' "$DECLARATION")
    case "$INSTANCE" in restic) BACKUP_HOST="$HOST" ;; keycloak) KC_HOST="$HOST" ;; forgejo) FORGEJO_HOST="$HOST" ;; esac
  fi
done
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

Then select `CLUSTER=cluster-2`, `cluster-3`, `cluster-1` in order and execute the base recipe's teardown using the same `VALUES`, including any firewall-only interrupted run. Complete package removal on reachable targets; B's confirmed source retirement must not be undone merely to uninstall it. After confirming data disposition, retain the historical configuration/evidence and remove the retired deployment mappings and their referencing operation/recovery entries as required by Base's remaining-consumer guard. Verify each live VM, Primary IP, firewall and attachment against retained observations before deletion; names alone are insufficient. Deleting A destroys this exercise's synthetic backup history and credentials. Confirm the provider inventory contains no remaining resources from the run. Local deletion is a separate explicit retention decision, not an automatic command in this recipe.

## Historical version evidence

The preceding walkthrough used Restic 0.2.0 (`sha256:aeaa22dd009fd505c86049de285c81e0a44ab68640f528dc297d6d67efd306de`) then 0.2.1 (`sha256:78d118df791192bcc8dc08ce7ce13ded3ac01b51c33cd19090c30cb7c2d8f20a`), Keycloak 0.5.0 (`sha256:e5ec4b622b6b1aec736ae9aecec298c706d12aeed78215c154ddeacbb59257c4`) then 0.5.1 (`sha256:05e664e8c561685ba605a5a02ccc6649aafbb7c3bf3a0c808abc91cffae53aa0`), and Forgejo 0.1.0 (`sha256:c9d6e7189d29b7b2923a61c5036e38197005912fdd68c6acec6a78654e297f3c`). References were OCI charts under `ghcr.io/bartlapp/bartl-<package>`. Native Keycloak stayed at 26.6.2; Forgejo moved from 16.0.7 to 17.0.1. Historical package qualification remains attached to those artifacts; it does not qualify this shared-file composition. Retain the original Git revision with any historical execution record rather than interpreting these current commands as its transcript.
