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
5. [Clean up](#cleanup).

Use one workstation Bash session and run the blocks once, in order.

## Prerequisites and cost

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

Check the cost of three servers and three IPv4 addresses, including taxes and traffic, against your approved budget. Use only your dedicated project; add no volumes, load balancers, snapshots or paid backups. Plan when to delete the lab. Teardown is manual, and powered-off servers still cost money.

## Create a working directory

Use an absolute path outside your source repositories. If a previous lab exists there, [clean up](#cleanup) before running setup. Everything created here is temporary.

Set `SSH_KEY_NAME` to a name from `hcloud ssh-key list`. If your loaded public key is not registered yet, register it using the [K3s guide](https://github.com/bartlapp/base-k3s/blob/main/README.md) first.

```bash
export WORK_DIR="$HOME/bartl-lab"
export K3S_SOURCE="$HOME/repos/bartlapp/base-k3s"
DNS_ZONE=''             # Your delegated deSEC zone
SSH_KEY_NAME=''         # Registered Hetzner key name
```

Create and enter the directory:

```bash
export INSTALLATION="bartl-$(date -u +%Y%m%d%H%M%S)-$(openssl rand -hex 3)"
export DNS_SUFFIX="$INSTALLATION.$DNS_ZONE"
(
set -u
: "${WORK_DIR:?}" "${DNS_ZONE:?}" "${SSH_KEY_NAME:?}"
case "$WORK_DIR" in /*) ;; *) printf 'Absolute path required\n' >&2; exit 1;; esac
umask 077
test ! -e "$WORK_DIR" &&
  mkdir -m 700 "$WORK_DIR" &&
  cd "$WORK_DIR" &&
  mkdir values evidence .lab
) && cd "$WORK_DIR"
```

If setup fails, [clean up](#cleanup) before trying again.

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
git clone --no-hardlinks "$K3S_SOURCE" "$WORK_DIR/.lab/a"
git clone --no-hardlinks "$K3S_SOURCE" "$WORK_DIR/.lab/b"
git clone --no-hardlinks "$K3S_SOURCE" "$WORK_DIR/.lab/c"
```

Repeat for `SLOT=a`, `SLOT=b` and `SLOT=c`:

```bash
SLOT=a
cd "$WORK_DIR/.lab/$SLOT"
source "$WORK_DIR/installation.env"
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
cd "$WORK_DIR"
export KA="$WORK_DIR/.lab/a/.lab/kubeconfig"
export KB="$WORK_DIR/.lab/b/.lab/kubeconfig"
export KC="$WORK_DIR/.lab/c/.lab/kubeconfig"
for config in "$KA" "$KB" "$KC"; do
  kubectl --kubeconfig "$config" config current-context
  kubectl --kubeconfig "$config" get namespace kube-system \
    -o jsonpath='{.metadata.uid}{"\n"}'
done
kubectl --kubeconfig "$KC" get namespaces,pvc --all-namespaces
```

The three `kube-system` UIDs must differ. C must have no application namespaces or PVCs. Always select the target cluster explicitly by kubeconfig.

## Prepare workstation commands

After the base setup, create the shared variables and helpers used by the following chapters:

```bash
cat > .lab/workstation.env <<'ENV'
: "${WORK_DIR:?Absolute path of your working directory required}"
: "${HCLOUD_TOKEN:?Load your own project token from protected custody}"
: "${DESEC_TOKEN:?Load your own deSEC zone token from protected custody}"
export HCLOUD_TOKEN DESEC_TOKEN
cd "$WORK_DIR"
source installation.env
export KA="$WORK_DIR/.lab/a/.lab/kubeconfig"
export KB="$WORK_DIR/.lab/b/.lab/kubeconfig"
export KC="$WORK_DIR/.lab/c/.lab/kubeconfig"
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

If your public IPv4 address changes, run "Update administrator access" in each base checkout and update application allowlists. After an SSH `exit`, continue on the workstation.

## Keep recovery inputs accessible

Secrets are generated on A and remain there until teardown. Do not copy them into configuration or evidence files.

Continue with [Install the applications](applications.md).

## Cleanup

Remove only resources created by this run. Keep `$WORK_DIR` until cloud cleanup is complete; it contains the access files and resource identities needed for deletion. If nothing was provisioned, go straight to [local deletion](#delete-the-local-directory).

For an earlier attempt, use its `installation.env` and `.lab/` records to identify its resources, not a newly generated installation name.

On the workstation, delete the lab's DNS A records. For a partial run, edit this list to include only names created, or use `DNS_HOSTS=()` if none. Before each deletion, confirm that the displayed record belongs to this installation. Do not delete the zone or other records.

```bash
DNS_HOSTS=("$BACKUP_HOST" "$KC_HOST" "$FORGEJO_HOST")
```

```bash
for host in "${DNS_HOSTS[@]}"; do
  subname=${host%.$DNS_ZONE}
  desec "$DNS_API/rrsets/$subname/A/" | jq .
  desec --request DELETE "$DNS_API/rrsets/$subname/A/"
  sleep 2
done
```

Follow the [K3s teardown procedure](https://github.com/bartlapp/base-k3s/blob/main/README.md#delete-the-entire-lab) for each cluster created, in order: B, C, A. Skip clusters never provisioned. Match each server, Primary IP and firewall to its creation record. Deleting A also discards the synthetic data, backups and credentials.

```bash
cd "$WORK_DIR/.lab/b"
# K3s: Delete the entire lab, including identity checks and confirmation.
cd "$WORK_DIR/.lab/c"
# Follow the same documented teardown procedure for C.
cd "$WORK_DIR/.lab/a"
# Follow the same documented teardown procedure for A.
```

Perform the linked teardown in each directory; the block above is not a deletion routine. Then confirm that this installation's resources are absent. Other project resources may remain.

```bash
hcloud server list
hcloud primary-ip list
hcloud firewall list
hcloud volume list
hcloud load-balancer list
unset KUBECONFIG
```

### Delete the local directory

After confirming that the lab's DNS records and cloud resources are gone, delete the entire working directory, including configuration, evidence and cluster access files:

```bash
cd "${WORK_DIR:?}" && cd .. && rm -rf -- "$WORK_DIR" &&
  unset WORK_DIR KA KB KC HCLOUD_TOKEN DESEC_TOKEN
```
