# Recover on C and return the service to use

Complete [source acceptance](verification.md). A remains available, B is the source and C the empty replacement. All retained intent stays in `VALUES`; source and candidate share stable service identity but have distinct deployment IDs. This is planned interruption, not provider-loss fencing.

```bash
source "${WORK_DIR:?}/operations/workstation.env"
```

## Select and apply retained targets

Every block below derives its target and recorded intent directly from VALUES after package preparation. No additional installer or orchestration script is required.


After each operation, require both `status.observedGeneration` and the requested condition's `observedGeneration` to match `metadata.generation` using `current_condition`. A wait alone can accept stale status. Stop on timeout/failure; timeout does not stop server-side work. Retain diagnostics, not failure-marker deletion or forced finalizer/lock removal.

## Publish first backups and exercise operation

Use the package-owned capture interfaces below. Labels retain separate source, final, recovered and reinstalled point identities; never overwrite a final-point record with another capture.

```bash
for DEPLOYMENT in keycloak forgejo; do
  label=source
  export DEPLOYMENT
  INSTANCE=$(yq -er '.deployments[strenv(DEPLOYMENT)].instance' "$VALUES")
  CLUSTER=$(yq -er '.deployments[strenv(DEPLOYMENT)].cluster' "$VALUES")
  NS=$(yq -er '.deployments[strenv(DEPLOYMENT)].namespace' "$VALUES")
  RELEASE=$(yq -er '.deployments[strenv(DEPLOYMENT)].release' "$VALUES")
  PACKAGE=$(yq -er '.deployments[strenv(DEPLOYMENT)].package' "$VALUES")
  export INSTANCE CLUSTER PACKAGE
  CTX=$(yq -er '.clusters[strenv(CLUSTER)].kubeconfig.context' "$VALUES")
  VERSION=$(yq -er '.packages[strenv(PACKAGE)].version' "$VALUES")
  CHART="$WORK_DIR/packages/bartl-$INSTANCE-$VERSION.tgz"
  export KUBECONFIG="$WORK_DIR/clusters/$CLUSTER/base/kubeconfig"
  kubectl config get-contexts "$CTX" -o name | jq -Re --arg ctx "$CTX" '.==$ctx' >/dev/null
  TARGET_ARGS=(--set-string "instance=$INSTANCE" --set-string "services.${INSTANCE//./\\.}.release=$VERSION")
  case "$INSTANCE" in
    keycloak) mappings='replicas:application.replicas ingressEnabled:ingress.enabled maintenance:ingress.maintenance backupSuspend:backup.suspend' ;;
    forgejo) mappings='replicas:replicas ingressEnabled:ingress.enabled version:version hostname:hostname' ;;
    restic) mappings='replicas:replicas' ;;
    *) printf 'Unsupported reference instance\n' >&2; exit 1 ;;
  esac
  for mapping in $mappings; do
    key=${mapping%%:*}; field=${mapping#*:}
    if KEY="$key" yq -e '.operations.deployments[strenv(DEPLOYMENT)] | has(strenv(KEY))' "$VALUES" >/dev/null; then
      value=$(KEY="$key" yq -r '.operations.deployments[strenv(DEPLOYMENT)][strenv(KEY)]' "$VALUES")
      case "$key" in version|hostname) TARGET_ARGS+=(--set-string "services.${INSTANCE//./\\.}.$field=$value") ;;
        *) TARGET_ARGS+=(--set "services.${INSTANCE//./\\.}.$field=$value") ;; esac
    fi
  done
  request="$label-$(date -u +%Y%m%dT%H%M%SZ)"
  result="$WORK_DIR/evidence/$INSTANCE-$label-backup.json"
  case "$INSTANCE" in
    keycloak)
      kubectl --context "$CTX" -n "$NS" create job "$request" --from=cronjob/keycloak-backup
      kubectl --context "$CTX" -n "$NS" wait "job/$request" --for=condition=complete --timeout=30m
      kubectl --context "$CTX" -n "$NS" logs "job/$request" -c backup > "$result"
      snapshot=$(jq -er '.snapshotID | select(test("^[a-f0-9]{64}$"))' "$result")
      ;;
    forgejo)
      kubectl --context "$CTX" -n "$NS" annotate forgejoapplication forgejo \
        forgejo.bartl.sh/backup-request="$request" --overwrite
      kubectl --context "$CTX" -n "$NS" wait forgejoapplication/forgejo \
        --for=jsonpath='{.status.backup.request}'="$request" --timeout=20m
      kubectl --context "$CTX" -n "$NS" wait forgejoapplication/forgejo \
        --for=jsonpath='{.status.backup.success}'=true --timeout=20m
      kubectl --context "$CTX" -n "$NS" get forgejoapplication/forgejo -o json |
        jq -e --arg request "$request" '.status.backup | select(.request==$request and .success==true)' > "$result"
      snapshot=$(jq -er '.snapshot | select(test("^[a-f0-9]{64}$"))' "$result")
      ;;
    *) exit 1 ;;
  esac
  LABEL="$label" SNAPSHOT="$snapshot" yq -i '
    .operations.recovery.points[strenv(LABEL)][strenv(INSTANCE)] = {
      "deployment":strenv(DEPLOYMENT),"snapshot":strenv(SNAPSHOT)}
  ' "$VALUES"
done
```

For restart without backup access, record `.operations.deployments.restic.replicas=0`, apply `DEPLOYMENT=restic` and require current-generation Stopped. Restart the existing Keycloak and Forgejo serving Deployments on B through their documented native restart procedure. Require usable existing data and native login without backup access, then record Restic replicas 1, reapply and require Ready. Do not interpret this as recovery without independently retained inputs.

```bash
yq -i '.operations.deployments.restic.replicas = 0' "$VALUES"
DEPLOYMENT=restic
export DEPLOYMENT
INSTANCE=$(yq -er '.deployments[strenv(DEPLOYMENT)].instance' "$VALUES")
CLUSTER=$(yq -er '.deployments[strenv(DEPLOYMENT)].cluster' "$VALUES")
NS=$(yq -er '.deployments[strenv(DEPLOYMENT)].namespace' "$VALUES")
RELEASE=$(yq -er '.deployments[strenv(DEPLOYMENT)].release' "$VALUES")
PACKAGE=$(yq -er '.deployments[strenv(DEPLOYMENT)].package' "$VALUES")
export INSTANCE CLUSTER PACKAGE
CTX=$(yq -er '.clusters[strenv(CLUSTER)].kubeconfig.context' "$VALUES")
VERSION=$(yq -er '.packages[strenv(PACKAGE)].version' "$VALUES")
CHART="$WORK_DIR/packages/bartl-$INSTANCE-$VERSION.tgz"
export KUBECONFIG="$WORK_DIR/clusters/$CLUSTER/base/kubeconfig"
kubectl config get-contexts "$CTX" -o name | jq -Re --arg ctx "$CTX" '.==$ctx' >/dev/null
TARGET_ARGS=(--set-string "instance=$INSTANCE" --set-string "services.${INSTANCE//./\\.}.release=$VERSION")
case "$INSTANCE" in
  keycloak) mappings='replicas:application.replicas ingressEnabled:ingress.enabled maintenance:ingress.maintenance backupSuspend:backup.suspend' ;;
  forgejo) mappings='replicas:replicas ingressEnabled:ingress.enabled version:version hostname:hostname' ;;
  restic) mappings='replicas:replicas' ;;
  *) printf 'Unsupported reference instance\n' >&2; exit 1 ;;
esac
for mapping in $mappings; do
  key=${mapping%%:*}; field=${mapping#*:}
  if KEY="$key" yq -e '.operations.deployments[strenv(DEPLOYMENT)] | has(strenv(KEY))' "$VALUES" >/dev/null; then
    value=$(KEY="$key" yq -r '.operations.deployments[strenv(DEPLOYMENT)][strenv(KEY)]' "$VALUES")
    case "$key" in version|hostname) TARGET_ARGS+=(--set-string "services.${INSTANCE//./\\.}.$field=$value") ;;
      *) TARGET_ARGS+=(--set "services.${INSTANCE//./\\.}.$field=$value") ;; esac
  fi
done
helm upgrade --install "$RELEASE" "$CHART" --kube-context "$CTX" -n "$NS" \
  -f "$VALUES" "${TARGET_ARGS[@]}"
GEN=$(kubectl --kubeconfig "$KA" -n backup get resticapplication/backup-restic -o jsonpath='{.metadata.generation}')
kubectl --kubeconfig "$KA" -n backup wait resticapplication/backup-restic --for=jsonpath='{.status.observedGeneration}'="$GEN" --timeout=20m
kubectl --kubeconfig "$KA" -n backup wait resticapplication/backup-restic --for=condition=Stopped --timeout=20m
current_condition "$KA" backup resticapplication/backup-restic Stopped
for instance in keycloak forgejo; do
  kubectl --kubeconfig "$KB" -n "$instance" rollout restart "deployment/$instance"
  kubectl --kubeconfig "$KB" -n "$instance" rollout status "deployment/$instance" --timeout=10m
done
yq -i '.operations.deployments.restic.replicas = 1' "$VALUES"
DEPLOYMENT=restic
export DEPLOYMENT
INSTANCE=$(yq -er '.deployments[strenv(DEPLOYMENT)].instance' "$VALUES")
CLUSTER=$(yq -er '.deployments[strenv(DEPLOYMENT)].cluster' "$VALUES")
NS=$(yq -er '.deployments[strenv(DEPLOYMENT)].namespace' "$VALUES")
RELEASE=$(yq -er '.deployments[strenv(DEPLOYMENT)].release' "$VALUES")
PACKAGE=$(yq -er '.deployments[strenv(DEPLOYMENT)].package' "$VALUES")
export INSTANCE CLUSTER PACKAGE
CTX=$(yq -er '.clusters[strenv(CLUSTER)].kubeconfig.context' "$VALUES")
VERSION=$(yq -er '.packages[strenv(PACKAGE)].version' "$VALUES")
CHART="$WORK_DIR/packages/bartl-$INSTANCE-$VERSION.tgz"
export KUBECONFIG="$WORK_DIR/clusters/$CLUSTER/base/kubeconfig"
kubectl config get-contexts "$CTX" -o name | jq -Re --arg ctx "$CTX" '.==$ctx' >/dev/null
TARGET_ARGS=(--set-string "instance=$INSTANCE" --set-string "services.${INSTANCE//./\\.}.release=$VERSION")
case "$INSTANCE" in
  keycloak) mappings='replicas:application.replicas ingressEnabled:ingress.enabled maintenance:ingress.maintenance backupSuspend:backup.suspend' ;;
  forgejo) mappings='replicas:replicas ingressEnabled:ingress.enabled version:version hostname:hostname' ;;
  restic) mappings='replicas:replicas' ;;
  *) printf 'Unsupported reference instance\n' >&2; exit 1 ;;
esac
for mapping in $mappings; do
  key=${mapping%%:*}; field=${mapping#*:}
  if KEY="$key" yq -e '.operations.deployments[strenv(DEPLOYMENT)] | has(strenv(KEY))' "$VALUES" >/dev/null; then
    value=$(KEY="$key" yq -r '.operations.deployments[strenv(DEPLOYMENT)][strenv(KEY)]' "$VALUES")
    case "$key" in version|hostname) TARGET_ARGS+=(--set-string "services.${INSTANCE//./\\.}.$field=$value") ;;
      *) TARGET_ARGS+=(--set "services.${INSTANCE//./\\.}.$field=$value") ;; esac
  fi
done
helm upgrade --install "$RELEASE" "$CHART" --kube-context "$CTX" -n "$NS" \
  -f "$VALUES" "${TARGET_ARGS[@]}"
GEN=$(kubectl --kubeconfig "$KA" -n backup get resticapplication/backup-restic -o jsonpath='{.metadata.generation}')
kubectl --kubeconfig "$KA" -n backup wait resticapplication/backup-restic --for=jsonpath='{.status.observedGeneration}'="$GEN" --timeout=20m
kubectl --kubeconfig "$KA" -n backup wait resticapplication/backup-restic --for=condition=Ready --timeout=20m
current_condition "$KA" backup resticapplication/backup-restic Ready
```

