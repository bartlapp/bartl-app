# Recover on C and return the service to use

Complete [source acceptance](verification.md). A (`cluster-1`) keeps Restic and the test client; B (`cluster-2`) is the reachable source; C (`cluster-3`) supplies independent empty target storage. This is an authorized **planned interruption**, not provider-loss recovery. Keep B accessible until Forgejo, Paperless and Keycloak complete final capture and retirement, then enforce its poweroff before reconstruction. A remains available apart from the separately authorized Restic lifecycle exercises below.

This chapter coordinates the [Keycloak recovery runbook](https://github.com/bartlapp/bartl-keycloak/blob/main/RECOVERY.md), [Forgejo replacement](https://github.com/bartlapp/bartl-forgejo/blob/main/README.md#replacement-upgrade-and-promotion), [Paperless recovery](https://github.com/bartlapp/bartl-paperless/blob/main/README.md#recovery-and-replacement-upgrade) and [Restic lifecycle](https://github.com/bartlapp/bartl-restic/blob/main/README.md#stop-and-start). Package procedures own capture, stop, restore, migration, scheduling and activation. All now select deployment context and recorded disposable chart caches; their Helm interfaces remain package-specific.

The selected stable artifacts must supply those documented interfaces. Keycloak 0.7.0 is published, but its fresh no-backup acceptance does not qualify recovery or this composition. No historical evidence qualifies this coordinated sequence; qualify the actual selected artifacts and procedure revisions through the full run.

## Retain the coordination inputs

Run this coordination-input block in each package terminal and the infrastructure terminal after entering the retained installation. It supplies cross-service paths without changing the selected deployment:

```bash
source "${WORK_DIR:?}/operations/workstation.env"
set -euo pipefail
umask 077
export VALUES="$WORK_DIR/installation.yaml"
export KC_SOURCE_DIR="$WORK_DIR/clusters/cluster-2/applications/keycloak"
export FJ_SOURCE_DIR="$WORK_DIR/clusters/cluster-2/applications/forgejo"
export PL_SOURCE_DIR="$WORK_DIR/clusters/cluster-2/applications/paperless"
export RESTIC_DIR="$WORK_DIR/clusters/cluster-1/applications/restic"
export KC_TARGET_DIR="$WORK_DIR/clusters/cluster-3/applications/keycloak/deployments/keycloak-replacement"
export FJ_TARGET_DIR="$WORK_DIR/clusters/cluster-3/applications/forgejo/deployments/forgejo-replacement"
export PL_TARGET_DIR="$WORK_DIR/clusters/cluster-3/applications/paperless/deployments/paperless-replacement"
CLIENT_SSH="$WORK_DIR/clusters/cluster-1/base/ssh.config"
mkdir -p "$WORK_DIR/evidence"
```

Keep the same installation root and `VALUES` when a package example selects its root. Substitute the following choices at the named package setup steps, rather than executing an example assignment and correcting it afterwards:

| Package procedure | Source | Replacement choices |
| --- | --- | --- |
| Keycloak RECOVERY, step 1 | `SOURCE_DEPLOYMENT=keycloak`, `SOURCE_DIR=$KC_SOURCE_DIR` | `TARGET_DEPLOYMENT=keycloak-replacement`, `TARGET_PACKAGE=keycloak-replacement`, `TARGET_CLUSTER=cluster-3`, `TARGET_NAMESPACE=keycloak-green` |
| Forgejo, replacement acquisition / Prepare the replacement | `SOURCE_DEPLOYMENT=forgejo`, `SOURCE_DIR=$FJ_SOURCE_DIR` | `TARGET_PACKAGE=forgejo-replacement`, `DEPLOYMENT=forgejo-replacement`, `TARGET_CLUSTER=cluster-3`, `TARGET_NAMESPACE=forgejo-green`, native `TARGET_VERSION=17.0.1` |
| Paperless, replacement acquisition / Prepare the independent target | `SOURCE_DEPLOYMENT=paperless`, `SOURCE_DIR=$PL_SOURCE_DIR` | `TARGET_PACKAGE=paperless-replacement`, `DEPLOYMENT=paperless-replacement`, `TARGET_CLUSTER=cluster-3`, `TARGET_NAMESPACE=paperless-green`; select native 3.3.1 only after source retirement |
| Restic, Resume an existing deployment | Enter `$RESTIC_DIR`, then resume | No replacement; retain the recorded package, claim, repositories and credentials |

Choose/check unused target keys **at the package's creation step**. Do not precreate deployment/package entries and then rerun that creation block. On resumption after successful preparation, use recorded entries and resume at the next unfinished step; namespace/Secret/claim creation is not a retry interface.

Use separate direnv-hooked Bash terminals for Keycloak, Forgejo, Paperless, Restic and infrastructure. Enter each recorded deployment directory and wait for the next prompt before running its resumption procedure. Do not use no-hook child shells or manually export a deployment key. Preserve source/target pointers through package pauses; Forgejo/Paperless retain their original schedules in source-directory operation files, which must remain available until activation.

A package changes generic names such as `SOURCE_DIR`, `CHART`, `NS` and `KUBECONFIG`; never carry these from one package to another. Use a separate infrastructure shell with `workstation.env` and explicit `KA`, `KB`, `KC` paths. The fixed per-service directories above and separately named receipts remain the handoff across sessions. Preserve independent credentials and the installation record before powering B off; no later target operation may depend on B's API.

Every package condition must belong to the current resource generation. Use its generation-aware native condition wait and result checks; do not freeze an earlier generation into a separate equality wait. Timeout is not server-side cancellation. Stop on failed/ambiguous native work and retain diagnostics; do not clear failure markers, finalizers or native locks.

## Exercise source operation before interruption

1. Resume source Keycloak through its [README](https://github.com/bartlapp/bartl-keycloak/blob/main/README.md#resume-an-existing-deployment), entering `$KC_SOURCE_DIR` and waiting for the next prompt. Run [Capture a backup](https://github.com/bartlapp/bartl-keycloak/blob/main/README.md#capture-a-backup). Preserve its native receipt before another capture overwrites it:

   ```bash
   cp "$KC_SOURCE_DIR/backup-result.json" "$WORK_DIR/evidence/keycloak-source-backup.json"
   ```

2. In the Forgejo shell, [resume](https://github.com/bartlapp/bartl-forgejo/blob/main/README.md#resume-an-existing-deployment) `forgejo`, then [capture](https://github.com/bartlapp/bartl-forgejo/blob/main/README.md#capture-and-retry-publication). Require this request's successful complete publication:

   ```bash
   cp "$FJ_SOURCE_DIR/backup-result.json" "$WORK_DIR/evidence/forgejo-source-backup.json"
   ```

3. In the Paperless shell, [resume](https://github.com/bartlapp/bartl-paperless/blob/main/README.md#resume-an-existing-deployment) its source deployment and run [Capture, publication and retry](https://github.com/bartlapp/bartl-paperless/blob/main/README.md#capture-publication-and-retry). Require complete publication of a point containing the baseline PDF and permission changes, then preserve:

   ```bash
   cp "$PL_SOURCE_DIR/backup-result.json" "$WORK_DIR/evidence/paperless-source-backup.json"
   ```

Keycloak's receipt has top-level `.snapshotID`. Forgejo retains `.status.backup.snapshot`; Paperless retains `.status.backup.snapshotID`, repository identity and capture operation. Keep each full native receipt and never parse them as a shared format or replace final source receipts with later points.

### Restart without backup access

Authorize this short backup-endpoint interruption and stop submitting manual captures. First let all admitted captures/publications complete successfully. Retain the current scheduling choices and pause new scheduled submissions without stopping the applications:

```bash
test ! -e "$WORK_DIR/operations/capture-settings-before-interruption.yaml"
yq '{"keycloak": ((.operations.deployments.keycloak // {}) | pick(["backupSuspend"])),
     "paperless": .services.paperless.backup.schedule,
     "forgejo": .services.forgejo.backup.schedule}' "$VALUES" \
  > "$WORK_DIR/operations/capture-settings-before-interruption.yaml"
yq -i '.operations.deployments.keycloak.backupSuspend = true |
  .services.paperless.backup.schedule = "" |
  .services.forgejo.backup.schedule = ""' "$VALUES"
```

In each source application terminal, follow its **Apply changes to a running deployment** procedure: [Keycloak](https://github.com/bartlapp/bartl-keycloak/blob/main/README.md#apply-changes-to-a-running-deployment), [Paperless](https://github.com/bartlapp/bartl-paperless/blob/main/README.md#apply-changes-to-a-running-deployment), [Forgejo](https://github.com/bartlapp/bartl-forgejo/blob/main/README.md#apply-changes-to-a-running-deployment). Confirm the effective pause and no newly admitted or still-running capture before interrupting Restic. Keep these schedules paused through the retained-Restic reinstall below.

In the Restic shell, [resume](https://github.com/bartlapp/bartl-restic/blob/main/README.md#resume-an-existing-deployment) `restic` and execute only the stop half of [Stop and start](https://github.com/bartlapp/bartl-restic/blob/main/README.md#stop-and-start). Require current-generation Stopped and no serving/lifecycle/copy Pods. Keep A itself and its test client running.

In the Keycloak shell, run its [native restart](https://github.com/bartlapp/bartl-keycloak/blob/main/README.md#restart-keycloak). Restart the existing Forgejo application Deployment, not its controller or lifecycle intent:

```bash
kubectl --kubeconfig "$KB" -n forgejo rollout restart deployment/forgejo
kubectl --kubeconfig "$KB" -n forgejo rollout status deployment/forgejo --timeout=10m
```

In the selected Paperless source shell, execute only the native restart commands in [Stop, start and restart](https://github.com/bartlapp/bartl-paperless/blob/main/README.md#stop-start-and-restart), not its persistent stop/start blocks. Verify the existing library and [Paperless retained-data checks](verification.md#paperless-retained-data-checks) while Restic is unavailable.

Require retained realm/user/client identities, native Keycloak login, Forgejo native login and useful HTTP/SSH reads from A while Restic is stopped. Neither service may initialize or restore. The Forgejo README describes ordinary restart semantics but does not supply a dedicated restart command; the commands above are Kubernetes' native Deployment restart, not a recovery workflow.

In the Restic shell, complete its start half and require current-generation Ready, trusted HTTPS and authenticated access to all three histories. This checks existing-state startup without backup access, not recovery without independent inputs.

### Stop/start and retained Restic reinstall

Exercise persistent stop/start: stop Forgejo and Paperless before Keycloak; start Keycloak before its consumers. Use [Forgejo Stop and start](https://github.com/bartlapp/bartl-forgejo/blob/main/README.md#stop-and-start), [Paperless Stop, start and restart](https://github.com/bartlapp/bartl-paperless/blob/main/README.md#stop-start-and-restart) and [Keycloak persistent stop/start](https://github.com/bartlapp/bartl-keycloak/blob/main/README.md#persistently-stop-and-start-keycloak), each in its own resumed context. Require current-generation Stopped/Ready, drained work and unchanged useful data/identity. Do not scale generated workloads to implement persistent stop.

Before uninstalling Restic, retain each repository's native identity. Open A with `ssh -F "$CLIENT_SSH" cluster-1-node1` and run:

```bash
set -euo pipefail
umask 077
mkdir -p /root/bartl-reference/restic-reinstall
for repository in keycloak paperless forgejo; do (
  source "/root/bartl-reference/repositories/$repository/client/client.env"
  export RESTIC_REPOSITORY="$REPOSITORY_URL" RESTIC_PASSWORD_FILE="$REPOSITORY_INPUTS/password" RESTIC_REST_USERNAME=reader
  export RESTIC_REST_PASSWORD="$(cat "$REPOSITORY_INPUTS/reader.restPassword")"
  test ! -e "/root/bartl-reference/restic-reinstall/$repository-id"
  restic --cacert "$REPOSITORY_INPUTS/ca.crt" cat config | jq -er .id \
    > "/root/bartl-reference/restic-reinstall/$repository-id"
); done
exit
```

Keep these pre-operation identities on resumption; do not overwrite them with post-operation observations.

Before retiring B, exercise Restic's [Supported uninstall](https://github.com/bartlapp/bartl-restic/blob/main/README.md#supported-uninstall) followed immediately by [Reinstall retained state](https://github.com/bartlapp/bartl-restic/blob/main/README.md#reinstall-retained-state). Pause conflicting captures/copies/maintenance and record the claim UID first. Keep the controller alive through CR finalization. Retain the same PVC, TLS, supplied Secrets, credentials and repository keys; do not rerun endpoint creation.

Require current-generation Ready, unchanged claim/repository identities, authenticated reader access to all three histories and restore of each saved source point. Run native Restic on A with each repository's own reader/key/CA. Repeat [Verify a repository from A](applications.md#verify-a-repository-from-a) using the retained client inputs for each repository; do not install Restic on the workstation. Keep synthetic endpoint-check points distinct from application recovery points. Resume consumers only after the endpoint is usable.

After reinstall, open A again and compare native identities before adding new endpoint-check points:

```bash
set -euo pipefail
for repository in keycloak paperless forgejo; do (
  source "/root/bartl-reference/repositories/$repository/client/client.env"
  export RESTIC_REPOSITORY="$REPOSITORY_URL" RESTIC_PASSWORD_FILE="$REPOSITORY_INPUTS/password" RESTIC_REST_USERNAME=reader
  export RESTIC_REST_PASSWORD="$(cat "$REPOSITORY_INPUTS/reader.restPassword")"
  restic --cacert "$REPOSITORY_INPUTS/ca.crt" cat config |
    jq -e --arg expected "$(cat "/root/bartl-reference/restic-reinstall/$repository-id")" '.id == $expected'
); done
exit
```

After the retained-state checks succeed, restore the saved scheduling choices and apply them through the same three running-configuration procedures:

```bash
export CAPTURE_SETTINGS="$WORK_DIR/operations/capture-settings-before-interruption.yaml"
test -s "$CAPTURE_SETTINGS"
yq -i 'load(strenv(CAPTURE_SETTINGS)) as $saved |
  (.operations.deployments.keycloak |= del(.backupSuspend)) |
  .operations.deployments.keycloak += $saved.keycloak |
  .services.paperless.backup.schedule = $saved.paperless |
  .services.forgejo.backup.schedule = $saved.forgejo' "$VALUES"
```

Verify effective scheduling, then remove only this completed operation's temporary file:

```bash
rm "$CAPTURE_SETTINGS"
```

## Prepare the Keycloak target without changing the source

In the Keycloak shell execute [RECOVERY step 1](https://github.com/bartlapp/bartl-keycloak/blob/main/RECOVERY.md#1-retain-source-inputs-and-choose-the-target), using the mapping above. This retains source inputs and acquires the current target package before interruption; it prepares the selector but does not enter C or install the application. Leave B selected for final capture. Retain its recovered-realm administrator and repository credentials independently.

In the still-selected Forgejo and Paperless source terminals, execute only their replacement-chart acquisition blocks now, with the table's new package keys. Keep their `TARGET_STAGE` and resolved target package versions in those shells. Acquisition must succeed before interruption; target creation and native-version changes wait for retirement.

The runbook's single administrator CIDR is insufficient for this composition. After its allowlist selection, replace the list with the actual administrator/browser, A test client and C consumer outbound IPv4 sources:

```bash
source "$WORK_DIR/operations/workstation.env"
export ADMIN_IP A_IP C_IP
# This profile uses these public IPv4 egress addresses; verify them below.
yq -i '.services.keycloak.ingress.administratorSourceRanges =
  [strenv(ADMIN_IP) + "/32", strenv(A_IP) + "/32", strenv(C_IP) + "/32"]' "$VALUES"
```

Before restored startup, follow [Base source-address preservation](https://github.com/bartlapp/base-k3s/blob/main/README.md#preserve-client-addresses-for-restricted-access) on C. Verify actual public egress and the client address seen by ingress. Forgejo and Paperless server-side OIDC requests must work while ordinary Keycloak access remains denied. If SNAT, IPv6, a proxy or another browser egress changes an address, stop and select its verified authorized CIDR; do not broaden the list to all sources.

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
   printf '%s\n' "$SOURCE_HOST" > "$WORK_DIR/evidence/forgejo-source-host"
   ```

2. In the Paperless shell, execute **Final capture and source retirement** through confirmed Stopped/drain and retained source PVC inspection. Keep writers running until its fresh-final-capture check has passed; a retry of an old export is not the final capture. Retain `"$PL_SOURCE_DIR/backup-schedule-before-operation"` and preserve:

   ```bash
   cp "$PL_SOURCE_DIR/backup-result.json" "$WORK_DIR/evidence/paperless-final-backup.json"
   cp "$PL_SOURCE_DIR/source-pvc.json" "$WORK_DIR/evidence/paperless-source-pvc.json"
   ```

3. Only after both consumers are retired, execute **all** of [Keycloak RECOVERY step 2](https://github.com/bartlapp/bartl-keycloak/blob/main/RECOVERY.md#2-capture-final-writes-and-retire-a-reachable-source) in its source terminal. Keycloak stops while PostgreSQL remains available for final capture; retire controller/database only after verified publication. Preserve:

   ```bash
   cp "$KC_SOURCE_DIR/backup-result.json" "$WORK_DIR/evidence/keycloak-final-backup.json"
   cp "$KC_SOURCE_DIR/source-pvc.json" "$WORK_DIR/evidence/keycloak-source-pvc.json"
   ```

These are coordinated application points, not an atomic stack snapshot. Preserve all three source directories, receipts, protected inputs, temporary schedule files and C access outside B. A disposable chart cache is not the only source of package artifacts; the selected immutable releases remain retrievable. Require no pending capture/publication before host retirement.

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

## Restrict C before moving application hostnames

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

## Recover Paperless before Forgejo

In the Paperless terminal, keep `SOURCE_DEPLOYMENT=paperless`, `SOURCE_DIR=$PL_SOURCE_DIR` and the package acquisition variables. After B is confirmed off, select the supported native target:

```bash
yq -i '.services.paperless.version = "3.3.1"' "$VALUES"
```

Run **Prepare the independent target** using the table's C choices. Restore the original Paperless key and OIDC client input; supply the existing A repository's reader/writer files, not newly generated keys. At its DNS boundary, follow [Move a consumer hostname](#move-a-consumer-hostname) with `HOST="$PAPERLESS_HOST"`. Then execute **Reconstruct, review and activate** only through creation of the restricted review route, stopping before new-work capture and ordinary activation.

Require the final source receipt's repository/full `.status.backup.snapshotID`, native 3.3.1, independent claims and current-generation Ready. Set the package's `REVIEW_CIDR` to `"$ADMIN_IP/32"` before creating its review Middleware. Initially only the administrator is admitted.

A already reaches C through the restricted provider firewall but is not yet in Paperless's application allowlist. From the infrastructure terminal, verify that A is independently addressed and test its denial, including a forged forwarding header:

```bash
test "$A_IP" != "$ADMIN_IP"
ssh -F "$WORK_DIR/clusters/cluster-1/base/ssh.config" cluster-1-node1 \
  bash -s -- "$PAPERLESS_HOST" "$ADMIN_IP" <<'CHECK'
set -euo pipefail
PAPERLESS_URL="https://$1"
ADMIN_IP=$2
test "$(curl --silent --show-error -o /dev/null -w '%{http_code}' "$PAPERLESS_URL")" = 403
test "$(curl --silent --show-error -o /dev/null -w '%{http_code}' \
  -H "X-Forwarded-For: $ADMIN_IP" "$PAPERLESS_URL")" = 403
CHECK
```

Only after those denials pass, add A as the acceptance client:

```bash
kubectl --kubeconfig "$KC" -n paperless-green patch middleware paperless-review --type=merge \
  -p "$(jq -nc --arg admin "$ADMIN_IP/32" --arg client "$A_IP/32" \
    '{spec:{ipAllowList:{sourceRange:[$admin,$client]}}}')"
ssh -F "$WORK_DIR/clusters/cluster-1/base/ssh.config" cluster-1-node1 \
  curl --fail --silent --show-error --output /dev/null "https://$PAPERLESS_HOST"
```

Require the post-change request to succeed. The firewall remains restricted throughout; no temporary ordinary-client exception is introduced. On resumption, inspect whether the deny/admit transition already completed before replaying it. A source mismatch or inability to establish both outcomes stops activation.

Reissue native Paperless tokens against C because import excludes them. On the workstation:

```bash
source "$WORK_DIR/operations/paperless-users.env"
CLIENT_SSH="$WORK_DIR/clusters/cluster-1/base/ssh.config"
for actor in admin reader denied; do
  case "$actor" in
    admin) username=$PAPERLESS_ADMIN ;;
    reader) username=$PAPERLESS_READER ;;
    denied) username=$PAPERLESS_DENIED ;;
  esac
  kubectl --kubeconfig "$KC" -n paperless-green exec deployment/paperless -c paperless -- \
    uv run --no-project python manage.py drf_create_token "$username" |
    jq -Rer 'select(startswith("Generated token ")) |
      capture("^Generated token (?<token>[0-9a-f]+) for user ").token' |
    ssh -F "$CLIENT_SSH" cluster-1-node1 "umask 077; cat > /root/bartl-reference/paperless/tokens/$actor"
done
```

Run [Paperless retained-data checks](verification.md#paperless-retained-data-checks) from A and fresh OIDC login from the administrator browser. Verify the same user IDs, grants, content, search and original bytes. Complete the package's records review; this synthetic run has no unrecorded later business decisions, and that assumption must be checked, not applied to real customer records.

Run [Paperless new work after recovery](verification.md#paperless-new-work-after-recovery), then execute the package's subsequent capture block. Preserve its receipt:

```bash
cp "$PL_TARGET_DIR/backup-result.json" "$WORK_DIR/evidence/paperless-recovered-backup.json"
```

Complete [Paperless subsequent-backup readback](#read-paperless-new-work-from-the-subsequent-backup) before activation. Leave ordinary Paperless ingress disabled, its review route restricted and its capture schedule suspended. Do not execute its ordinary-access activation block yet.

## Recover Forgejo while all applications remain restricted

In the Forgejo terminal reload independent source pointers before **Prepare the replacement**. Keep the target package/version and acquisition staging from the pre-interruption step; do not download and silently select a different package halfway through the operation:

```bash
export SOURCE_DEPLOYMENT=forgejo SOURCE_DIR="$FJ_SOURCE_DIR"
export SOURCE_HOST="$(cat "$WORK_DIR/evidence/forgejo-source-host")"
```

Use the table's replacement choices **inside** the package creation block. It records a new package entry and target selector and projects native version/hostname intent explicitly; the chart still does not accept Keycloak's deployment flag. The saved original schedule remains in `"$FJ_SOURCE_DIR/backup-schedule-before-operation"`. Prepare independent claims, retained identity/configuration and repository Secrets; never regenerate keys, bootstrap users or native OIDC records.

At Forgejo's DNS boundary, before **Reconstruct and accept**, follow [Move a consumer hostname](#move-a-consumer-hostname) in the infrastructure terminal with `HOST="$FORGEJO_HOST"`. Handle a separately selected SSH hostname as its own authorized record; this reference uses the same hostname. Keep Restic on A.

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

## Reinstall Forgejo with retained state

Exercise retained-state reinstall on C while ordinary access remains restricted and the source remains off. In the Forgejo terminal resume its target directory, save the current PVC inventory and execute [Removal and retained-state reinstall](https://github.com/bartlapp/bartl-forgejo/blob/main/README.md#removal-and-retained-state-reinstall) in full. This is a separate authorized application interruption after completed publication:

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

Preserve selected point identities and remove plaintext reader inputs when no longer needed. After the readback passes, continue with **Open the dependency before its consumer** below. This planned-retirement exercise does not establish provider-loss activation.

## Open the dependency before its consumer

Only after all restricted acceptance and subsequent-backup checks pass:

1. In the selected Keycloak target shell, execute [RECOVERY step 6, Open service](https://github.com/bartlapp/bartl-keycloak/blob/main/RECOVERY.md#6-open-service). This removes application maintenance and resumes its approved backup schedule. Keep C's firewall restriction until the step is successful.
2. In the infrastructure shell replace only C's temporary restricted HTTPS rule with the intended public rule:

   ```bash
   hcloud firewall delete-rule "$C_FIREWALL" --direction in --protocol tcp --port 443 \
     --source-ips "$ADMIN_IP/32,$A_IP/32,$C_IP/32"
   hcloud firewall add-rule "$C_FIREWALL" --direction in --protocol tcp --port 443 --source-ips 0.0.0.0/0,::/0
   ```

   HTTPS is shared by all three applications. This also exposes accepted Forgejo HTTP, while Paperless's review route still restricts it. Every consumer's restricted acceptance and subsequent-backup readback must pass before this mutation. Verify ordinary Keycloak login.
3. In the Forgejo terminal execute **Activate the replacement** with `SOURCE_DIR=$FJ_SOURCE_DIR`; its procedure reloads the saved schedule. This reference retains administrator/A-only direct SSH; do not broaden it without an explicit decision.
4. In the Paperless terminal execute only its final activation block with `SOURCE_DIR=$PL_SOURCE_DIR`: remove the operator-owned review route, enable ordinary ingress and restore the saved schedule. Verify native/OIDC login and repeat the retained-data checks over ordinary access.

Require current-generation Ready and useful client access for all applications. Verify all three capture schedules and an actual successful scheduled run; manual publication does not prove scheduling. Leave source intent stopped and B powered off. Keep active resource identities and selected recovery points in the installation record. Qualification results belong in the release/integration record, not a customer execution diary.

After all application and scheduled-run checks pass, continue with [cleanup](README.md#cleanup).


## Move a consumer hostname

Use this checkpoint only at the Paperless or Forgejo package's DNS boundary, after source retirement and target preparation, before its certificate-dependent install waits. In the infrastructure terminal set `HOST` to that package's declared hostname. Keycloak uses its own DNS procedure; Restic stays on A.

```bash
source "$WORK_DIR/operations/workstation.env"
: "${HOST:?Select the consumer hostname}"
subname=${HOST%."$DNS_ZONE"}
test "$subname.$DNS_ZONE" = "$HOST"
desec "$DNS_API/rrsets/$subname/A/" > "$WORK_DIR/operations/moving-rrset.json"
jq . "$WORK_DIR/operations/moving-rrset.json"
```

Confirm this is the installation-owned record. If it already points to C, skip the patch and verify resolution. If it points to B, run:

```bash
jq -e --arg ip "$B_IP" '.records == [$ip]' "$WORK_DIR/operations/moving-rrset.json"
desec --request PATCH "$DNS_API/rrsets/$subname/A/" \
  --json "$(jq -nc --arg ip "$C_IP" '{records:[$ip]}')"
```

Any other address or ownership conflict stops the move. After live confirmation of C:

```bash
desec "$DNS_API/rrsets/$subname/A/" | jq -e --arg ip "$C_IP" '.records == [$ip]'
HOST="$HOST" IP="$C_IP" yq -i '.operations.dns[strenv(HOST)].address = strenv(IP)' "$VALUES"
for resolver in ns1.desec.io ns2.desec.org; do
  dig @"$resolver" "$HOST" A +norecurse +noall +comments +answer
done
dig @1.1.1.1 "$HOST" A +noall +comments +answer
dig @8.8.8.8 "$HOST" A +noall +comments +answer
```

Require authoritative `aa` and public C answers, allowing the existing TTL to expire. Inspect conflicting AAAA records and alternate routes. Return to the calling package procedure; do not apply a generic loop over unrelated service names.

## Read Paperless new work from the subsequent backup

After Paperless's post-recovery capture and before ordinary activation, transfer only the native receipt and scoped reader inputs from the workstation to A:

```bash
CLIENT_SSH="$WORK_DIR/clusters/cluster-1/base/ssh.config"
REPOSITORY_INPUTS="$RESTIC_DIR/protected/repositories/paperless"
ssh -F "$CLIENT_SSH" cluster-1-node1 'umask 077; mkdir -p /root/bartl-reference/repositories/paperless/reader'
ssh -F "$CLIENT_SSH" cluster-1-node1 \
  'cat > /root/bartl-reference/repositories/paperless/reader/password' < "$REPOSITORY_INPUTS/password"
ssh -F "$CLIENT_SSH" cluster-1-node1 \
  'cat > /root/bartl-reference/repositories/paperless/reader/restPassword' < "$REPOSITORY_INPUTS/reader.restPassword"
ssh -F "$CLIENT_SSH" cluster-1-node1 \
  'cat > /root/bartl-reference/paperless-recovered-backup.json' < "$WORK_DIR/evidence/paperless-recovered-backup.json"
ssh -F "$CLIENT_SSH" cluster-1-node1
```

On A, use the selected native point, not the live application volume:

```bash
cd /root/bartl-reference
source installation.env
umask 077
export RESTIC_REPOSITORY="rest:https://$BACKUP_HOST/paperless/"
export RESTIC_PASSWORD_FILE=/root/bartl-reference/repositories/paperless/reader/password
export RESTIC_REST_USERNAME=reader
export RESTIC_REST_PASSWORD="$(cat repositories/paperless/reader/restPassword)"
SNAPSHOT=$(jq -er '.status.backup | select(.phase=="Published") |
  .snapshotID | select(test("^[a-f0-9]{64}$"))' paperless-recovered-backup.json)
test "$(./restic cat config | jq -er .id)" = \
  "$(jq -er '.status.backup.repositoryID' paperless-recovered-backup.json)"
./restic cat snapshot "$SNAPSHOT" > paperless-snapshot.json
CAPTURE_PATH=$(jq -er '.paths | select(length==1) | .[0] |
  select(test("^/staging/captures/[a-zA-Z0-9-]{1,100}$"))' paperless-snapshot.json)
test ! -e paperless-readback
./restic restore "$SNAPSHOT" --target /root/bartl-reference/paperless-readback --verify
cd "/root/bartl-reference/paperless-readback$CAPTURE_PATH"
jq -e --arg installation "$INSTALLATION_ID" '.format==1 and .version=="3.3.1" and
  .identity.installation==$installation and .identity.instance=="paperless" and
  (.files | has("export/manifest.json"))' bartl-manifest.json
jq -r '.files | to_entries[] | "\(.value.sha256)  \(.key)"' bartl-manifest.json \
  > /root/bartl-reference/paperless-members.sha256
sha256sum --check /root/bartl-reference/paperless-members.sha256
for name in baseline recovered; do
  expected=$(sha256sum "/root/bartl-reference/paperless/$name.pdf" | cut -d ' ' -f 1)
  jq -r --arg hash "$expected" '.files | to_entries[] |
    select(.value.sha256==$hash) | .key' bartl-manifest.json \
    > /root/bartl-reference/paperless-matching-members
  test -s /root/bartl-reference/paperless-matching-members
  while IFS= read -r member; do
    cmp "/root/bartl-reference/paperless/$name.pdf" "$member"
  done < /root/bartl-reference/paperless-matching-members
done
jq -e '[.. | objects | .title? // empty] | index("Synthetic Recovered") != null' export/manifest.json
exit
```

The layout is owned by Paperless's [native capture/reconstruction procedure](https://github.com/bartlapp/bartl-paperless/blob/main/runtime/native.py), not a common Bartl backup format. Require manifest hashes, both original PDFs and the new document's exported title to pass. This proves content in the subsequent point; the earlier restored-service checks prove application behavior. Remove plaintext restore outputs when the run's data-disposition decision permits it, and return to the Paperless checkpoint in this chapter.
