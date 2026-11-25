# Recover a Bartl installation on a separate cluster

Run one customer installation across three independent single-node K3s clusters: A (`cluster-1`) holds Restic and the synthetic test client; B (`cluster-2`) runs Keycloak, Forgejo and Paperless; C (`cluster-3`) starts empty and replaces B. A remains available. A/B/C are shorthand for these fixed IDs throughout the walkthrough. This exercises planned source retirement and recovery, not loss of the backup provider or source-independent fencing.

Follow [application installation](applications.md), [Forgejo integration](forgejo.md), [service acceptance](verification.md), [lifecycle and recovery](recovery.md), then [cleanup](#cleanup). Use separate direnv-hooked Bash terminals for the packages and infrastructure, with tracing off. Package READMEs own application preparation and lifecycle commands; this walkthrough supplies composition, retained targets and acceptance order. No company tooling or password store is required when the operator supplies protected credentials.

## Prerequisites and cost

Use the [operator workstation](../operator-workstation.md), compatible kubectl, Helm 4, Mike Farah yq v4, jq, OpenSSL, curl and shasum. Native Restic 0.19.1 is installed on A by [client preparation](applications.md#prepare-the-verification-client-on-a), not on the workstation. You need an authorized dedicated Hetzner project, a registered SSH identity, a delegated deSEC zone and usable credentials for both providers. Select and approve three Debian 13 amd64 servers in `hel1` or the retained locations. The qualified synthetic profile uses CPX32 on A and CPX42 on B/C; check the selected charts' requests/limits, all claims, export/restore staging and node headroom before changing those sizes or the workload. Include IPv4 and traffic; powered-off servers still cost money. No additional volumes, load balancers, snapshots or paid backups are required by this node-local exercise.

Run the workstation's [common check](../operator-workstation.md#check-the-workstation) and [Hetzner check](../operator-workstation.md#hetzner-operations). This exercise accepts supplied credentials; the encrypted-store and GitHub-administration checks apply only if you use those arrangements.

The administrator and A must have distinct, verified public source addresses. A first acts as the denied Paperless client, then becomes an allowed acceptance client; no fourth host or additional client location is required. During the denial test A reaches C through the existing firewall rule but must receive HTTP 403 from the application allowlist. Confirm released artifacts, protected input custody, capacity and the agreed spending/lifetime/teardown scope before provisioning; no local source candidate substitutes for a selected public release.

After initializing the working directory below, prepare the [test CA bundle](#prepare-test-client-trust) before provisioning. Paperless 0.2.1 and Forgejo 0.2.3 pin the rebuilt images implementing the linked native trust handoffs; Paperless 0.2.0 and Forgejo 0.2.2 do not. Changing the issuer URL alone does not satisfy this prerequisite.

```bash
set -euo pipefail
set +x
set +o history
umask 077
eval "$(direnv hook bash)"
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
printf 'header = "Authorization: Bearer %s"\n' "$HCLOUD_TOKEN" |
  curl --config - --fail-with-body --silent --show-error https://api.hetzner.cloud/v1/pricing |
  jq '.pricing | {currency,vat_rate,server_types,primary_ips}'
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

## Test TLS profile

Runs under `acme.fke.systems` and its subdomains use [Let's Encrypt staging](https://letsencrypt.org/docs/staging-environment/). Use managed issuance and renewal, not copied certificates from a previous run. This is an installation-level test choice; package production defaults remain unchanged.

After each package's new-deployment configuration block and directory activation, but before declaration rendering or installation, select the test issuer:

```bash
case "$(yq -er '(.services[strenv(INSTANCE)].hostname // .dns.root) | downcase' "$VALUES")" in
  acme.fke.systems|*.acme.fke.systems)
    yq -i '.services[strenv(INSTANCE)].tls.acmeServer =
      "https://acme-staging-v02.api.letsencrypt.org/directory"' "$VALUES"
    ;;
esac
```

Run this handoff for Restic, Keycloak, Paperless and Forgejo. Creation initializes the service entry, so setting it earlier would be overwritten. Replacement retains the service's selected issuer. Other domains retain their selected CA configuration; this block does not change them.

Staging certificates are not publicly trusted. Keep certificate and hostname verification enabled and supply staging roots only to isolated test clients, never ordinary workstation/browser trust. Client trust must cover the operator's curl calls, A's curl/Git/Restic calls, the browser and server-side OIDC clients.

| Client path | Existing interface and prerequisite |
| --- | --- |
| Backup operations | Repository credential directories support `ca.crt`; native Restic supports `--cacert`. Supply the test CA bundle through that existing handoff. |
| Operator and A | curl supports `CURL_CA_BUNDLE`/`--cacert`, Git supports `GIT_SSL_CAINFO`, and Restic supports `--cacert`. Keep this configuration scoped to the isolated test environment. |
| Browser | Use an isolated browser trust store with staging roots, not certificate-error bypasses. A new profile is insufficient if it still shares ordinary OS trust. |
| Paperless and Forgejo OIDC | Supply the complete test CA bundle through [Paperless's native client trust](https://github.com/bartlapp/bartl-paperless/blob/main/README.md#custom-client-ca-trust) and [Forgejo's native client trust](https://github.com/bartlapp/bartl-forgejo/blob/main/README.md#custom-client-ca-trust) before creating their configuration Secrets. These handoffs require the new controller/worker builds, not merely a newer chart. Qualify those exact artifacts before provisioning this released-package exercise. |

### Prepare test client trust

Use a dedicated test shell. After the initial working-directory block and before creating the bases, obtain the [Mozilla public roots distributed by curl](https://curl.se/docs/caextract.html) and the four roots linked by [LE's staging documentation](https://letsencrypt.org/docs/staging-environment/#root-cas). Fetch with ordinary verified HTTPS before selecting test trust:

```bash
TRUST_DIR="$WORK_DIR/test-trust"
mkdir "$TRUST_DIR"
curl --fail --silent --show-error https://curl.se/ca/cacert.pem -o "$TRUST_DIR/public.pem"
curl --fail --silent --show-error https://letsencrypt.org/certs/staging/letsencrypt-stg-root-x1.pem -o "$TRUST_DIR/x1.pem"
curl --fail --silent --show-error https://letsencrypt.org/certs/staging/letsencrypt-stg-root-x2.pem -o "$TRUST_DIR/x2.pem"
curl --fail --silent --show-error https://letsencrypt.org/certs/staging/gen-y/root-ye.pem -o "$TRUST_DIR/ye.pem"
curl --fail --silent --show-error https://letsencrypt.org/certs/staging/gen-y/root-yr.pem -o "$TRUST_DIR/yr.pem"
for root in x1 x2 ye yr; do
  openssl x509 -in "$TRUST_DIR/$root.pem" -noout -subject -dates
done
cat "$TRUST_DIR/public.pem" "$TRUST_DIR/x1.pem" "$TRUST_DIR/x2.pem" \
  "$TRUST_DIR/ye.pem" "$TRUST_DIR/yr.pem" > "$TRUST_DIR/ca-bundle.pem"
```

On resumption reuse this run's bundle. Select it in each dedicated workstation test terminal; public roots remain included for provider APIs and artifact downloads:

```bash
export TEST_CA_BUNDLE="$WORK_DIR/test-trust/ca-bundle.pem"
export CURL_CA_BUNDLE="$TEST_CA_BUNDLE" GIT_SSL_CAINFO="$TEST_CA_BUNDLE"
curl --fail --silent --show-error https://valid.x1.staging-test-certs.letsencrypt.org/ --output /dev/null
```

Before **Prepare application credentials and configuration** for Paperless or **Prepare native identity and configuration** for Forgejo, place the same bundle at the package's retained input path:

```bash
mkdir -p "$INSTALL_DIR/protected/client-ca"
cp "$WORK_DIR/test-trust/ca-bundle.pem" "$INSTALL_DIR/protected/client-ca/ca-bundle.pem"
```

Complete each package's native trust handoff, including Forgejo's `SSL_CERT_FILE` marker, before creating the configuration Secret. Replacements retain these inputs through the package recovery procedure. This does not configure backup trust: supply the bundle as each repository reader/writer's `ca.crt` through the existing backup handoff. Copy it to A's isolated client directory and select `CURL_CA_BUNDLE` and `GIT_SSL_CAINFO` there as well; use the same file with native Restic's `--cacert`.

Use a dedicated Firefox profile for browser acceptance, with [automatic OS-root import disabled](https://support.mozilla.org/en-US/kb/how-disable-enterprise-roots-preference). On macOS:

```bash
mkdir "$WORK_DIR/test-trust/firefox-profile"
printf '%s\n' 'user_pref("security.enterprise_roots.enabled", false);' \
  > "$WORK_DIR/test-trust/firefox-profile/user.js"
"/Applications/Firefox.app/Contents/MacOS/firefox" --new-instance \
  --profile "$WORK_DIR/test-trust/firefox-profile" about:preferences#privacy
```

On Linux use the installed `firefox` binary with the same arguments. In this profile's **Privacy & Security → Certificates → View Certificates → Authorities → Import**, import `x1.pem`, `x2.pem`, `ye.pem` and `yr.pem` from this run's `test-trust` directory, granting website identification trust. Open `https://valid.x1.staging-test-certs.letsencrypt.org/` and require normal verified access without a warning exception. Reuse only this profile for the exercise; do not import into the ordinary browser or OS trust store. On resumption reopen the existing profile rather than recreating it. Close the test browser and dedicated shells after the exercise.

Chrome 134 or newer is an alternative when its [Certificate Manager](https://chromium.googlesource.com/chromium/src.git/+/refs/heads/main/net/data/ssl/chrome_root_store/faq.md#whats-the-chrome-certificate-manager) offers profile-local **Installed by you** certificates. Use an isolated test/automation profile with no unrelated users or sessions; verify its actual **Profile Path** at `chrome://version`. In `chrome://certificate-manager`, disable **Use imported local certificates from your operating system**. Open **Installed by you → Import to Trusted certificates** and import the same four staging roots. Do not use **Manage imported certificates from MacOS**, which changes operating-system trust. Keep automation's HTTPS-error bypass disabled and require the staging test page to render normally. At cleanup remove the four imported roots and dispose of the test profile; never modify the ordinary browser profile.

For headless Linux Chrome where the native import dialog is unavailable, use Chromium's [documented NSS command-line procedure](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/linux/cert_management.md) in a dedicated disposable OS account, never the operator's ordinary home. Install `chromium` and `libnss3-tools` through the host package manager. Copy the four roots into that account's `test-trust/` directory. In its shell, for a fresh NSS database:

```bash
umask 077
mkdir -p "$HOME/.local/share/pki/nssdb"
certutil -N --empty-password -d "sql:$HOME/.local/share/pki/nssdb"
for root in x1 x2 ye yr; do
  certutil -A -d "sql:$HOME/.local/share/pki/nssdb" -t "C,," \
    -n "ACME staging $root" -i "$HOME/test-trust/$root.pem"
done
certutil -L -d "sql:$HOME/.local/share/pki/nssdb"
chromium --headless --user-data-dir="$HOME/chrome-profile" \
  --remote-debugging-address=127.0.0.1 --remote-debugging-port=9222 \
  --proxy-server=socks5://127.0.0.1:1080 \
  --no-first-run --disable-sync about:blank
```

Keep Chrome's sandbox enabled. This path uses only the dedicated account's NSS trust; leave imported-local-certificate use enabled in that isolated Linux profile. Keep automation's HTTPS-error bypass disabled.

A browser on an application host can reach its own ingress through cluster masquerading: its public egress address is then not the address the ingress sees. Do not admit the cluster bridge or widen the review CIDR to accommodate this. Route the isolated browser through the operator workstation, retaining the administrator's public address as the review source. Restrict the reverse SOCKS forward to the selected public service endpoints; an unrestricted reverse proxy would expose other workstation-reachable destinations.

In a dedicated workstation terminal, use the retained installation's environment and the endpoint variables from [Prepare workstation commands](#prepare-workstation-commands). Select C for this walkthrough so the browser survives B's retirement. For standalone package qualification, select the already approved qualification cluster instead. Start this forward after the relevant service connections exist; when another endpoint becomes available, reread the endpoint variables and restart the forward with the updated list:

```bash
export BROWSER_CLUSTER=cluster-3
BROWSER_DESTINATIONS="api.ipify.org:443 valid.x1.staging-test-certs.letsencrypt.org:443 wrong.host.badssl.com:443"
for hostname in "${KC_HOST:-}" "${FORGEJO_HOST:-}" "${PAPERLESS_HOST:-}"; do
  if [ -n "$hostname" ]; then
    BROWSER_DESTINATIONS="$BROWSER_DESTINATIONS $hostname:443"
  fi
done
ssh -F "$WORK_DIR/clusters/$BROWSER_CLUSTER/base/ssh.config" \
  -N -L 127.0.0.1:29222:127.0.0.1:9222 -R 127.0.0.1:1080 \
  -o ExitOnForwardFailure=yes -o "PermitRemoteOpen=$BROWSER_DESTINATIONS" \
  "$BROWSER_CLUSTER-node1"
```

Connect existing browser automation to `http://127.0.0.1:29222`; neither the debugging endpoint nor the SOCKS listener is public. In the browser, require `https://api.ipify.org` to show the workstation's `ADMIN_IP`, normal rendering of the staging test page, and rejection of `https://wrong.host.badssl.com/` for its hostname mismatch. Then repeat the package's allowed, independent denied, and forged-forwarding-header admission probes. The failed direct same-host probe is not successful acceptance. Keep the forward running while using this browser. Close it and remove the disposable account/profile at teardown.


## Package handoffs

Create deployments only through their package's new-installation procedure: Restic on A, Keycloak and Paperless on B, then Forgejo on B. Do not pre-create service, package or replacement records: the package creation blocks initialize those entries.

| Package | Deployment / instance / package key | Cluster | Namespace | Helm release |
| --- | --- | --- | --- | --- |
| Restic | `restic` | `cluster-1` | `backup` | `backup` |
| Keycloak | `keycloak` | `cluster-2` | `keycloak` | `keycloak` |
| Forgejo | `forgejo` | `cluster-2` | `forgejo` | `forgejo` |
| Paperless | `paperless` | `cluster-2` | `paperless` | `paperless` |

The current procedures use directory selectors and normalized disposable chart caches. Fresh installation and replacement resolve a stable public package; resumption reacquires its recorded version. Native application versions remain separate choices. Pass the selected `deployment` to the package chart; chart-owned selection applies operation-intent precedence to both declarations and runtime manifests.

This path requires Keycloak 0.8.0 and the selected-deployment interface in Restic 0.3.1, Paperless 0.2.1 and Forgejo 0.2.3. The latter three passed exact-candidate qualification and were published unchanged on 2026-11-25. Fresh anonymous chart downloads matched the qualified archives, and published image manifests matched the retained digests. Obtain these released packages through their documented download procedures; candidate checks do not replace this four-service walkthrough.

See [Qualification](#qualification) for the exercised immutable artifacts, outcomes and limits.

Use empty application targets. This composition is not a qualified upgrade from the historical walkthrough. Choose `keycloak-replacement`, `forgejo-replacement` and `paperless-replacement` only at their package replacement steps. A package or handoff mismatch stops the affected path: correct its owner, then exercise the corrected procedure rather than improvising past it.

The synthetic five-minute capture schedules make actual scheduled runs observable during the exercise; they are not production defaults. Suspend them at the package's documented interruption boundaries, retain their original values and restore them only after acceptance. Keep capacity and the approved lifetime sufficient for the selected runs.

## Prepare workstation commands

Retain the walkthrough's workstation helper under `operations/` as a derived local working file. On resume source it after selecting `WORK_DIR` and `VALUES`. It reads cross-service endpoints and test inputs only; it neither selects a package nor renders Helm inputs. Resume the intended deployment before each package operation. Test fixtures and receipts under `evidence/` are temporary comparison inputs for this exercise, not a customer qualification diary; reusable results belong in the release/integration record.

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
export PAPERLESS_CONNECTIONS="$WORK_DIR/clusters/cluster-2/applications/paperless/paperless-connections.yaml"
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
if [ -s "$PAPERLESS_CONNECTIONS" ]; then
  PAPERLESS_HOST=$(yq -er '.services.paperless.endpoints.https.hostname' "$PAPERLESS_CONNECTIONS")
  export PAPERLESS_HOST
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

For each additional workstation terminal, start Bash with its direnv hook, enter the **same retained installation root**, and wait for the next prompt. The default example is:

```bash
eval "$(direnv hook bash)"
cd "${WORK_DIR_ROOT:-$HOME/bartl}/acme/acme-installation"
```

Then source `"$WORK_DIR/operations/workstation.env"` before entering the package's named deployment directory. Use the actual selected root when it differs. A new terminal does not inherit another terminal's exports: supply provider/DNS credentials from the same authorized source for terminals executing those operations. Do not carry generic package variables across terminals or recreate the installation.

Protected inputs remain independently usable outside B/C and their Keycloak. Synthetic payloads live on A under `/root/bartl-reference/{forgejo,paperless}`. Configuration is only `VALUES`; derived remote `installation.env` exports test-client endpoints and identity but is never authoritative installation configuration.

## Cleanup

After authorized data disposition, remove reachable Paperless and Forgejo targets through their package finalization/uninstall steps, not the subsequent reinstall blocks. Remove Paperless's operator-owned review Ingress/Middleware if still present. Remove Keycloak next and Restic last. Keep backup access and DNS usable until required publication and package finalization finish. Preserve independently required history and keys; do not restart retired B for cosmetic uninstall.

If a failed target reports `Stopped` but not `Quiescent`, its normal uninstall precondition has not passed. Do not erase the failure to satisfy it. For explicitly authorized disposal of this entire synthetic lab, retain diagnostics, enforce host retirement and destroy only the inspected, independently owned VM and its local data through Base. This is destructive failed-target disposal, not successful application uninstall or recovery.

Retain `VALUES` and access files until all cloud deletions finish. Remove only this run's retained DNS records after reading live identity/address and checking against `operations.dns`; never delete the zone or unrelated names. For each recorded A record:

```bash
for host in "$BACKUP_HOST" "$KC_HOST" "$FORGEJO_HOST" "$PAPERLESS_HOST"; do
  subname=${host%.$DNS_ZONE}
  desec "$DNS_API/rrsets/$subname/A/" | jq .
  # Compare the result with operations.dns and the currently active cluster first.
  desec --request DELETE "$DNS_API/rrsets/$subname/A/"
  for resolver in ns1.desec.io ns2.desec.org; do
    dig @"$resolver" "$host" A +norecurse +noall +comments +answer
  done
done
```

Require authoritative replies with no A answer for every deleted name; a timeout/SERVFAIL is not proof of deletion.

After an interrupted DNS loop, inspect the live RRset collection and continue only with remaining owned records; do not replay deletions of already absent names. Respect a rate-limit response's delay before the next request. API acceptance can precede authoritative convergence, so wait for both authoritative servers before releasing the addresses.

Then select each cluster's separate Hetzner machine context for `cluster-2`, `cluster-3`, and finally `cluster-1`, and follow Base's [Remove the selected cluster](https://github.com/bartlapp/base-k3s/blob/main/README.md#remove-the-selected-cluster). Inspect remaining consumers and compare live resources with retained observations before authorizing deletion. Base removes cluster/VM and retired deployment records only after resource absence is verified. For interrupted provisioning/deletion, reconcile the provider inventory and remove only remaining owned resources instead of replaying the normal recipe. Deleting A destroys the synthetic backup history. Confirm no run-owned provider allocations remain. Local deletion is a separate authorized retention decision.

## Qualification

### Current staging profile

Standalone candidate qualification and unchanged publication are complete for [Restic 0.3.1](https://github.com/bartlapp/bartl-restic/releases/tag/v0.3.1), [Paperless 0.2.1](https://github.com/bartlapp/bartl-paperless/releases/tag/v0.2.1) and [Forgejo 0.2.3](https://github.com/bartlapp/bartl-forgejo/releases/tag/v0.2.3). Their release records retain exact build sources, chart/image identities, exercised cases and limits. Paperless and Forgejo passed fresh native-client-CA OIDC/TOTP against published Keycloak 0.8.0. These checks used one host with independent application storage; the current three-host released-package staging walkthrough and final resource disposal remain outstanding.

### Prior production-CA run

The production-CA procedure at [revision 893817b](https://github.com/bartlapp/bartl-app/tree/893817bc0be5629a81a53d0986b7ae787c2b574d/docs/reference-installation) passed on 2026-11-24 using three independent Debian 13 amd64/K3s `v1.36.5+k3s1` hosts, cert-manager `v1.21.3` and Helm `v4.3.2`. That run did not use LE staging and does not qualify the current staging profile. The operated chart caches matched fresh anonymous downloads of these OCI artifacts under `ghcr.io/bartlapp/bartl-<package>`:

| Package | Chart | Native path | OCI chart manifest SHA-256 |
| --- | --- | --- | --- |
| Restic | 0.3.0 | Restic 0.19.1; retained endpoint on A | `958ac989470226eaabdec179ec07b568a1145e2cb841cf1aec454bb25488b925` |
| Keycloak | 0.8.0 | Keycloak 26.6.2 reconstruction | `8e345cc00442470da72e2369e27cdd777a4d1a52a6a71bc9f607ed6d211357d8` |
| Paperless | 0.2.0 | 3.3.0 → 3.3.1 replacement | `3622dd641e4e43f8fc3035f46a0eeb1cfe58094c1765f79a6661b81124624122` |
| Forgejo | 0.2.2 | 16.0.7 → 17.0.1 replacement | `6e65e13f9d1e55c2c03f5e553ae535d9b186991b9c23774b55b6e85daf88a9a4` |

Source installation, native/OIDC/MFA access, useful data and permissions, manual capture, backup-independent restart and persistent stop/start passed. Restic retained its claim and repository identities through supported uninstall/reinstall, restored each saved application point and accepted new writer/reader round trips through its public HTTPS endpoint. All native Restic checks ran on A.

With B retired and powered off, C reconstructed the exact final application points on independent claims. Restricted acceptance preserved identities, SSH host keys, Git/LFS/issue/PR/attachment/package/release content, document bytes and grants. New application work survived subsequent backup readback; Forgejo also passed retained-state reinstall, fresh OIDC access and new Git work in another verified point. Ordinary activation and successful scheduled captures passed for all three consumers. Application finalization, VM/firewall/IP disposal and authoritative absence of all run-owned DNS records were verified; the shared zone and operator identity were retained.

That run included corrective repeats of the TLS, DNS and access handoffs recorded in that revision, not an uninterrupted production-RTO measurement. It establishes planned B→C retirement with A available, not backup-provider loss or source-independent fencing. Authentication and authorization changes after the selected backup remain outside the recovery point. Raw output and protected inputs remain in private custody; this is the selected integration record, not renewed standalone qualification for every package.

## Historical version evidence

The preceding Restic 0.3.0 / Keycloak 0.7.0 / Paperless 0.2.0 / Forgejo 0.2.2 run established source operation only. Its exact-point Keycloak reconstruction failed closed at the mandatory session-reset step; restricted target acceptance, consumer reconstruction and activation were not reached. That limit remains attached to 0.7.0. The later run used fresh targets, not cleared failure markers.

The preceding walkthrough used Restic 0.2.0 (`sha256:aeaa22dd009fd505c86049de285c81e0a44ab68640f528dc297d6d67efd306de`) then 0.2.1 (`sha256:78d118df791192bcc8dc08ce7ce13ded3ac01b51c33cd19090c30cb7c2d8f20a`), Keycloak 0.5.0 (`sha256:e5ec4b622b6b1aec736ae9aecec298c706d12aeed78215c154ddeacbb59257c4`) then 0.5.1 (`sha256:05e664e8c561685ba605a5a02ccc6649aafbb7c3bf3a0c808abc91cffae53aa0`), and Forgejo 0.1.0 (`sha256:c9d6e7189d29b7b2923a61c5036e38197005912fdd68c6acec6a78654e297f3c`). References were OCI charts under `ghcr.io/bartlapp/bartl-<package>`. Native Keycloak stayed at 26.6.2; Forgejo moved from 16.0.7 to 17.0.1. Historical package qualification remains attached to those artifacts; it does not qualify this shared-file composition. Retain the original Git revision with any historical execution record rather than interpreting these current commands as its transcript.