Exercise stop/start through the package interfaces, not direct workload scaling. Record source Forgejo replicas 0, apply and require Stopped; do the same for Keycloak. Then record replicas 1 and apply Keycloak before Forgejo; require current-generation Ready and normal useful access. Every change above is retained in `operations.deployments`, not an unrecorded `--set`.

```bash
for DEPLOYMENT in forgejo keycloak; do
  DEPLOYMENT="$DEPLOYMENT" yq -i '.operations.deployments[strenv(DEPLOYMENT)].replicas = 0' "$VALUES"
  export DEPLOYMENT
  INSTANCE=$(yq -er '.deployments[strenv(DEPLOYMENT)].instance' "$VALUES")
  CLUSTER=$(yq -er '.deployments[strenv(DEPLOYMENT)].cluster' "$VALUES")
  NS=$(yq -er '.deployments[strenv(DEPLOYMENT)].namespace' "$VALUES")
  RELEASE=$(yq -er '.deployments[strenv(DEPLOYMENT)].release' "$VALUES")
  PACKAGE=$(yq -er '.deployments[strenv(DEPLOYMENT)].package' "$VALUES")
  export INSTANCE CLUSTER PACKAGE
  CTX=$(yq -er '.clusters[strenv(CLUSTER)].kubeconfig.context' "$VALUES")
  VERSION=$(yq -er '.packages[strenv(PACKAGE)].version' "$VALUES")
  CHART="$WORK_DIR/packages/bartl-$INSTANCE-$VERSION.tgz"
  export KUBECONFIG="$WORK_DIR/clusters/$CLUSTER/base/kubeconfig"
  kubectl config get-contexts "$CTX" -o name | jq -Re --arg ctx "$CTX" '.==$ctx' >/dev/null
  TARGET_ARGS=(--set-string "instance=$INSTANCE" --set-string "services.${INSTANCE//./\\.}.release=$VERSION")
  case "$INSTANCE" in
    keycloak) mappings='replicas:application.replicas ingressEnabled:ingress.enabled maintenance:ingress.maintenance backupSuspend:backup.suspend' ;;
    forgejo) mappings='replicas:replicas ingressEnabled:ingress.enabled version:version hostname:hostname' ;;
    restic) mappings='replicas:replicas' ;;
    *) printf 'Unsupported reference instance\n' >&2; exit 1 ;;
  esac
  for mapping in $mappings; do
    key=${mapping%%:*}; field=${mapping#*:}
    if KEY="$key" yq -e '.operations.deployments[strenv(DEPLOYMENT)] | has(strenv(KEY))' "$VALUES" >/dev/null; then
      value=$(KEY="$key" yq -r '.operations.deployments[strenv(DEPLOYMENT)][strenv(KEY)]' "$VALUES")
      case "$key" in version|hostname) TARGET_ARGS+=(--set-string "services.${INSTANCE//./\\.}.$field=$value") ;;
        *) TARGET_ARGS+=(--set "services.${INSTANCE//./\\.}.$field=$value") ;; esac
    fi
  done
  helm upgrade --install "$RELEASE" "$CHART" --kube-context "$CTX" -n "$NS" \
    -f "$VALUES" "${TARGET_ARGS[@]}"
  GEN=$(kubectl --kubeconfig "$KUBECONFIG" -n "$NS" get "${INSTANCE}application/$INSTANCE" -o jsonpath='{.metadata.generation}')
  kubectl --kubeconfig "$KUBECONFIG" -n "$NS" wait "${INSTANCE}application/$INSTANCE" --for=jsonpath='{.status.observedGeneration}'="$GEN" --timeout=20m
  kubectl --kubeconfig "$KUBECONFIG" -n "$NS" wait "${INSTANCE}application/$INSTANCE" --for=condition=Stopped --timeout=20m
  current_condition "$KUBECONFIG" "$NS" "${INSTANCE}application/$INSTANCE" Stopped
done
for DEPLOYMENT in keycloak forgejo; do
  DEPLOYMENT="$DEPLOYMENT" yq -i '.operations.deployments[strenv(DEPLOYMENT)].replicas = 1' "$VALUES"
  export DEPLOYMENT
  INSTANCE=$(yq -er '.deployments[strenv(DEPLOYMENT)].instance' "$VALUES")
  CLUSTER=$(yq -er '.deployments[strenv(DEPLOYMENT)].cluster' "$VALUES")
  NS=$(yq -er '.deployments[strenv(DEPLOYMENT)].namespace' "$VALUES")
  RELEASE=$(yq -er '.deployments[strenv(DEPLOYMENT)].release' "$VALUES")
  PACKAGE=$(yq -er '.deployments[strenv(DEPLOYMENT)].package' "$VALUES")
  export INSTANCE CLUSTER PACKAGE
  CTX=$(yq -er '.clusters[strenv(CLUSTER)].kubeconfig.context' "$VALUES")
  VERSION=$(yq -er '.packages[strenv(PACKAGE)].version' "$VALUES")
  CHART="$WORK_DIR/packages/bartl-$INSTANCE-$VERSION.tgz"
  export KUBECONFIG="$WORK_DIR/clusters/$CLUSTER/base/kubeconfig"
  kubectl config get-contexts "$CTX" -o name | jq -Re --arg ctx "$CTX" '.==$ctx' >/dev/null
  TARGET_ARGS=(--set-string "instance=$INSTANCE" --set-string "services.${INSTANCE//./\\.}.release=$VERSION")
  case "$INSTANCE" in
    keycloak) mappings='replicas:application.replicas ingressEnabled:ingress.enabled maintenance:ingress.maintenance backupSuspend:backup.suspend' ;;
    forgejo) mappings='replicas:replicas ingressEnabled:ingress.enabled version:version hostname:hostname' ;;
    restic) mappings='replicas:replicas' ;;
    *) printf 'Unsupported reference instance\n' >&2; exit 1 ;;
  esac
  for mapping in $mappings; do
    key=${mapping%%:*}; field=${mapping#*:}
    if KEY="$key" yq -e '.operations.deployments[strenv(DEPLOYMENT)] | has(strenv(KEY))' "$VALUES" >/dev/null; then
      value=$(KEY="$key" yq -r '.operations.deployments[strenv(DEPLOYMENT)][strenv(KEY)]' "$VALUES")
      case "$key" in version|hostname) TARGET_ARGS+=(--set-string "services.${INSTANCE//./\\.}.$field=$value") ;;
        *) TARGET_ARGS+=(--set "services.${INSTANCE//./\\.}.$field=$value") ;; esac
    fi
  done
  helm upgrade --install "$RELEASE" "$CHART" --kube-context "$CTX" -n "$NS" \
    -f "$VALUES" "${TARGET_ARGS[@]}"
  GEN=$(kubectl --kubeconfig "$KUBECONFIG" -n "$NS" get "${INSTANCE}application/$INSTANCE" -o jsonpath='{.metadata.generation}')
  kubectl --kubeconfig "$KUBECONFIG" -n "$NS" wait "${INSTANCE}application/$INSTANCE" --for=jsonpath='{.status.observedGeneration}'="$GEN" --timeout=20m
  kubectl --kubeconfig "$KUBECONFIG" -n "$NS" wait "${INSTANCE}application/$INSTANCE" --for=condition=Ready --timeout=20m
  current_condition "$KUBECONFIG" "$NS" "${INSTANCE}application/$INSTANCE" Ready
done
```

