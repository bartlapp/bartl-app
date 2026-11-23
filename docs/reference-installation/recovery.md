# Recover on C and return the service to use

Complete [source acceptance](verification.md). A (`cluster-1`) keeps Restic and the test client; B (`cluster-2`) is the reachable source; C (`cluster-3`) supplies independent empty target storage. This is an authorized **planned interruption**, not provider-loss recovery. Keep B accessible until both packages have completed final capture and retirement, then enforce its poweroff before reconstruction. A remains available throughout replacement, apart from the separately authorized Restic lifecycle exercises below.

This chapter coordinates the [Keycloak recovery runbook](https://github.com/bartlapp/bartl-keycloak/blob/main/RECOVERY.md), [Forgejo lifecycle](https://github.com/bartlapp/bartl-forgejo/blob/main/README.md#replacement-upgrade-and-promotion) and [Restic lifecycle](https://github.com/bartlapp/bartl-restic/blob/main/README.md#stop-and-start). Those procedures own capture, stop, restore, migration, scheduling and package activation commands. Do not substitute the historical flat-interface commands or copy their Helm projections here. Keycloak uses deployment selectors and its current unpacked chart cache; Forgejo 0.2.2 and Restic 0.3.0 still use their recorded archives and manual resumption interfaces.

The current Keycloak release/interface is the documentation delivery target, pending stable publication and live qualification. Confirm that the stable artifact obtained by the runbook actually supplies this interface before interrupting B. Historical evidence is unchanged and does not qualify this coordinated sequence. Governing local sources read for this rewrite: `docs/application-contract.md` and `docs/how-to-bartlize.md` at bartl-app revision `924a952a045eb8158304aa8ecd8a0d18ea04edf9`.

## Retain the coordination inputs

In workstation Bash:

```bash
source "${WORK_DIR:?}/operations/workstation.env"
set -euo pipefail
umask 077
export VALUES="$WORK_DIR/installation.yaml"
export KC_SOURCE_DIR="$WORK_DIR/clusters/cluster-2/applications/keycloak"
export FJ_SOURCE_DIR="$WORK_DIR/clusters/cluster-2/applications/forgejo"
export RESTIC_DIR="$WORK_DIR/clusters/cluster-1/applications/restic"
export KC_TARGET_DIR="$WORK_DIR/clusters/cluster-3/applications/keycloak/deployments/keycloak-replacement"
export FJ_TARGET_DIR="$WORK_DIR/clusters/cluster-3/applications/forgejo/deployments/forgejo-replacement"
CLIENT_SSH="$WORK_DIR/clusters/cluster-1/base/ssh.config"
mkdir -p "$WORK_DIR/evidence"
```

Keep the same installation root and `VALUES` when a package example selects its root. Substitute the following choices at the named package setup steps, rather than executing an example assignment and correcting it afterwards:

| Package procedure | Source | Replacement choices |
| --- | --- | --- |
| Keycloak RECOVERY, step 1 | `SOURCE_DEPLOYMENT=keycloak`, `SOURCE_DIR=$KC_SOURCE_DIR` | `TARGET_DEPLOYMENT=keycloak-replacement`, `TARGET_PACKAGE=keycloak-replacement`, `TARGET_CLUSTER=cluster-3`, `TARGET_NAMESPACE=keycloak-green` |
| Forgejo, Prepare the replacement | `SOURCE_DEPLOYMENT=forgejo`, `SOURCE_DIR=$FJ_SOURCE_DIR` | `DEPLOYMENT=forgejo-replacement`, `TARGET_CLUSTER=cluster-3`, `TARGET_NAMESPACE=forgejo-green`, `TARGET_VERSION=17.0.1` |
| Restic, Resume an existing deployment | `DEPLOYMENT=restic`, placement on A | No replacement; retain the recorded package, claim, repository names and credentials |

Choose/check unused target keys **at the package's creation step**. Do not precreate deployment/package entries and then rerun that creation block. On resumption after successful preparation, use recorded entries and resume at the next unfinished step; namespace/Secret/claim creation is not a retry interface.

Use separate terminals and preserve each package's shell through its pauses. Keycloak needs a normal **direnv-hooked Bash** session: enter the source/target directory and wait for the next prompt at the package's directory boundaries. Forgejo and Restic need **no-hook child Bash** sessions: select the appropriate cluster in the parent, wait for its prompt, then run `bash --noprofile --norc` and source `"$WORK_DIR/operations/workstation.env"` inside the child. Run their documented manual resumption there. Otherwise a Base direnv reload after writing `VALUES` can clear their manually selected package variables. Keep Forgejo's `SOURCE_*`/`BACKUP_SCHEDULE` and Keycloak's `SOURCE_*`/`TARGET_*` in their respective paused shells.

A package changes generic names such as `SOURCE_DIR`, `CHART`, `NS` and `KUBECONFIG`; never carry these from one package to another. Use a separate infrastructure shell with `workstation.env` and explicit `KA`, `KB`, `KC` paths. The fixed per-service directories above and separately named receipts remain the handoff across sessions. Preserve independent credentials and the installation record before powering B off; no later target operation may depend on B's API.

Every package condition must belong to the current resource generation. Follow its matching-generation checks, not only `kubectl wait`. Timeout is not server-side cancellation. Stop on failed/ambiguous native work and retain diagnostics; do not clear failure markers, finalizers or native locks.

## Exercise source operation before interruption

1. Resume source Keycloak through its [README](https://github.com/bartlapp/bartl-keycloak/blob/main/README.md#resume-an-existing-deployment), entering `$KC_SOURCE_DIR` and waiting for the next prompt. Run [Capture a backup](https://github.com/bartlapp/bartl-keycloak/blob/main/README.md#capture-a-backup). Preserve its native receipt before another capture overwrites it:

   ```bash
   cp "$KC_SOURCE_DIR/backup-result.json" "$WORK_DIR/evidence/keycloak-source-backup.json"
   ```

2. In the Forgejo shell, [resume](https://github.com/bartlapp/bartl-forgejo/blob/main/README.md#resume-an-existing-deployment) `forgejo`, then [capture](https://github.com/bartlapp/bartl-forgejo/blob/main/README.md#capture-and-retry-publication). Require this request's successful complete publication:

   ```bash
   cp "$FJ_SOURCE_DIR/backup-result.json" "$WORK_DIR/evidence/forgejo-source-backup.json"
   ```

Keycloak's receipt has top-level `.snapshotID`. Forgejo retains the full application object and its successful `.status.backup.snapshot` and `.status.backup.request`. Do not parse both as the same JSON format or overwrite a final receipt with a later point.

### Restart without backup access

Authorize this short backup-endpoint interruption and pause manual/scheduled application captures first. In the Restic shell, [resume](https://github.com/bartlapp/bartl-restic/blob/main/README.md#resume-an-existing-deployment) `restic` and execute only the stop half of [Stop and start](https://github.com/bartlapp/bartl-restic/blob/main/README.md#stop-and-start). Require current-generation Stopped and no serving/lifecycle/copy Pods. Keep A itself and its test client running.

In the Keycloak shell, run its [native restart](https://github.com/bartlapp/bartl-keycloak/blob/main/README.md#restart-keycloak). Restart the existing Forgejo application Deployment, not its controller or lifecycle intent:

```bash
kubectl --kubeconfig "$KB" -n forgejo rollout restart deployment/forgejo
kubectl --kubeconfig "$KB" -n forgejo rollout status deployment/forgejo --timeout=10m
```

Require retained realm/user/client identities, native Keycloak login, Forgejo native login and useful HTTP/SSH reads from A while Restic is stopped. Neither service may initialize or restore. The Forgejo README describes ordinary restart semantics but does not supply a dedicated restart command; the commands above are Kubernetes' native Deployment restart, not a recovery workflow.

In the Restic shell, complete its start half and require current-generation Ready, trusted HTTPS and authenticated access to both retained histories. Restore the approved capture schedules. This checks existing-state startup without backup access, not recovery without independent inputs.

### Stop/start and retained Restic reinstall

Exercise the package stop/start interfaces with persistent intent: stop Forgejo, then Keycloak; start Keycloak, then Forgejo. Use [Forgejo Stop and start](https://github.com/bartlapp/bartl-forgejo/blob/main/README.md#stop-and-start) and [Keycloak persistent stop/start](https://github.com/bartlapp/bartl-keycloak/blob/main/README.md#persistently-stop-and-start-keycloak), each in its own resumed context. Require current-generation Stopped/Ready, drained work and unchanged useful data/identity. Do not scale generated workloads to implement persistent stop.

Before retiring B, exercise Restic's [Supported uninstall](https://github.com/bartlapp/bartl-restic/blob/main/README.md#supported-uninstall) followed immediately by [Reinstall retained state](https://github.com/bartlapp/bartl-restic/blob/main/README.md#reinstall-retained-state). Pause conflicting captures/copies/maintenance and record the claim UID first. Keep the controller alive through CR finalization. Retain the same PVC, TLS, supplied Secrets, credentials and repository keys; do not rerun endpoint creation.

Require current-generation Ready, unchanged claim/repository identities, authenticated reader access to **both** histories and restore of each saved source point. Use native Restic with the corresponding repository's reader/key/CA, never a shared decryption key. Complete the package's writer/reader round-trip for each repository to prove new backup/readback after reinstall. Keep these synthetic points distinct from application recovery points. Resume consumers only after the endpoint is usable.

## Prepare the Keycloak target without changing the source

In the Keycloak shell execute [RECOVERY step 1](https://github.com/bartlapp/bartl-keycloak/blob/main/RECOVERY.md#1-retain-source-inputs-and-choose-the-target), using the mapping above. This retains source inputs and acquires the current target package before interruption; it prepares the selector but does not enter C or install the application. Leave B selected for final capture. Retain its recovered-realm administrator and repository credentials independently.

The runbook's single administrator CIDR is insufficient for this composition. After its allowlist selection, replace the list with the actual administrator/browser, A test client and C Forgejo outbound IPv4 sources:

```bash
source "$WORK_DIR/operations/workstation.env"
export ADMIN_IP A_IP C_IP
# This profile uses these public IPv4 egress addresses; verify them below.
yq -i '.services.keycloak.ingress.administratorSourceRanges =
  [strenv(ADMIN_IP) + "/32", strenv(A_IP) + "/32", strenv(C_IP) + "/32"]' "$VALUES"
```

Before restored startup, follow [Base source-address preservation](https://github.com/bartlapp/base-k3s/blob/main/README.md#preserve-client-addresses-for-restricted-access) on C. Verify the actual public egress from A and C and the client address seen by ingress, not merely the desired firewall configuration. In this single-node profile C's outbound address must be `C_IP`. If SNAT, IPv6, a proxy or another browser egress changes an address, stop and record its verified authorized CIDR before applying the list; do not widen it to all sources. Forgejo's server-side discovery/token/userinfo requests must work while ordinary Keycloak access remains denied. Preserve production-outbound-effect isolation from the package runbook.

In the infrastructure shell, check this profile's native node egress before using those addresses:

```bash
test "$(curl --ipv4 --fail --silent --show-error https://api.ipify.org)" = "$ADMIN_IP"
test "$(ssh -F "$WORK_DIR/clusters/cluster-1/base/ssh.config" cluster-1-node1 \
  curl --ipv4 --fail --silent --show-error https://api.ipify.org)" = "$A_IP"
test "$(ssh -F "$WORK_DIR/clusters/cluster-3/base/ssh.config" cluster-3-node1 \
  curl --ipv4 --fail --silent --show-error https://api.ipify.org)" = "$C_IP"
```

These checks establish node IPv4 egress, not pod routing or ingress enforcement. During restricted acceptance, confirm the actual Forgejo pod's OIDC flow and allowed/denied browser behavior through the preserved-address ingress. A different observed pod source must be resolved before activation.

## Withdraw writes, capture consumers first and retire B

Agree the interruption and accepted data-loss boundary. End user HTTP/API and direct Git SSH sessions, stop client writers and prevent other operators, schedules or automation from resuming B. This profile has no Actions, mail, mirrors, federation or external webhooks. If those assumptions no longer hold, establish their enforced withdrawal before continuing.

The package owns application drainage and capture. The installation owns the public firewall boundary. In the infrastructure shell, inspect B's dedicated firewall and its actual attachment; no other attached firewall, IPv6 path, NodePort or alternate route may admit ordinary HTTP/SSH writes:

```bash
source "$WORK_DIR/operations/workstation.env"
B_FIREWALL=$(yq -er '.clusters."cluster-2".observed.firewalls.admin.id' "$VALUES")
SOURCE_SERVER=$(yq -er '.vms[strenv(B_VM)].observed.server.id' "$VALUES")
hcloud server describe "$SOURCE_SERVER" --output json
hcloud firewall describe "$B_FIREWALL" --output json
```

Match provider, managed ownership, ID, name, addresses and the single recorded attachment to B before mutation. Remove the inspected TCP 443 and Forgejo SSH admission rules, using their **actual complete source lists**. For the walkthrough's public HTTPS and administrator/A-only SSH rules:

```bash
hcloud firewall delete-rule "$B_FIREWALL" --direction in --protocol tcp --port 443 --source-ips 0.0.0.0/0,::/0
hcloud firewall delete-rule "$B_FIREWALL" --direction in --protocol tcp --port 30222 --source-ips "$ADMIN_IP/32,$A_IP/32"
hcloud firewall describe "$B_FIREWALL" --output json
```

If an inspected rule differs or is already absent, reconcile that exact rule instead of blindly repeating deletion. Keep port 80 reachable for HTTP-01; application ingress withdrawal below closes the application route. Removing firewall admission does not prove that established connections ended: confirm clients disconnected, then require the package's drained source and no remaining writer before accepting the final boundary. Failed stop/drain blocks replacement.

1. In the Forgejo shell, resume `forgejo` and execute **all** of [Capture final writes before source stop](https://github.com/bartlapp/bartl-forgejo/blob/main/README.md#capture-final-writes-before-source-stop). Keep its writer running for the capture; do not stop it first. Require successful final publication, then current-generation Stopped/drain, CR finalization and Helm removal while its controller is available. Confirm retired HTTP and SSH routing objects are gone. Preserve package-specific handoff:

   ```bash
   cp "$FJ_SOURCE_DIR/backup-result.json" "$WORK_DIR/evidence/forgejo-final-backup.json"
   cp "$FJ_SOURCE_DIR/source-pvc.json" "$WORK_DIR/evidence/forgejo-source-pvc.json"
   printf '%s\n' "$BACKUP_SCHEDULE" > "$WORK_DIR/evidence/forgejo-source-backup-schedule"
   printf '%s\n' "$SOURCE_HOST" > "$WORK_DIR/evidence/forgejo-source-host"
   ```

2. Only after Forgejo retirement, return to the still-selected Keycloak source shell and execute **all** of [RECOVERY step 2](https://github.com/bartlapp/bartl-keycloak/blob/main/RECOVERY.md#2-capture-final-writes-and-retire-a-reachable-source). The package stops Keycloak, leaves PostgreSQL available for final capture, then retires controller/database after verified publication. Do not stop PostgreSQL before its final capture. Preserve:

   ```bash
   cp "$KC_SOURCE_DIR/backup-result.json" "$WORK_DIR/evidence/keycloak-final-backup.json"
   cp "$KC_SOURCE_DIR/source-pvc.json" "$WORK_DIR/evidence/keycloak-source-pvc.json"
   ```

These are coordinated application points, not an atomic stack snapshot. Preserve their full identities and capture boundaries separately. Keep both source directories, protected inputs, exact source/target artifacts and C access usable without B. Require no pending capture/publication before enforcing host retirement.

Inspect B again, match the retained identity and confirm authorization to power it off:

```bash
source "$WORK_DIR/operations/workstation.env"
SOURCE_SERVER=$(yq -er '.vms[strenv(B_VM)].observed.server.id' "$VALUES")
hcloud server describe "$SOURCE_SERVER" --output json
hcloud server poweroff "$SOURCE_SERVER"
hcloud server describe "$SOURCE_SERVER" --output json |
  jq -e --arg id "$SOURCE_SERVER" 'select((.id | tostring) == $id and .status == "off") | {id,name,status}' \
  > "$WORK_DIR/evidence/source-retirement.json"
```

Keep B off and disable unauthorized restart for the rest of the run. Retained stop intent, removed Forgejo routing, retired Keycloak controller/database and withdrawn firewall admission prevent an accidental return from reclaiming production authority. Unreachability alone is not retirement. Do not automatically return to B after any consequential candidate write/effect.

## Restrict C before moving either hostname

C needs public port 80 for HTTP-01, but HTTPS and direct SSH must admit only acceptance sources. In the infrastructure shell inspect the dedicated firewall and live attachments:

```bash
C_FIREWALL=$(yq -er '.clusters."cluster-3".observed.firewalls.admin.id' "$VALUES")
C_SERVER=$(yq -er '.vms[strenv(C_VM)].observed.server.id' "$VALUES")
hcloud server describe "$C_SERVER" --output json
hcloud firewall describe "$C_FIREWALL" --output json
```

Require the recorded provider/managed ownership and attachment to C, with no other attached firewall exposing these ports. For the untouched Base firewall, replace public HTTPS with the selected acceptance sources and add restricted Forgejo SSH:

```bash
hcloud firewall delete-rule "$C_FIREWALL" --direction in --protocol tcp --port 443 --source-ips 0.0.0.0/0,::/0
hcloud firewall add-rule "$C_FIREWALL" --direction in --protocol tcp --port 443 \
  --source-ips "$ADMIN_IP/32,$A_IP/32,$C_IP/32"
hcloud firewall add-rule "$C_FIREWALL" --direction in --protocol tcp --port 30222 \
  --source-ips "$ADMIN_IP/32,$A_IP/32"
hcloud firewall describe "$C_FIREWALL" --output json > "$WORK_DIR/evidence/c-restricted-firewall.json"
```

On resumption, inspect/verify an already matching rule rather than adding duplicates. Keep SSH/API administrator rules intact. Preserve public port 80 and correct conflicting AAAA/alternate routes; IPv4 restrictions are insufficient if IPv6 bypasses them. Require allowed and independent denied-source tests once routes exist. A changed firewall alone is not useful-service acceptance.

## Recover Keycloak to restricted acceptance

In the original Keycloak shell, continue at [RECOVERY step 3](https://github.com/bartlapp/bartl-keycloak/blob/main/RECOVERY.md#3-prepare-independent-target-access-storage-and-credentials), then step 4 and [restricted acceptance step 5](https://github.com/bartlapp/bartl-keycloak/blob/main/RECOVERY.md#5-accept-under-restricted-access). For a fresh shell, restore the retained source/target variables from step 1 and the recorded target package/version; skip creation and all source API calls. `SOURCE_DIR` is `$KC_SOURCE_DIR`, `TARGET_DIR` is `$KC_TARGET_DIR`, and the expected final point comes from `evidence/keycloak-final-backup.json`. Restore that unchanged receipt to the source directory only if the retained copy is missing; never replace it with a newer target receipt.

The package owns Keycloak DNS read/update and authoritative/public checks. Use this installation's `DNS_ZONE`; move only its inspected Keycloak record from B to C. Do not update it again with a generic hostname loop. Complete DNS convergence **before** certificate-dependent installation waits. Require automatic reconstruction of the exact final point, current-generation Ready, independent PVC UIDs/backing volumes, retained issuer/realm/client/user identity, trusted TLS and the package's restricted browser/write/read checks. Preserve new target database passwords independently; retain native recovery administrator and repository keys, not new bootstrap identity.

**Stop before [step 6, Open service](https://github.com/bartlapp/bartl-keycloak/blob/main/RECOVERY.md#6-open-service).** Maintenance must remain true and scheduled capture suspended. Complete step 5's subsequent backup and successful readback; keep `recovered-backup-result.json` distinct from the final source receipt. Keycloak's allowlist must still include the verified administrator, A and C addresses recorded above.

## Recover Forgejo while both services remain restricted

In the Forgejo shell reload its independent source pointers and preserved schedule before [Prepare the replacement](https://github.com/bartlapp/bartl-forgejo/blob/main/README.md#prepare-the-replacement):

```bash
export SOURCE_DEPLOYMENT=forgejo SOURCE_DIR="$FJ_SOURCE_DIR"
export SOURCE_HOST="$(cat "$WORK_DIR/evidence/forgejo-source-host")"
export BACKUP_SCHEDULE="$(cat "$WORK_DIR/evidence/forgejo-source-backup-schedule")"
```

Use the replacement choices in the input table **inside** that package block. It creates the target record once, reads its exact 0.2.2 archive and applies the documented operation-over-service input precedence; do not use Keycloak's deployment Helm flag or chart cache layout. Keep backup schedule empty through acceptance. The package prepares independent claims, retained identity/configuration, repository Secrets and ordinary install. Do not regenerate keys, bootstrap users or native OIDC auth records.

The Forgejo package requires moving hostnames but supplies inspection rather than a deSEC mutation. At its DNS boundary, after target preparation and before Reconstruct and accept, the infrastructure shell updates only the inspected Forgejo record:

```bash
source "$WORK_DIR/operations/workstation.env"
subname=${FORGEJO_HOST%."$DNS_ZONE"}
test "$subname.$DNS_ZONE" = "$FORGEJO_HOST"
desec "$DNS_API/rrsets/$subname/A/" |
  jq -e --arg ip "$B_IP" '.records == [$ip]'
desec --request PATCH "$DNS_API/rrsets/$subname/A/" \
  --json "$(jq -nc --arg ip "$C_IP" '{records:[$ip]}')"
HOST="$FORGEJO_HOST" IP="$C_IP" yq -i '.operations.dns[strenv(HOST)].address = strenv(IP)' "$VALUES"
for resolver in ns1.desec.io ns2.desec.org; do
  dig @"$resolver" "$FORGEJO_HOST" A +norecurse +noall +comments +answer
done
dig @1.1.1.1 +short "$FORGEJO_HOST" A
dig @8.8.8.8 +short "$FORGEJO_HOST" A
```

Require authoritative `aa` and public answers for C, allowing the existing TTL to expire. If the record already points to C during resumption, verify it instead of requiring B and patching again. Any other address/ownership conflict stops the move. Handle a separately selected SSH hostname as its own inspected authorized record; the reference defaults use the same hostname. Do not alter Restic's A record.

Back in the Forgejo shell execute [Reconstruct and accept](https://github.com/bartlapp/bartl-forgejo/blob/main/README.md#reconstruct-and-accept). Require the exact `.status.backup.snapshot` from `evidence/forgejo-final-backup.json`, native 17.0.1, independent claims/backing storage, current-generation Ready, TLS and preserved SSH host key. **Stop before [Activate the replacement](https://github.com/bartlapp/bartl-forgejo/blob/main/README.md#activate-the-replacement).** Do not restore its schedule or remove firewall restrictions yet.

Run [all recovered-data checks](verification.md#verify-the-same-data-after-recovery) from A and the administrator's fresh browser while both services remain restricted. This includes Git HTTP/SSH read/write, LFS bytes, issue/PR, attachment/package/release bytes, permissions, preserved host identity and fresh real OIDC login. Keycloak must allow C's server-side discovery/token/userinfo traffic without allowing ordinary sources. Do not rewrite issuer/callbacks or restored auth records to bypass a failed composition check. Check denied sources independently; a successful allowed login does not prove restriction.

Perform the synthetic recovered write **before** Forgejo's acceptance backup block, so its subsequent point includes `recovered.txt`. Also create distinct post-recovery issue/package fixtures on A, in its existing SSH client session:

```bash
cd /root/bartl-reference/forgejo
source client.env
command -v sqlite3
RECOVERY_MARKER="reference-recovered-$(openssl rand -hex 16)"
printf '%s\n' "$RECOVERY_MARKER" > recovery-marker
printf '%s\n' "$RECOVERY_MARKER-issue-content" > recovery-issue-body.txt
printf '%s\n' "$RECOVERY_MARKER-package-content" > recovery-package.txt
forgejo_api --json "$(jq -nc --arg marker "$RECOVERY_MARKER" \
  '{title:$marker,body:($marker + "-issue-content")}')" \
  "$FORGEJO_URL/api/v1/repos/reference-admin/reference/issues" > recovery-issue.json
forgejo_api --upload-file recovery-package.txt \
  "$FORGEJO_URL/api/packages/reference-admin/generic/reference-recovered/1.0.0/package.txt"
forgejo_api "$(jq -er .url recovery-issue.json)" |
  jq -e --arg marker "$RECOVERY_MARKER" \
    '.title == $marker and .body == ($marker + "-issue-content")'
forgejo_api "$FORGEJO_URL/api/packages/reference-admin/generic/reference-recovered/1.0.0/package.txt" \
  > recovery-package-readback.txt
cmp recovery-package.txt recovery-package-readback.txt
forgejo_api "$FORGEJO_URL/api/v1/packages/reference-admin/generic/reference-recovered/1.0.0" \
  > recovery-package-record.json
```

Retain the issue/package API records, unique marker and expected bytes on A. Native SQLite CLI availability on A is a prerequisite for the archive check below; supply it through the approved test-client setup if absent before continuing. Then complete Forgejo's package-owned acceptance backup and preserve its native full-object receipt on the workstation:

```bash
cp "$FJ_TARGET_DIR/backup-result.json" "$WORK_DIR/evidence/forgejo-recovered-backup.json"
cp "$KC_TARGET_DIR/recovered-backup-result.json" "$WORK_DIR/evidence/keycloak-recovered-backup.json"
```

## Open the dependency before its consumer

Only after all restricted acceptance and subsequent-backup checks pass:

1. In the selected Keycloak target shell, execute [RECOVERY step 6, Open service](https://github.com/bartlapp/bartl-keycloak/blob/main/RECOVERY.md#6-open-service). This removes application maintenance and resumes its approved backup schedule. Keep C's firewall restriction until the step is successful.
2. In the infrastructure shell replace only C's temporary restricted HTTPS rule with the intended public rule:

   ```bash
   hcloud firewall delete-rule "$C_FIREWALL" --direction in --protocol tcp --port 443 \
     --source-ips "$ADMIN_IP/32,$A_IP/32,$C_IP/32"
   hcloud firewall add-rule "$C_FIREWALL" --direction in --protocol tcp --port 443 --source-ips 0.0.0.0/0,::/0
   ```

   HTTPS is shared by both services: this also exposes the accepted Forgejo HTTP route. Therefore all consumer acceptance must have passed before this mutation, even though its schedule and SSH activation still follow. Verify ordinary Keycloak login before continuing.
3. In the Forgejo shell restore the preserved `BACKUP_SCHEDULE` and execute [Activate the replacement](https://github.com/bartlapp/bartl-forgejo/blob/main/README.md#activate-the-replacement). Its environment restriction removal means the HTTPS mutation above plus the intended SSH rule. This reference retains administrator/A-only direct SSH; do not broaden it to public SSH without an explicit operating decision.

Require current-generation Ready and normal client access. Verify both capture schedules and an actual successful scheduled run; manual publication does not prove scheduling. Leave source intent stopped and B powered off. Retain active deployment/resource identities, selected points, final-write boundaries, actual interruption, acceptance and schedule outcomes in the installation's existing operating record.

## Reinstall Forgejo with retained state

Authorize this separate application interruption after takeover and completed publication. In the Forgejo shell [resume](https://github.com/bartlapp/bartl-forgejo/blob/main/README.md#resume-an-existing-deployment) `forgejo-replacement`, not the retired source. Save the current PVC inventory, then execute [Removal and retained-state reinstall](https://github.com/bartlapp/bartl-forgejo/blob/main/README.md#removal-and-retained-state-reinstall) in full:

```bash
kubectl --kubeconfig "$KC" -n forgejo-green get pvc -o json > "$WORK_DIR/evidence/forgejo-before-reinstall-pvc.json"
```

Require no pending publication, confirmed current-generation stop/drain, CR deletion/finalization with controller alive, then Helm uninstall. Retain both claims, TLS, identity/configuration and repository Secrets. Reset retained stop intent through the package's reinstall block and install ordinarily with the same recorded native version and inputs; do not recreate claims or credentials.

Require current-generation Ready, unchanged PVC UIDs, retained identity/content and fresh useful HTTP/SSH/OIDC access. Check the recovered Git/LFS/issue/package/release data again using fresh client directories, rather than reusing existing clone destinations. Create/read new synthetic work, then use [Capture and retry publication](https://github.com/bartlapp/bartl-forgejo/blob/main/README.md#capture-and-retry-publication) to publish another complete point:

```bash
kubectl --kubeconfig "$KC" -n forgejo-green get pvc -o json |
  jq -e --slurpfile before "$WORK_DIR/evidence/forgejo-before-reinstall-pvc.json" \
    '([.items[].metadata.uid]|sort) == ([$before[0].items[].metadata.uid]|sort)'
cp "$FJ_TARGET_DIR/backup-result.json" "$WORK_DIR/evidence/forgejo-reinstalled-backup.json"
```

## Read new work from the subsequent backup on A

This acceptance reads the exact post-reinstall point, not the live PVC or a client clone. Keep A available. On the workstation transfer only scoped Forgejo reader inputs and the sanitized native receipt to the test client:

```bash
CLIENT_SSH="$WORK_DIR/clusters/cluster-1/base/ssh.config"
REPOSITORY_INPUTS="$RESTIC_DIR/protected/repositories/forgejo"
ssh -F "$CLIENT_SSH" cluster-1-node1 'umask 077; mkdir -p /root/bartl-reference/repositories/forgejo/reader'
ssh -F "$CLIENT_SSH" cluster-1-node1 'cat > /root/bartl-reference/repositories/forgejo/reader/password' < "$REPOSITORY_INPUTS/password"
ssh -F "$CLIENT_SSH" cluster-1-node1 'cat > /root/bartl-reference/repositories/forgejo/reader/restPassword' < "$REPOSITORY_INPUTS/reader.restPassword"
ssh -F "$CLIENT_SSH" cluster-1-node1 'cat > /root/bartl-reference/forgejo-reinstalled-backup.json' < "$WORK_DIR/evidence/forgejo-reinstalled-backup.json"
ssh -F "$CLIENT_SSH" cluster-1-node1
```

On A, use the independently checksummed native Restic client and its verified HTTPS endpoint. The archive layout and manifest fields below come from the selected Forgejo package's [capture implementation](https://github.com/bartlapp/bartl-forgejo/blob/main/cmd/worker/files.go): format 1, `capture/manifest.json`, `members[].path`/`sha256`, and owned state at `capture/state/`. These are package-specific, not a shared backup schema.

```bash
cd /root/bartl-reference
umask 077
SNAPSHOT=$(jq -er '.status.backup | select(.success == true) | .snapshot | select(test("^[a-f0-9]{64}$"))' forgejo-reinstalled-backup.json)
curl -fL -o restic.bz2 https://github.com/restic/restic/releases/download/v0.19.1/restic_0.19.1_linux_amd64.bz2
printf 'f415415624dcc452f2a02b8c33641791a8c6d6d3b65bbb3543fcf9a25151585c  restic.bz2\n' | sha256sum --check
bzip2 -d restic.bz2
chmod 700 restic
source installation.env
export RESTIC_REPOSITORY="rest:https://$BACKUP_HOST/forgejo/"
export RESTIC_PASSWORD_FILE=/root/bartl-reference/repositories/forgejo/reader/password
export RESTIC_REST_USERNAME=reader
export RESTIC_REST_PASSWORD="$(cat repositories/forgejo/reader/restPassword)"
test ! -e /root/bartl-reference/reinstalled-restore
./restic restore "$SNAPSHOT" --target /root/bartl-reference/reinstalled-restore --verify
repo=/root/bartl-reference/reinstalled-restore/capture/state/data/repositories/reference-admin/reference.git
actual=$(git --git-dir="$repo" show main:recovered.txt)
test "$actual" = 'New write on recovered C'
cd /root/bartl-reference/reinstalled-restore/capture
jq -e '.format == 1 and .instance == "forgejo" and .version == "17.0.1" and
  (.installation | length > 0) and (.operation | length > 0) and (.members | length > 0)' manifest.json
jq -e --slurpfile state state/.bartl/state.json \
  '.installation == $state[0].installation and .instance == $state[0].instance and
   .version == $state[0].version' manifest.json
jq -r '.members[] | select(.sha256 != null) | "\(.sha256)  state/\(.path)"' \
  manifest.json > /root/bartl-reference/reinstalled-members.sha256
sha256sum --check /root/bartl-reference/reinstalled-members.sha256
test "$(sqlite3 -readonly state/data/forgejo.db 'PRAGMA integrity_check;')" = ok
sqlite3 -readonly state/data/forgejo.db .dump > /root/bartl-reference/reinstalled-database.sql
RECOVERY_MARKER=$(cat /root/bartl-reference/forgejo/recovery-marker)
grep -F -- "$RECOVERY_MARKER-issue-content" /root/bartl-reference/reinstalled-database.sql
PACKAGE_SHA=$(sha256sum /root/bartl-reference/forgejo/recovery-package.txt | cut -d ' ' -f 1)
PACKAGE_MEMBER=$(jq -er --arg hash "$PACKAGE_SHA" \
  '[.members[] | select(.sha256 == $hash) | .path] | select(length == 1) | .[0]' manifest.json)
cmp /root/bartl-reference/forgejo/recovery-package.txt "state/$PACKAGE_MEMBER"
exit
```

Require every file-checksum check, native SQLite integrity check, unique post-recovery issue body, exact package blob bytes and Git readback to pass. The database export inspects captured native SQLite content without guessing Forgejo SQL table names; the manifest identifies the package blob by its unique fixture bytes rather than a guessed storage path. These checks prove captured content, not relational schema or application recovery; the earlier restored-service acceptance establishes useful semantics. Keep the native capture metadata, point identity and acceptance results. Remove the plaintext database export and restored tree under the lab's authorized data-disposition procedure.

Preserve verified point identities and results, remove plaintext reader inputs when no longer needed, then continue with [cleanup](README.md#cleanup). Do not use this planned-retirement exercise as evidence of provider-loss activation or live qualification of the current Keycloak interface.