The historical walkthrough upgraded Restic/Keycloak package versions before recovery. Do not run its old flat-interface upgrade commands against these charts. For an authorized supported chart upgrade, retain a distinct package entry, point only the selected deployment at it, acquire/checksum the archive, apply the package's CRD upgrade procedure (Helm does not upgrade CRDs automatically), reapply `VALUES` and check current-generation/package status. This exercise's native Forgejo 16.0.7 to 17.0.1 replacement remains below; it does not imply arbitrary cross-interface upgrades are supported.

## Close writes, capture final state and retire B

Arrange the accepted interruption and data-loss boundary first. Stop user/configuration changes, withdraw source Forgejo HTTP and direct SSH access including existing connections, and close identity changes. Background effects are disabled in this profile. Mere DNS changes do not stop writes. Record source routing disabled and use the package's planned-promotion procedure to enforce all paths before final capture.

```bash
yq -i '.operations.deployments.forgejo.ingressEnabled = false' "$VALUES"
DEPLOYMENT=forgejo
export DEPLOYMENT
INSTANCE=$(yq -er '.deployments[strenv(DEPLOYMENT)].instance' "$VALUES")
CLUSTER=$(yq -er '.deployments[strenv(DEPLOYMENT)].cluster' "$VALUES")
NS=$(yq -er '.deployments[strenv(DEPLOYMENT)].namespace' "$VALUES")
RELEASE=$(yq -er '.deployments[strenv(DEPLOYMENT)].release' "$VALUES")
PACKAGE=$(yq -er '.deployments[strenv(DEPLOYMENT)].package' "$VALUES")
export INSTANCE CLUSTER PACKAGE
CTX=$(yq -er '.clusters[strenv(CLUSTER)].kubeconfig.context' "$VALUES")
VERSION=$(yq -er '.packages[strenv(PACKAGE)].version' "$VALUES")
CHART="$WORK_DIR/packages/bartl-$INSTANCE-$VERSION.tgz"
export KUBECONFIG="$WORK_DIR/clusters/$CLUSTER/base/kubeconfig"
kubectl config get-contexts "$CTX" -o name | jq -Re --arg ctx "$CTX" '.==$ctx' >/dev/null
TARGET_ARGS=(--set-string "instance=$INSTANCE" --set-string "services.${INSTANCE//./\\.}.release=$VERSION")
case "$INSTANCE" in
  keycloak) mappings='replicas:application.replicas ingressEnabled:ingress.enabled maintenance:ingress.maintenance backupSuspend:backup.suspend' ;;
  forgejo) mappings='replicas:replicas ingressEnabled:ingress.enabled version:version hostname:hostname' ;;
  restic) mappings='replicas:replicas' ;;
  *) printf 'Unsupported reference instance\n' >&2; exit 1 ;;
esac
for mapping in $mappings; do
  key=${mapping%%:*}; field=${mapping#*:}
  if KEY="$key" yq -e '.operations.deployments[strenv(DEPLOYMENT)] | has(strenv(KEY))' "$VALUES" >/dev/null; then
    value=$(KEY="$key" yq -r '.operations.deployments[strenv(DEPLOYMENT)][strenv(KEY)]' "$VALUES")
    case "$key" in version|hostname) TARGET_ARGS+=(--set-string "services.${INSTANCE//./\\.}.$field=$value") ;;
      *) TARGET_ARGS+=(--set "services.${INSTANCE//./\\.}.$field=$value") ;; esac
  fi
done
helm upgrade --install "$RELEASE" "$CHART" --kube-context "$CTX" -n "$NS" \
  -f "$VALUES" "${TARGET_ARGS[@]}"
kubectl --context "$CTX" -n "$NS" delete service forgejo-ssh --ignore-not-found
label=final
export DEPLOYMENT
INSTANCE=$(yq -er '.deployments[strenv(DEPLOYMENT)].instance' "$VALUES")
CLUSTER=$(yq -er '.deployments[strenv(DEPLOYMENT)].cluster' "$VALUES")
NS=$(yq -er '.deployments[strenv(DEPLOYMENT)].namespace' "$VALUES")
RELEASE=$(yq -er '.deployments[strenv(DEPLOYMENT)].release' "$VALUES")
PACKAGE=$(yq -er '.deployments[strenv(DEPLOYMENT)].package' "$VALUES")
export INSTANCE CLUSTER PACKAGE
CTX=$(yq -er '.clusters[strenv(CLUSTER)].kubeconfig.context' "$VALUES")
VERSION=$(yq -er '.packages[strenv(PACKAGE)].version' "$VALUES")
CHART="$WORK_DIR/packages/bartl-$INSTANCE-$VERSION.tgz"
export KUBECONFIG="$WORK_DIR/clusters/$CLUSTER/base/kubeconfig"
kubectl config get-contexts "$CTX" -o name | jq -Re --arg ctx "$CTX" '.==$ctx' >/dev/null
TARGET_ARGS=(--set-string "instance=$INSTANCE" --set-string "services.${INSTANCE//./\\.}.release=$VERSION")
case "$INSTANCE" in
  keycloak) mappings='replicas:application.replicas ingressEnabled:ingress.enabled maintenance:ingress.maintenance backupSuspend:backup.suspend' ;;
  forgejo) mappings='replicas:replicas ingressEnabled:ingress.enabled version:version hostname:hostname' ;;
  restic) mappings='replicas:replicas' ;;
  *) printf 'Unsupported reference instance\n' >&2; exit 1 ;;
esac
for mapping in $mappings; do
  key=${mapping%%:*}; field=${mapping#*:}
  if KEY="$key" yq -e '.operations.deployments[strenv(DEPLOYMENT)] | has(strenv(KEY))' "$VALUES" >/dev/null; then
    value=$(KEY="$key" yq -r '.operations.deployments[strenv(DEPLOYMENT)][strenv(KEY)]' "$VALUES")
    case "$key" in version|hostname) TARGET_ARGS+=(--set-string "services.${INSTANCE//./\\.}.$field=$value") ;;
      *) TARGET_ARGS+=(--set "services.${INSTANCE//./\\.}.$field=$value") ;; esac
  fi
done
request="$label-$(date -u +%Y%m%dT%H%M%SZ)"
result="$WORK_DIR/evidence/$INSTANCE-$label-backup.json"
case "$INSTANCE" in
  keycloak)
    kubectl --context "$CTX" -n "$NS" create job "$request" --from=cronjob/keycloak-backup
    kubectl --context "$CTX" -n "$NS" wait "job/$request" --for=condition=complete --timeout=30m
    kubectl --context "$CTX" -n "$NS" logs "job/$request" -c backup > "$result"
    snapshot=$(jq -er '.snapshotID | select(test("^[a-f0-9]{64}$"))' "$result")
    ;;
  forgejo)
    kubectl --context "$CTX" -n "$NS" annotate forgejoapplication forgejo \
      forgejo.bartl.sh/backup-request="$request" --overwrite
    kubectl --context "$CTX" -n "$NS" wait forgejoapplication/forgejo \
      --for=jsonpath='{.status.backup.request}'="$request" --timeout=20m
    kubectl --context "$CTX" -n "$NS" wait forgejoapplication/forgejo \
      --for=jsonpath='{.status.backup.success}'=true --timeout=20m
    kubectl --context "$CTX" -n "$NS" get forgejoapplication/forgejo -o json |
      jq -e --arg request "$request" '.status.backup | select(.request==$request and .success==true)' > "$result"
    snapshot=$(jq -er '.snapshot | select(test("^[a-f0-9]{64}$"))' "$result")
    ;;
  *) exit 1 ;;
esac
LABEL="$label" SNAPSHOT="$snapshot" yq -i '
  .operations.recovery.points[strenv(LABEL)][strenv(INSTANCE)] = {
    "deployment":strenv(DEPLOYMENT),"snapshot":strenv(SNAPSHOT)}
' "$VALUES"
```

The chart may recreate SSH routing on later reapply: keep firewall admission withdrawn through retirement and confirm no existing write connection remains. Request the final Forgejo capture through the block above with a fresh `final-...` request; require matching request, successful publication and snapshot ID. Record that final point separately. Complete Keycloak's documented final-write closure and manual backup, retaining its successful point. These are two coordinated application points, not an atomic stack snapshot.

```bash
yq -i '
  .operations.deployments.forgejo.replicas = 0 |
  .operations.deployments.forgejo.ingressEnabled = false |
  .operations.deployments.keycloak.replicas = 0 |
  .operations.deployments.keycloak.ingressEnabled = false |
  .operations.deployments.keycloak.backupSuspend = true
' "$VALUES"
for DEPLOYMENT in forgejo keycloak; do
  export DEPLOYMENT
  INSTANCE=$(yq -er '.deployments[strenv(DEPLOYMENT)].instance' "$VALUES")
  CLUSTER=$(yq -er '.deployments[strenv(DEPLOYMENT)].cluster' "$VALUES")
  NS=$(yq -er '.deployments[strenv(DEPLOYMENT)].namespace' "$VALUES")
  RELEASE=$(yq -er '.deployments[strenv(DEPLOYMENT)].release' "$VALUES")
  PACKAGE=$(yq -er '.deployments[strenv(DEPLOYMENT)].package' "$VALUES")
  export INSTANCE CLUSTER PACKAGE
  CTX=$(yq -er '.clusters[strenv(CLUSTER)].kubeconfig.context' "$VALUES")
  VERSION=$(yq -er '.packages[strenv(PACKAGE)].version' "$VALUES")
  CHART="$WORK_DIR/packages/bartl-$INSTANCE-$VERSION.tgz"
  export KUBECONFIG="$WORK_DIR/clusters/$CLUSTER/base/kubeconfig"
  kubectl config get-contexts "$CTX" -o name | jq -Re --arg ctx "$CTX" '.==$ctx' >/dev/null
  TARGET_ARGS=(--set-string "instance=$INSTANCE" --set-string "services.${INSTANCE//./\\.}.release=$VERSION")
  case "$INSTANCE" in
    keycloak) mappings='replicas:application.replicas ingressEnabled:ingress.enabled maintenance:ingress.maintenance backupSuspend:backup.suspend' ;;
    forgejo) mappings='replicas:replicas ingressEnabled:ingress.enabled version:version hostname:hostname' ;;
    restic) mappings='replicas:replicas' ;;
    *) printf 'Unsupported reference instance\n' >&2; exit 1 ;;
  esac
  for mapping in $mappings; do
    key=${mapping%%:*}; field=${mapping#*:}
    if KEY="$key" yq -e '.operations.deployments[strenv(DEPLOYMENT)] | has(strenv(KEY))' "$VALUES" >/dev/null; then
      value=$(KEY="$key" yq -r '.operations.deployments[strenv(DEPLOYMENT)][strenv(KEY)]' "$VALUES")
      case "$key" in version|hostname) TARGET_ARGS+=(--set-string "services.${INSTANCE//./\\.}.$field=$value") ;;
        *) TARGET_ARGS+=(--set "services.${INSTANCE//./\\.}.$field=$value") ;; esac
    fi
  done
  helm upgrade --install "$RELEASE" "$CHART" --kube-context "$CTX" -n "$NS" \
    -f "$VALUES" "${TARGET_ARGS[@]}"
  GEN=$(kubectl --kubeconfig "$KUBECONFIG" -n "$NS" get "${INSTANCE}application/$INSTANCE" -o jsonpath='{.metadata.generation}')
  kubectl --kubeconfig "$KUBECONFIG" -n "$NS" wait "${INSTANCE}application/$INSTANCE" --for=jsonpath='{.status.observedGeneration}'="$GEN" --timeout=20m
  kubectl --kubeconfig "$KUBECONFIG" -n "$NS" wait "${INSTANCE}application/$INSTANCE" --for=condition=Stopped --timeout=20m
  current_condition "$KUBECONFIG" "$NS" "${INSTANCE}application/$INSTANCE" Stopped
done
DEPLOYMENT=keycloak
label=final
export DEPLOYMENT
INSTANCE=$(yq -er '.deployments[strenv(DEPLOYMENT)].instance' "$VALUES")
CLUSTER=$(yq -er '.deployments[strenv(DEPLOYMENT)].cluster' "$VALUES")
NS=$(yq -er '.deployments[strenv(DEPLOYMENT)].namespace' "$VALUES")
RELEASE=$(yq -er '.deployments[strenv(DEPLOYMENT)].release' "$VALUES")
PACKAGE=$(yq -er '.deployments[strenv(DEPLOYMENT)].package' "$VALUES")
export INSTANCE CLUSTER PACKAGE
CTX=$(yq -er '.clusters[strenv(CLUSTER)].kubeconfig.context' "$VALUES")
VERSION=$(yq -er '.packages[strenv(PACKAGE)].version' "$VALUES")
CHART="$WORK_DIR/packages/bartl-$INSTANCE-$VERSION.tgz"
export KUBECONFIG="$WORK_DIR/clusters/$CLUSTER/base/kubeconfig"
kubectl config get-contexts "$CTX" -o name | jq -Re --arg ctx "$CTX" '.==$ctx' >/dev/null
TARGET_ARGS=(--set-string "instance=$INSTANCE" --set-string "services.${INSTANCE//./\\.}.release=$VERSION")
case "$INSTANCE" in
  keycloak) mappings='replicas:application.replicas ingressEnabled:ingress.enabled maintenance:ingress.maintenance backupSuspend:backup.suspend' ;;
  forgejo) mappings='replicas:replicas ingressEnabled:ingress.enabled version:version hostname:hostname' ;;
  restic) mappings='replicas:replicas' ;;
  *) printf 'Unsupported reference instance\n' >&2; exit 1 ;;
esac
for mapping in $mappings; do
  key=${mapping%%:*}; field=${mapping#*:}
  if KEY="$key" yq -e '.operations.deployments[strenv(DEPLOYMENT)] | has(strenv(KEY))' "$VALUES" >/dev/null; then
    value=$(KEY="$key" yq -r '.operations.deployments[strenv(DEPLOYMENT)][strenv(KEY)]' "$VALUES")
    case "$key" in version|hostname) TARGET_ARGS+=(--set-string "services.${INSTANCE//./\\.}.$field=$value") ;;
      *) TARGET_ARGS+=(--set "services.${INSTANCE//./\\.}.$field=$value") ;; esac
  fi
done
request="$label-$(date -u +%Y%m%dT%H%M%SZ)"
result="$WORK_DIR/evidence/$INSTANCE-$label-backup.json"
case "$INSTANCE" in
  keycloak)
    kubectl --context "$CTX" -n "$NS" create job "$request" --from=cronjob/keycloak-backup
    kubectl --context "$CTX" -n "$NS" wait "job/$request" --for=condition=complete --timeout=30m
    kubectl --context "$CTX" -n "$NS" logs "job/$request" -c backup > "$result"
    snapshot=$(jq -er '.snapshotID | select(test("^[a-f0-9]{64}$"))' "$result")
    ;;
  forgejo)
    kubectl --context "$CTX" -n "$NS" annotate forgejoapplication forgejo \
      forgejo.bartl.sh/backup-request="$request" --overwrite
    kubectl --context "$CTX" -n "$NS" wait forgejoapplication/forgejo \
      --for=jsonpath='{.status.backup.request}'="$request" --timeout=20m
    kubectl --context "$CTX" -n "$NS" wait forgejoapplication/forgejo \
      --for=jsonpath='{.status.backup.success}'=true --timeout=20m
    kubectl --context "$CTX" -n "$NS" get forgejoapplication/forgejo -o json |
      jq -e --arg request "$request" '.status.backup | select(.request==$request and .success==true)' > "$result"
    snapshot=$(jq -er '.snapshot | select(test("^[a-f0-9]{64}$"))' "$result")
    ;;
  *) exit 1 ;;
esac
LABEL="$label" SNAPSHOT="$snapshot" yq -i '
  .operations.recovery.points[strenv(LABEL)][strenv(INSTANCE)] = {
    "deployment":strenv(DEPLOYMENT),"snapshot":strenv(SNAPSHOT)}
' "$VALUES"
for instance in keycloak forgejo; do
  kubectl --kubeconfig "$KB" -n "$instance" get pvc -o json > "$WORK_DIR/evidence/$instance-source-pvc.json"
done
SOURCE_SERVER=$(yq -er '.clusters.b.observed.server.id' "$VALUES")
hcloud server describe "$SOURCE_SERVER" --output json | jq '{id,name,status,public_net}'
```

Before retiring B, retain the source-independent Keycloak handoff on the workstation. The final receipt and storage inventory were collected above while its API was available; native recovery credentials must already be independently retained.

```bash
export SOURCE_DEPLOYMENT=keycloak TARGET_DEPLOYMENT=keycloak-replacement
SOURCE_CLUSTER=$(yq -er '.deployments.keycloak.cluster' "$VALUES")
SOURCE_NS=$(yq -er '.deployments.keycloak.namespace' "$VALUES")
SOURCE_CTX=$(CLUSTER="$SOURCE_CLUSTER" yq -er '.clusters[strenv(CLUSTER)].kubeconfig.context' "$VALUES")
SOURCE_KUBECONFIG="$WORK_DIR/clusters/$SOURCE_CLUSTER/base/kubeconfig"
SOURCE_DIR="$WORK_DIR/clusters/$SOURCE_CLUSTER/applications/keycloak"
SOURCE_SNAPSHOT=$(jq -er '.snapshotID | select(test("^[a-f0-9]{64}$"))' "$WORK_DIR/evidence/keycloak-final-backup.json")
test -s "$SOURCE_DIR/recovery-admin/username"
test -s "$SOURCE_DIR/recovery-admin/password"
test -s "$SOURCE_DIR/credentials/database/username"
test -s "$SOURCE_DIR/credentials/database/database"
for role in reader writer; do
  for key in password username restPassword; do test -s "$SOURCE_DIR/repository/$role/$key"; done
done
cp "$WORK_DIR/evidence/keycloak-final-backup.json" "$SOURCE_DIR/backup-result.json"
cp "$WORK_DIR/evidence/keycloak-source-pvc.json" "$SOURCE_DIR/source-pvc.json"
jq -e '.items | length > 0' "$SOURCE_DIR/source-pvc.json"
```

Keep that directory, the same `VALUES`, chart archive and target base access usable with B powered off. No later target-preparation step may query B's Kubernetes API.

Match live ID/name/address to the retained B observations before poweroff. Confirm all final points are published and no capture remains pending. Then:

```bash
hcloud server poweroff "$SOURCE_SERVER"
hcloud server describe "$SOURCE_SERVER" --output json | jq -e '.status=="off"'
yq -i '.operations.recovery.sourceRetired = true | .operations.recovery.retirementMethod = "confirmed B poweroff; restart prohibited"' "$VALUES"
```

Keep B off and prevent unauthorized restart for the remainder of the run. If stop or identity is uncertain, do not promote. Unreachability alone is not retirement. No automatic return to B is permitted after candidate writes.

## Prepare isolated C and recover in dependency order

Use fresh empty state on C, never mount/copy source volumes. Preserve installation/instance identity, hostnames, Forgejo identity keys/host key, repository keys and the retained Keycloak recovery administrator. Restore protected inputs from independent custody into each package's target directory, not another values file. Keycloak may create new target database passwords through its documented replacement procedure; do not confuse these with stable native identity/repository keys.

```bash
yq -i '
  .operations.deployments."keycloak-replacement" = ({"replicas":1,"ingressEnabled":false,"maintenance":false,"backupSuspend":true} * (.operations.deployments."keycloak-replacement" // {})) |
  .operations.deployments."forgejo-replacement" = ({"replicas":1,"ingressEnabled":false,"version":"17.0.1"} * (.operations.deployments."forgejo-replacement" // {}))
' "$VALUES"
```


## Move hostnames while C stays restricted

Confirm the predecessor is off, live DNS still points to retained B, and candidate access is restricted at the firewall/ingress boundary. C needs HTTP-01 validation and usable restricted HTTPS/SSH from the administrator and A. Configure those rules through the base/package procedures, using C's retained firewall ID; do not open unrestricted access accidentally. Read every record before replacing its address:

First restrict C's public HTTPS while leaving HTTP available for ACME. Inspect its retained firewall attachment before modifying the identified rules; if a rule already has the requested state, verify it rather than repeating the mutation.

```bash
C_FIREWALL=$(yq -er '.clusters.c.observed.firewall.id' "$VALUES")
hcloud firewall describe "$C_FIREWALL"
hcloud firewall delete-rule "$C_FIREWALL" --direction in --protocol tcp --port 443 --source-ips 0.0.0.0/0,::/0
hcloud firewall add-rule "$C_FIREWALL" --direction in --protocol tcp --port 443 \
  --source-ips "$ADMIN_IP/32,$A_IP/32,$C_IP/32"
hcloud firewall add-rule "$C_FIREWALL" --direction in --protocol tcp --port 30222 \
  --source-ips "$ADMIN_IP/32,$A_IP/32"
```

Move the stable hostnames and wait for their public/authoritative C answers **before** invoking either package's certificate-dependent installation waits:

```bash
for host in "$KC_HOST" "$FORGEJO_HOST"; do
  subname=${host%.$DNS_ZONE}
  desec "$DNS_API/rrsets/$subname/A/" |
    jq -e --arg ip "$B_IP" '.records==[$ip] and .ttl==900'
  desec --request PATCH "$DNS_API/rrsets/$subname/A/" \
    --json "$(jq -nc --arg ip "$C_IP" '{records:[$ip],ttl:900}')"
  HOST="$host" IP="$C_IP" yq -i '.operations.dns[strenv(HOST)].address = strenv(IP)' "$VALUES"
done
sleep 900
for host in "$KC_HOST" "$FORGEJO_HOST"; do
  for resolver in ns1.desec.io ns2.desec.org 1.1.1.1 8.8.8.8; do
    dig @"$resolver" "$host" A +noall +comments +answer
  done
done
```

Require authoritative and public DNS answers for C before continuing. Reconstruct the retained Keycloak handoff without contacting B; this block also supports resuming a new workstation shell:

```bash
export SOURCE_DEPLOYMENT=keycloak TARGET_DEPLOYMENT=keycloak-replacement INSTANCE=keycloak
SOURCE_CLUSTER=$(yq -er '.deployments.keycloak.cluster' "$VALUES")
SOURCE_NS=$(yq -er '.deployments.keycloak.namespace' "$VALUES")
SOURCE_CTX=$(CLUSTER="$SOURCE_CLUSTER" yq -er '.clusters[strenv(CLUSTER)].kubeconfig.context' "$VALUES")
SOURCE_KUBECONFIG="$WORK_DIR/clusters/$SOURCE_CLUSTER/base/kubeconfig"
SOURCE_DIR="$WORK_DIR/clusters/$SOURCE_CLUSTER/applications/keycloak"
SOURCE_SNAPSHOT=$(jq -er '.snapshotID' "$SOURCE_DIR/backup-result.json")
TARGET_KUBECONFIG="$KC"
export DEPLOYMENT="$TARGET_DEPLOYMENT"
test -s "$SOURCE_DIR/source-pvc.json"
```

In the [Keycloak fresh-storage procedure](https://github.com/bartlapp/bartl-keycloak/blob/main/README.md#recover-onto-fresh-storage), execute **only** the target-preparation block immediately following “Prepare the independent namespace, database credentials, retained backup access and TLS”: it starts `DEPLOYMENT=$TARGET_DEPLOYMENT`. Execute through the closing subshell after its target certificate wait, stopping before `wait_application Ready`. Do **not** rerun that section's initial source-capture/source-stop blocks or its later source-Pod check: B is deliberately unavailable. The handoff above replaces those source dependencies. The target-only block prepares new database credentials, copies retained recovery/repository inputs, creates declared target Secrets and performs ordinary installation on C with the same `VALUES`.

Require current-generation readiness, the final snapshot and independent target storage using only C plus retained source evidence:

```bash
GEN=$(kubectl --kubeconfig "$KC" --context "$CTX" -n "$NS" get keycloakapplication/keycloak -o jsonpath='{.metadata.generation}')
kubectl --kubeconfig "$KC" --context "$CTX" -n "$NS" wait keycloakapplication/keycloak --for=jsonpath='{.status.observedGeneration}'="$GEN" --timeout=20m
kubectl --kubeconfig "$KC" --context "$CTX" -n "$NS" wait keycloakapplication/keycloak --for=condition=Ready --timeout=20m
current_condition "$KC" "$NS" keycloakapplication/keycloak Ready
kubectl --kubeconfig "$KC" --context "$CTX" -n "$NS" get keycloakapplication/keycloak -o json |
  jq -e --arg snapshot "$SOURCE_SNAPSHOT" '.status.operation.snapshot.id == $snapshot'
kubectl --kubeconfig "$KC" --context "$CTX" -n "$NS" get pvc -o json |
  jq -e --slurpfile source "$SOURCE_DIR/source-pvc.json" '
    (.items | length > 0) and all(.items[]; . as $target |
      all($source[0].items[]; .metadata.uid != $target.metadata.uid
        and .spec.volumeName != $target.spec.volumeName))'
```

Its work directory is `clusters/c/applications/keycloak/deployments/keycloak-replacement`. Keep the source intent stopped. Check recovered realm/user/client identities before relying on it; DNS alone never establishes source retirement.

Then select `DEPLOYMENT=forgejo-replacement` and execute Forgejo's retained-identity, storage, Secret/configuration preparation and ordinary install against independent claims. Its work directory is `clusters/c/applications/forgejo/deployments/forgejo-replacement`. Apply the recorded 17.0.1 native version during rendering and install. The package restores and migrates; no restore mode or second technical release command is allowed. Check native preparation version, current-generation Ready, preserved SSH key and recovered data. Keep candidate production HTTP/SSH access restricted until acceptance.

Require authoritative/public C answers and valid TLS. With network restrictions still enforced, record replacement `ingressEnabled=true` and apply Keycloak then Forgejo; verify their certificates and real endpoints. The effective Keycloak hostname must remain the declared stable issuer, not a workstation rewrite. Run [all recovered-data checks](verification.md#verify-the-same-data-after-recovery), including real browser login, permission boundary, preserved SSH identity, LFS, issue/attachment/package/release and new HTTP/SSH writes. Do not activate after a partial check.

```bash
yq -i '.operations.deployments."keycloak-replacement".ingressEnabled = true |
  .operations.deployments."forgejo-replacement".ingressEnabled = true' "$VALUES"
for DEPLOYMENT in keycloak-replacement forgejo-replacement; do
  export DEPLOYMENT
  INSTANCE=$(yq -er '.deployments[strenv(DEPLOYMENT)].instance' "$VALUES")
  CLUSTER=$(yq -er '.deployments[strenv(DEPLOYMENT)].cluster' "$VALUES")
  NS=$(yq -er '.deployments[strenv(DEPLOYMENT)].namespace' "$VALUES")
  RELEASE=$(yq -er '.deployments[strenv(DEPLOYMENT)].release' "$VALUES")
  PACKAGE=$(yq -er '.deployments[strenv(DEPLOYMENT)].package' "$VALUES")
  export INSTANCE CLUSTER PACKAGE
  CTX=$(yq -er '.clusters[strenv(CLUSTER)].kubeconfig.context' "$VALUES")
  VERSION=$(yq -er '.packages[strenv(PACKAGE)].version' "$VALUES")
  CHART="$WORK_DIR/packages/bartl-$INSTANCE-$VERSION.tgz"
  export KUBECONFIG="$WORK_DIR/clusters/$CLUSTER/base/kubeconfig"
  kubectl config get-contexts "$CTX" -o name | jq -Re --arg ctx "$CTX" '.==$ctx' >/dev/null
  TARGET_ARGS=(--set-string "instance=$INSTANCE" --set-string "services.${INSTANCE//./\\.}.release=$VERSION")
  case "$INSTANCE" in
    keycloak) mappings='replicas:application.replicas ingressEnabled:ingress.enabled maintenance:ingress.maintenance backupSuspend:backup.suspend' ;;
    forgejo) mappings='replicas:replicas ingressEnabled:ingress.enabled version:version hostname:hostname' ;;
    restic) mappings='replicas:replicas' ;;
    *) printf 'Unsupported reference instance\n' >&2; exit 1 ;;
  esac
  for mapping in $mappings; do
    key=${mapping%%:*}; field=${mapping#*:}
    if KEY="$key" yq -e '.operations.deployments[strenv(DEPLOYMENT)] | has(strenv(KEY))' "$VALUES" >/dev/null; then
      value=$(KEY="$key" yq -r '.operations.deployments[strenv(DEPLOYMENT)][strenv(KEY)]' "$VALUES")
      case "$key" in version|hostname) TARGET_ARGS+=(--set-string "services.${INSTANCE//./\\.}.$field=$value") ;;
        *) TARGET_ARGS+=(--set "services.${INSTANCE//./\\.}.$field=$value") ;; esac
    fi
  done
  helm upgrade --install "$RELEASE" "$CHART" --kube-context "$CTX" -n "$NS" \
    -f "$VALUES" "${TARGET_ARGS[@]}"
  GEN=$(kubectl --kubeconfig "$KUBECONFIG" -n "$NS" get "${INSTANCE}application/$INSTANCE" -o jsonpath='{.metadata.generation}')
  kubectl --kubeconfig "$KUBECONFIG" -n "$NS" wait "${INSTANCE}application/$INSTANCE" --for=jsonpath='{.status.observedGeneration}'="$GEN" --timeout=20m
  kubectl --kubeconfig "$KUBECONFIG" -n "$NS" wait "${INSTANCE}application/$INSTANCE" --for=condition=Ready --timeout=20m
  current_condition "$KUBECONFIG" "$NS" "${INSTANCE}application/$INSTANCE" Ready
done
kubectl --kubeconfig "$KC" -n keycloak wait certificate/keycloak-tls --for=condition=Ready --timeout=15m
kubectl --kubeconfig "$KC" -n forgejo wait certificate/forgejo-tls --for=condition=Ready --timeout=15m
POD=$(kubectl --kubeconfig "$KC" -n forgejo get pod -l forgejo.bartl.sh/role=app -o jsonpath='{.items[0].metadata.name}')
kubectl --kubeconfig "$KC" -n forgejo exec "$POD" -- cat /data/data/ssh/forgejo.ed25519.pub > "$WORK_DIR/evidence/forgejo-recovered-host-key.pub"
cmp "$WORK_DIR/evidence/forgejo-host-key.pub" "$WORK_DIR/evidence/forgejo-recovered-host-key.pub"
for instance in keycloak forgejo; do
  kubectl --kubeconfig "$KC" -n "$instance" get pvc -o json |
    jq -e --slurpfile source "$WORK_DIR/evidence/$instance-source-pvc.json" \
      'all(.items[]; . as $target | all($source[0].items[]; .metadata.uid!=$target.metadata.uid))'
done
```

## Reinstall Restic with retained state

Pause concurrent backup/restore/maintenance. Follow Restic's current stop/finalize/CR-delete/Helm-uninstall procedure for `DEPLOYMENT=restic`; keep its controller available until finalization completes. Retain its PVC, TLS and supplied repository Secrets/keys. Reinstall ordinarily from `VALUES` with the same retained target/package and replicas 1. Require current-generation Ready and authenticated reader access to both histories. Do not bypass historical finalizers or delete state to make reinstall work.

## Open C and back up new work

After acceptance, explicitly open intended production paths on C and retain the active deployment IDs and final-write boundary:

```bash
yq -i '
  .operations.deployments."keycloak-replacement".backupSuspend = false |
  .operations.recovery.active.keycloak = "keycloak-replacement" |
  .operations.recovery.active.forgejo = "forgejo-replacement"
' "$VALUES"
for DEPLOYMENT in keycloak-replacement forgejo-replacement; do
  export DEPLOYMENT
  INSTANCE=$(yq -er '.deployments[strenv(DEPLOYMENT)].instance' "$VALUES")
  CLUSTER=$(yq -er '.deployments[strenv(DEPLOYMENT)].cluster' "$VALUES")
  NS=$(yq -er '.deployments[strenv(DEPLOYMENT)].namespace' "$VALUES")
  RELEASE=$(yq -er '.deployments[strenv(DEPLOYMENT)].release' "$VALUES")
  PACKAGE=$(yq -er '.deployments[strenv(DEPLOYMENT)].package' "$VALUES")
  export INSTANCE CLUSTER PACKAGE
  CTX=$(yq -er '.clusters[strenv(CLUSTER)].kubeconfig.context' "$VALUES")
  VERSION=$(yq -er '.packages[strenv(PACKAGE)].version' "$VALUES")
  CHART="$WORK_DIR/packages/bartl-$INSTANCE-$VERSION.tgz"
  export KUBECONFIG="$WORK_DIR/clusters/$CLUSTER/base/kubeconfig"
  kubectl config get-contexts "$CTX" -o name | jq -Re --arg ctx "$CTX" '.==$ctx' >/dev/null
  TARGET_ARGS=(--set-string "instance=$INSTANCE" --set-string "services.${INSTANCE//./\\.}.release=$VERSION")
  case "$INSTANCE" in
    keycloak) mappings='replicas:application.replicas ingressEnabled:ingress.enabled maintenance:ingress.maintenance backupSuspend:backup.suspend' ;;
    forgejo) mappings='replicas:replicas ingressEnabled:ingress.enabled version:version hostname:hostname' ;;
    restic) mappings='replicas:replicas' ;;
    *) printf 'Unsupported reference instance\n' >&2; exit 1 ;;
  esac
  for mapping in $mappings; do
    key=${mapping%%:*}; field=${mapping#*:}
    if KEY="$key" yq -e '.operations.deployments[strenv(DEPLOYMENT)] | has(strenv(KEY))' "$VALUES" >/dev/null; then
      value=$(KEY="$key" yq -r '.operations.deployments[strenv(DEPLOYMENT)][strenv(KEY)]' "$VALUES")
      case "$key" in version|hostname) TARGET_ARGS+=(--set-string "services.${INSTANCE//./\\.}.$field=$value") ;;
        *) TARGET_ARGS+=(--set "services.${INSTANCE//./\\.}.$field=$value") ;; esac
    fi
  done
  helm upgrade --install "$RELEASE" "$CHART" --kube-context "$CTX" -n "$NS" \
    -f "$VALUES" "${TARGET_ARGS[@]}"
  GEN=$(kubectl --kubeconfig "$KUBECONFIG" -n "$NS" get "${INSTANCE}application/$INSTANCE" -o jsonpath='{.metadata.generation}')
  kubectl --kubeconfig "$KUBECONFIG" -n "$NS" wait "${INSTANCE}application/$INSTANCE" --for=jsonpath='{.status.observedGeneration}'="$GEN" --timeout=20m
  kubectl --kubeconfig "$KUBECONFIG" -n "$NS" wait "${INSTANCE}application/$INSTANCE" --for=condition=Ready --timeout=20m
  current_condition "$KUBECONFIG" "$NS" "${INSTANCE}application/$INSTANCE" Ready
done
```

Remove only the candidate validation restrictions now, through the corresponding package/base procedure. Leave B's stopped/routing-disabled intent intact. Publish and verify a subsequent backup from each recovered application after new work; record snapshot IDs and actual interruption/acceptance results. Do not treat old-point readability as proof that new scheduling/publication works.

```bash
for DEPLOYMENT in keycloak-replacement forgejo-replacement; do
  label=recovered
  export DEPLOYMENT
  INSTANCE=$(yq -er '.deployments[strenv(DEPLOYMENT)].instance' "$VALUES")
  CLUSTER=$(yq -er '.deployments[strenv(DEPLOYMENT)].cluster' "$VALUES")
  NS=$(yq -er '.deployments[strenv(DEPLOYMENT)].namespace' "$VALUES")
  RELEASE=$(yq -er '.deployments[strenv(DEPLOYMENT)].release' "$VALUES")
  PACKAGE=$(yq -er '.deployments[strenv(DEPLOYMENT)].package' "$VALUES")
  export INSTANCE CLUSTER PACKAGE
  CTX=$(yq -er '.clusters[strenv(CLUSTER)].kubeconfig.context' "$VALUES")
  VERSION=$(yq -er '.packages[strenv(PACKAGE)].version' "$VALUES")
  CHART="$WORK_DIR/packages/bartl-$INSTANCE-$VERSION.tgz"
  export KUBECONFIG="$WORK_DIR/clusters/$CLUSTER/base/kubeconfig"
  kubectl config get-contexts "$CTX" -o name | jq -Re --arg ctx "$CTX" '.==$ctx' >/dev/null
  TARGET_ARGS=(--set-string "instance=$INSTANCE" --set-string "services.${INSTANCE//./\\.}.release=$VERSION")
  case "$INSTANCE" in
    keycloak) mappings='replicas:application.replicas ingressEnabled:ingress.enabled maintenance:ingress.maintenance backupSuspend:backup.suspend' ;;
    forgejo) mappings='replicas:replicas ingressEnabled:ingress.enabled version:version hostname:hostname' ;;
    restic) mappings='replicas:replicas' ;;
    *) printf 'Unsupported reference instance\n' >&2; exit 1 ;;
  esac
  for mapping in $mappings; do
    key=${mapping%%:*}; field=${mapping#*:}
    if KEY="$key" yq -e '.operations.deployments[strenv(DEPLOYMENT)] | has(strenv(KEY))' "$VALUES" >/dev/null; then
      value=$(KEY="$key" yq -r '.operations.deployments[strenv(DEPLOYMENT)][strenv(KEY)]' "$VALUES")
      case "$key" in version|hostname) TARGET_ARGS+=(--set-string "services.${INSTANCE//./\\.}.$field=$value") ;;
        *) TARGET_ARGS+=(--set "services.${INSTANCE//./\\.}.$field=$value") ;; esac
    fi
  done
  request="$label-$(date -u +%Y%m%dT%H%M%SZ)"
  result="$WORK_DIR/evidence/$INSTANCE-$label-backup.json"
  case "$INSTANCE" in
    keycloak)
      kubectl --context "$CTX" -n "$NS" create job "$request" --from=cronjob/keycloak-backup
      kubectl --context "$CTX" -n "$NS" wait "job/$request" --for=condition=complete --timeout=30m
      kubectl --context "$CTX" -n "$NS" logs "job/$request" -c backup > "$result"
      snapshot=$(jq -er '.snapshotID | select(test("^[a-f0-9]{64}$"))' "$result")
      ;;
    forgejo)
      kubectl --context "$CTX" -n "$NS" annotate forgejoapplication forgejo \
        forgejo.bartl.sh/backup-request="$request" --overwrite
      kubectl --context "$CTX" -n "$NS" wait forgejoapplication/forgejo \
        --for=jsonpath='{.status.backup.request}'="$request" --timeout=20m
      kubectl --context "$CTX" -n "$NS" wait forgejoapplication/forgejo \
        --for=jsonpath='{.status.backup.success}'=true --timeout=20m
      kubectl --context "$CTX" -n "$NS" get forgejoapplication/forgejo -o json |
        jq -e --arg request "$request" '.status.backup | select(.request==$request and .success==true)' > "$result"
      snapshot=$(jq -er '.snapshot | select(test("^[a-f0-9]{64}$"))' "$result")
      ;;
    *) exit 1 ;;
  esac
  LABEL="$label" SNAPSHOT="$snapshot" yq -i '
    .operations.recovery.points[strenv(LABEL)][strenv(INSTANCE)] = {
      "deployment":strenv(DEPLOYMENT),"snapshot":strenv(SNAPSHOT)}
  ' "$VALUES"
done
kubectl --kubeconfig "$KC" -n keycloak get cronjob keycloak-backup
kubectl --kubeconfig "$KC" -n forgejo get cronjob forgejo-backup
```

Require both schedules active; manual success does not prove a scheduled run.


## Reinstall Forgejo with state retained

Require the fully published post-takeover point and no pending publication. Select `forgejo-replacement` and follow Forgejo's stop/removal sequence: retain stop intent, await current-generation Stopped, delete its CR while the controller is alive, wait for finalization, then uninstall Helm. Retain both PVCs, native identity/configuration and backup Secrets. Record replicas 1 and perform ordinary reinstall using the same retained deployment. Verify existing data and new work, then publish another successful point. Never delete the namespace before finalization, force-remove a finalizer, or regenerate identity keys.

```bash
DEPLOYMENT=forgejo-replacement
export DEPLOYMENT
INSTANCE=$(yq -er '.deployments[strenv(DEPLOYMENT)].instance' "$VALUES")
CLUSTER=$(yq -er '.deployments[strenv(DEPLOYMENT)].cluster' "$VALUES")
NS=$(yq -er '.deployments[strenv(DEPLOYMENT)].namespace' "$VALUES")
RELEASE=$(yq -er '.deployments[strenv(DEPLOYMENT)].release' "$VALUES")
PACKAGE=$(yq -er '.deployments[strenv(DEPLOYMENT)].package' "$VALUES")
export INSTANCE CLUSTER PACKAGE
CTX=$(yq -er '.clusters[strenv(CLUSTER)].kubeconfig.context' "$VALUES")
VERSION=$(yq -er '.packages[strenv(PACKAGE)].version' "$VALUES")
CHART="$WORK_DIR/packages/bartl-$INSTANCE-$VERSION.tgz"
export KUBECONFIG="$WORK_DIR/clusters/$CLUSTER/base/kubeconfig"
kubectl config get-contexts "$CTX" -o name | jq -Re --arg ctx "$CTX" '.==$ctx' >/dev/null
TARGET_ARGS=(--set-string "instance=$INSTANCE" --set-string "services.${INSTANCE//./\\.}.release=$VERSION")
case "$INSTANCE" in
  keycloak) mappings='replicas:application.replicas ingressEnabled:ingress.enabled maintenance:ingress.maintenance backupSuspend:backup.suspend' ;;
  forgejo) mappings='replicas:replicas ingressEnabled:ingress.enabled version:version hostname:hostname' ;;
  restic) mappings='replicas:replicas' ;;
  *) printf 'Unsupported reference instance\n' >&2; exit 1 ;;
esac
for mapping in $mappings; do
  key=${mapping%%:*}; field=${mapping#*:}
  if KEY="$key" yq -e '.operations.deployments[strenv(DEPLOYMENT)] | has(strenv(KEY))' "$VALUES" >/dev/null; then
    value=$(KEY="$key" yq -r '.operations.deployments[strenv(DEPLOYMENT)][strenv(KEY)]' "$VALUES")
    case "$key" in version|hostname) TARGET_ARGS+=(--set-string "services.${INSTANCE//./\\.}.$field=$value") ;;
      *) TARGET_ARGS+=(--set "services.${INSTANCE//./\\.}.$field=$value") ;; esac
  fi
done
kubectl --context "$CTX" -n "$NS" get pvc -o json > "$WORK_DIR/evidence/forgejo-before-reinstall-pvc.json"
DEPLOYMENT="$DEPLOYMENT" yq -i '.operations.deployments[strenv(DEPLOYMENT)].replicas = 0' "$VALUES"
export DEPLOYMENT
INSTANCE=$(yq -er '.deployments[strenv(DEPLOYMENT)].instance' "$VALUES")
CLUSTER=$(yq -er '.deployments[strenv(DEPLOYMENT)].cluster' "$VALUES")
NS=$(yq -er '.deployments[strenv(DEPLOYMENT)].namespace' "$VALUES")
RELEASE=$(yq -er '.deployments[strenv(DEPLOYMENT)].release' "$VALUES")
PACKAGE=$(yq -er '.deployments[strenv(DEPLOYMENT)].package' "$VALUES")
export INSTANCE CLUSTER PACKAGE
CTX=$(yq -er '.clusters[strenv(CLUSTER)].kubeconfig.context' "$VALUES")
VERSION=$(yq -er '.packages[strenv(PACKAGE)].version' "$VALUES")
CHART="$WORK_DIR/packages/bartl-$INSTANCE-$VERSION.tgz"
export KUBECONFIG="$WORK_DIR/clusters/$CLUSTER/base/kubeconfig"
kubectl config get-contexts "$CTX" -o name | jq -Re --arg ctx "$CTX" '.==$ctx' >/dev/null
TARGET_ARGS=(--set-string "instance=$INSTANCE" --set-string "services.${INSTANCE//./\\.}.release=$VERSION")
case "$INSTANCE" in
  keycloak) mappings='replicas:application.replicas ingressEnabled:ingress.enabled maintenance:ingress.maintenance backupSuspend:backup.suspend' ;;
  forgejo) mappings='replicas:replicas ingressEnabled:ingress.enabled version:version hostname:hostname' ;;
  restic) mappings='replicas:replicas' ;;
  *) printf 'Unsupported reference instance\n' >&2; exit 1 ;;
esac
for mapping in $mappings; do
  key=${mapping%%:*}; field=${mapping#*:}
  if KEY="$key" yq -e '.operations.deployments[strenv(DEPLOYMENT)] | has(strenv(KEY))' "$VALUES" >/dev/null; then
    value=$(KEY="$key" yq -r '.operations.deployments[strenv(DEPLOYMENT)][strenv(KEY)]' "$VALUES")
    case "$key" in version|hostname) TARGET_ARGS+=(--set-string "services.${INSTANCE//./\\.}.$field=$value") ;;
      *) TARGET_ARGS+=(--set "services.${INSTANCE//./\\.}.$field=$value") ;; esac
  fi
done
helm upgrade --install "$RELEASE" "$CHART" --kube-context "$CTX" -n "$NS" \
  -f "$VALUES" "${TARGET_ARGS[@]}"
GEN=$(kubectl --kubeconfig "$KUBECONFIG" -n "$NS" get forgejoapplication/forgejo -o jsonpath='{.metadata.generation}')
kubectl --kubeconfig "$KUBECONFIG" -n "$NS" wait forgejoapplication/forgejo --for=jsonpath='{.status.observedGeneration}'="$GEN" --timeout=20m
kubectl --kubeconfig "$KUBECONFIG" -n "$NS" wait forgejoapplication/forgejo --for=condition=Stopped --timeout=20m
current_condition "$KUBECONFIG" "$NS" forgejoapplication/forgejo Stopped
kubectl --context "$CTX" -n "$NS" delete forgejoapplication forgejo --wait=true --timeout=20m
helm uninstall "$RELEASE" --kube-context "$CTX" -n "$NS"
DEPLOYMENT="$DEPLOYMENT" yq -i '.operations.deployments[strenv(DEPLOYMENT)].replicas = 1' "$VALUES"
export DEPLOYMENT
INSTANCE=$(yq -er '.deployments[strenv(DEPLOYMENT)].instance' "$VALUES")
CLUSTER=$(yq -er '.deployments[strenv(DEPLOYMENT)].cluster' "$VALUES")
NS=$(yq -er '.deployments[strenv(DEPLOYMENT)].namespace' "$VALUES")
RELEASE=$(yq -er '.deployments[strenv(DEPLOYMENT)].release' "$VALUES")
PACKAGE=$(yq -er '.deployments[strenv(DEPLOYMENT)].package' "$VALUES")
export INSTANCE CLUSTER PACKAGE
CTX=$(yq -er '.clusters[strenv(CLUSTER)].kubeconfig.context' "$VALUES")
VERSION=$(yq -er '.packages[strenv(PACKAGE)].version' "$VALUES")
CHART="$WORK_DIR/packages/bartl-$INSTANCE-$VERSION.tgz"
export KUBECONFIG="$WORK_DIR/clusters/$CLUSTER/base/kubeconfig"
kubectl config get-contexts "$CTX" -o name | jq -Re --arg ctx "$CTX" '.==$ctx' >/dev/null
TARGET_ARGS=(--set-string "instance=$INSTANCE" --set-string "services.${INSTANCE//./\\.}.release=$VERSION")
case "$INSTANCE" in
  keycloak) mappings='replicas:application.replicas ingressEnabled:ingress.enabled maintenance:ingress.maintenance backupSuspend:backup.suspend' ;;
  forgejo) mappings='replicas:replicas ingressEnabled:ingress.enabled version:version hostname:hostname' ;;
  restic) mappings='replicas:replicas' ;;
  *) printf 'Unsupported reference instance\n' >&2; exit 1 ;;
esac
for mapping in $mappings; do
  key=${mapping%%:*}; field=${mapping#*:}
  if KEY="$key" yq -e '.operations.deployments[strenv(DEPLOYMENT)] | has(strenv(KEY))' "$VALUES" >/dev/null; then
    value=$(KEY="$key" yq -r '.operations.deployments[strenv(DEPLOYMENT)][strenv(KEY)]' "$VALUES")
    case "$key" in version|hostname) TARGET_ARGS+=(--set-string "services.${INSTANCE//./\\.}.$field=$value") ;;
      *) TARGET_ARGS+=(--set "services.${INSTANCE//./\\.}.$field=$value") ;; esac
  fi
done
helm upgrade --install "$RELEASE" "$CHART" --kube-context "$CTX" -n "$NS" \
  -f "$VALUES" "${TARGET_ARGS[@]}"
GEN=$(kubectl --kubeconfig "$KUBECONFIG" -n "$NS" get forgejoapplication/forgejo -o jsonpath='{.metadata.generation}')
kubectl --kubeconfig "$KUBECONFIG" -n "$NS" wait forgejoapplication/forgejo --for=jsonpath='{.status.observedGeneration}'="$GEN" --timeout=20m
kubectl --kubeconfig "$KUBECONFIG" -n "$NS" wait forgejoapplication/forgejo --for=condition=Ready --timeout=20m
current_condition "$KUBECONFIG" "$NS" forgejoapplication/forgejo Ready
kubectl --context "$CTX" -n "$NS" get pvc -o json |
  jq -e --slurpfile before "$WORK_DIR/evidence/forgejo-before-reinstall-pvc.json" \
    '([.items[].metadata.uid]|sort)==([$before[0].items[].metadata.uid]|sort)'
label=reinstalled
export DEPLOYMENT
INSTANCE=$(yq -er '.deployments[strenv(DEPLOYMENT)].instance' "$VALUES")
CLUSTER=$(yq -er '.deployments[strenv(DEPLOYMENT)].cluster' "$VALUES")
NS=$(yq -er '.deployments[strenv(DEPLOYMENT)].namespace' "$VALUES")
RELEASE=$(yq -er '.deployments[strenv(DEPLOYMENT)].release' "$VALUES")
PACKAGE=$(yq -er '.deployments[strenv(DEPLOYMENT)].package' "$VALUES")
export INSTANCE CLUSTER PACKAGE
CTX=$(yq -er '.clusters[strenv(CLUSTER)].kubeconfig.context' "$VALUES")
VERSION=$(yq -er '.packages[strenv(PACKAGE)].version' "$VALUES")
CHART="$WORK_DIR/packages/bartl-$INSTANCE-$VERSION.tgz"
export KUBECONFIG="$WORK_DIR/clusters/$CLUSTER/base/kubeconfig"
kubectl config get-contexts "$CTX" -o name | jq -Re --arg ctx "$CTX" '.==$ctx' >/dev/null
TARGET_ARGS=(--set-string "instance=$INSTANCE" --set-string "services.${INSTANCE//./\\.}.release=$VERSION")
case "$INSTANCE" in
  keycloak) mappings='replicas:application.replicas ingressEnabled:ingress.enabled maintenance:ingress.maintenance backupSuspend:backup.suspend' ;;
  forgejo) mappings='replicas:replicas ingressEnabled:ingress.enabled version:version hostname:hostname' ;;
  restic) mappings='replicas:replicas' ;;
  *) printf 'Unsupported reference instance\n' >&2; exit 1 ;;
esac
for mapping in $mappings; do
  key=${mapping%%:*}; field=${mapping#*:}
  if KEY="$key" yq -e '.operations.deployments[strenv(DEPLOYMENT)] | has(strenv(KEY))' "$VALUES" >/dev/null; then
    value=$(KEY="$key" yq -r '.operations.deployments[strenv(DEPLOYMENT)][strenv(KEY)]' "$VALUES")
    case "$key" in version|hostname) TARGET_ARGS+=(--set-string "services.${INSTANCE//./\\.}.$field=$value") ;;
      *) TARGET_ARGS+=(--set "services.${INSTANCE//./\\.}.$field=$value") ;; esac
  fi
done
request="$label-$(date -u +%Y%m%dT%H%M%SZ)"
result="$WORK_DIR/evidence/$INSTANCE-$label-backup.json"
case "$INSTANCE" in
  keycloak)
    kubectl --context "$CTX" -n "$NS" create job "$request" --from=cronjob/keycloak-backup
    kubectl --context "$CTX" -n "$NS" wait "job/$request" --for=condition=complete --timeout=30m
    kubectl --context "$CTX" -n "$NS" logs "job/$request" -c backup > "$result"
    snapshot=$(jq -er '.snapshotID | select(test("^[a-f0-9]{64}$"))' "$result")
    ;;
  forgejo)
    kubectl --context "$CTX" -n "$NS" annotate forgejoapplication forgejo \
      forgejo.bartl.sh/backup-request="$request" --overwrite
    kubectl --context "$CTX" -n "$NS" wait forgejoapplication/forgejo \
      --for=jsonpath='{.status.backup.request}'="$request" --timeout=20m
    kubectl --context "$CTX" -n "$NS" wait forgejoapplication/forgejo \
      --for=jsonpath='{.status.backup.success}'=true --timeout=20m
    kubectl --context "$CTX" -n "$NS" get forgejoapplication/forgejo -o json |
      jq -e --arg request "$request" '.status.backup | select(.request==$request and .success==true)' > "$result"
    snapshot=$(jq -er '.snapshot | select(test("^[a-f0-9]{64}$"))' "$result")
    ;;
  *) exit 1 ;;
esac
LABEL="$label" SNAPSHOT="$snapshot" yq -i '
  .operations.recovery.points[strenv(LABEL)][strenv(INSTANCE)] = {
    "deployment":strenv(DEPLOYMENT),"snapshot":strenv(SNAPSHOT)}
' "$VALUES"
```

## Read new work from the subsequent backup

Use the recorded subsequent snapshot ID and independently retained reader credentials on A with the package's native Restic verification procedure. Restore into a fresh test directory on A, not on the workstation or over a running application. Verify capture metadata/checksums, native Git object visibility for the post-recovery commit, and the issue/package content created after recovery. A listing or successful upload alone is insufficient. Protect these verified point identities and results with the installation's operating record. This closes the recovery-to-new-backup cycle; finish with [cleanup](README.md#cleanup).

On the workstation, supply only the selected Forgejo repository's reader inputs and the sanitized point record to the test client:

```bash
CLIENT_SSH="$WORK_DIR/clusters/a/base/ssh.config"
REPOSITORY_INPUTS="$WORK_DIR/clusters/a/applications/restic/protected/repositories/forgejo"
ssh -F "$CLIENT_SSH" k3s 'umask 077; mkdir -p /root/bartl-reference/repositories/forgejo/reader'
ssh -F "$CLIENT_SSH" k3s 'cat > /root/bartl-reference/repositories/forgejo/reader/password' < "$REPOSITORY_INPUTS/password"
ssh -F "$CLIENT_SSH" k3s 'cat > /root/bartl-reference/repositories/forgejo/reader/restPassword' < "$REPOSITORY_INPUTS/reader.restPassword"
ssh -F "$CLIENT_SSH" k3s 'cat > /root/bartl-reference/forgejo-reinstalled-backup.json' < "$WORK_DIR/evidence/forgejo-reinstalled-backup.json"
ssh -F "$CLIENT_SSH" k3s
```

On A, obtain the independently checksummed native client and read the new commit from that exact subsequent point:

```bash
cd /root/bartl-reference
umask 077
SNAPSHOT=$(jq -er '.snapshot | select(test("^[a-f0-9]{64}$"))' forgejo-reinstalled-backup.json)
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
./restic restore "$SNAPSHOT" --target /root/bartl-reference/reinstalled-restore
repo=/root/bartl-reference/reinstalled-restore/capture/state/data/repositories/reference-admin/reference.git
actual=$(git --git-dir="$repo" show main:recovered.txt)
test "$actual" = 'New write on recovered C'
exit
```

This must read `recovered.txt` from restored backup contents, not a live PVC or an old client copy. Keep the point identity and acceptance result; then continue with cleanup.
