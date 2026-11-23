# Install Restic on A and Keycloak on B

Complete the [three-base setup](README.md). Keep C empty. Every package command consumes the same absolute `VALUES`; selecting a package must not create another installation file.

```bash
source "${WORK_DIR:?}/operations/workstation.env"
yq -i '
  .services.restic = ({"release":"0.3.0","repositories":[{"name":"keycloak"},{"name":"forgejo"}]} * (.services.restic // {})) |
  .services.keycloak = ({"release":"0.6.1","backup":{"endpoint":"restic","schedule":"0 2 * * *","timeZone":"Europe/Berlin"}} * (.services.keycloak // {})) |
  .services.forgejo = ({"release":"0.2.2","identityProvider":"keycloak","bootstrapSecret":"forgejo-bootstrap",
    "backup":{"endpoint":"restic","schedule":"0 2 * * *","timeZone":"Europe/Berlin"},
    "ssh":{"exposure":"NodePort","nodePort":30222}} * (.services.forgejo // {}))
' "$VALUES"
```

Defaults fill missing service entries only. Review existing service selections and repository membership without replacing siblings. Both applications need their own initialized repository, independently retained encryption key and distinct reader/writer/admin transport passwords. Endpoint credentials are not identity credentials.

Acquire the selected charts and render their nonsecret declarations before DNS or service startup. The hostname comes from the package, not a naming formula in this walkthrough:

```bash
for DEPLOYMENT in restic keycloak forgejo; do
  export DEPLOYMENT
  INSTANCE=$(yq -er '.deployments[strenv(DEPLOYMENT)].instance' "$VALUES")
  CLUSTER_ID=$(yq -er '.deployments[strenv(DEPLOYMENT)].cluster' "$VALUES")
  NS=$(yq -er '.deployments[strenv(DEPLOYMENT)].namespace' "$VALUES")
  RELEASE=$(yq -er '.deployments[strenv(DEPLOYMENT)].release' "$VALUES")
  PACKAGE=$(yq -er '.deployments[strenv(DEPLOYMENT)].package' "$VALUES")
  export PACKAGE
  VERSION=$(yq -er '.packages[strenv(PACKAGE)].version' "$VALUES")
  CHART_REF=$(yq -er '.packages[strenv(PACKAGE)].chart' "$VALUES")
  CHART="$WORK_DIR/packages/bartl-$INSTANCE-$VERSION.tgz"
  test -s "$CHART" || helm pull "$CHART_REF" --version "$VERSION" --destination "$WORK_DIR/packages"
  printf '%s  %s\n' "$(yq -er '.packages[strenv(PACKAGE)].chartSha256' "$VALUES")" "$CHART" |
    shasum -a 256 --check -
  DIRECTORY="$WORK_DIR/clusters/$CLUSTER_ID/applications/$INSTANCE"
  if [ "$DEPLOYMENT" != "$INSTANCE" ]; then DIRECTORY="$DIRECTORY/deployments/$DEPLOYMENT"; fi
  mkdir -p "$DIRECTORY"
  case "$INSTANCE" in keycloak) DECLARATION="$DIRECTORY/connections.yaml" ;;
    *) DECLARATION="$DIRECTORY/$INSTANCE-connections.yaml" ;; esac
  INTENT_ARGS=()
  case "$INSTANCE" in
    keycloak) fields='replicas:application.replicas ingressEnabled:ingress.enabled maintenance:ingress.maintenance backupSuspend:backup.suspend' ;;
    forgejo) fields='replicas:replicas ingressEnabled:ingress.enabled version:version hostname:hostname' ;;
    restic) fields='replicas:replicas' ;;
  esac
  for mapping in $fields; do
    key=${mapping%%:*}; field=${mapping#*:}
    if KEY="$key" yq -e '.operations.deployments[strenv(DEPLOYMENT)] | has(strenv(KEY))' "$VALUES" >/dev/null; then
      value=$(KEY="$key" yq -r '.operations.deployments[strenv(DEPLOYMENT)][strenv(KEY)]' "$VALUES")
      case "$key" in version|hostname) INTENT_ARGS+=(--set-string "services.${INSTANCE//./\\.}.$field=$value") ;;
        *) INTENT_ARGS+=(--set "services.${INSTANCE//./\\.}.$field=$value") ;; esac
    fi
  done
  helm template "$RELEASE" "$CHART" -n "$NS" -f "$VALUES" \
    --set-string instance="$INSTANCE" --set-string "services.${INSTANCE//./\\.}.release=$VERSION" "${INTENT_ARGS[@]}" \
    --set-string renderMode=connections --show-only templates/connections.yaml > "$DECLARATION"
done
source "$WORK_DIR/operations/workstation.env"
```

## Prepare DNS

Set `dns.zone` to the delegated zone if it differs from `dns.root`. Source the helper again after hostname changes. Inspect existing records before creating anything; do not overwrite another installation. On an uncertain response, read live state before retrying.

```bash
source "$WORK_DIR/operations/workstation.env"
desec "$DNS_API/"
desec "$DNS_API/rrsets/" | jq .
for pair in "$BACKUP_HOST $A_IP" "$KC_HOST $B_IP" "$FORGEJO_HOST $B_IP"; do
  read -r host ip <<< "$pair"
  desec --request POST "$DNS_API/rrsets/" --json \
    "$(jq -nc --arg name "${host%.$DNS_ZONE}" --arg ip "$ip" '{subname:$name,type:"A",ttl:900,records:[$ip]}')"
  HOST="$host" IP="$ip" yq -i '.operations.dns[strenv(HOST)] = {"type":"A","address":strenv(IP),"ttl":900}' "$VALUES"
done
for host in "$BACKUP_HOST" "$KC_HOST" "$FORGEJO_HOST"; do
  for resolver in ns1.desec.io ns2.desec.org 1.1.1.1 8.8.8.8; do
    dig @"$resolver" "$host" A +noall +comments +answer
  done
done
```

Require authoritative `aa` answers and the intended address everywhere before certificates. No AAAA record is assumed. Respect deSEC retry intervals without blind write retries.

## Install the backup endpoint

Select `DEPLOYMENT=restic`, with `KUBECONFIG="$KA"`, then execute the [Restic README](https://github.com/bartlapp/bartl-restic/blob/main/README.md) sections for release acquisition, preparation, TLS/route, storage/credentials and installation. Preserve `WORK_DIR` and `VALUES` and the retained deployment mapping: A, namespace `backup`, release `backup`, instance `restic`. The repository PVC needs sufficient complete-history and staging capacity; 25Gi is a synthetic exercise choice, not production sizing. Use the package's managed TLS or explicitly retained externally managed TLS, not competing certificate owners.

Its declared repositories are `keycloak` and `forgejo`. Prepare their Secrets from retained inputs and let the ordinary package lifecycle initialize genuinely new repositories; never run `restic init` separately. Require current-generation Ready and valid public HTTPS. An anonymous repository-config request must return 401, not a TLS error:

```bash
for repository in keycloak forgejo; do
  code=$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "https://$BACKUP_HOST/$repository/config")
  test "$code" = 401
done
current_condition "$KA" backup resticapplication/backup-restic Ready
```

Check authenticated reader access through the package procedure, without displaying repository configuration. Readers may manage native locks but not mutate backup content; writers are append-only; maintenance authority remains separate. A is not an independent secondary backup: its loss is outside this exercise.

## Prepare Keycloak connections and install

Prepare the Keycloak-only backup binding **before installation**. Restic is already running; use its rendered repository declaration and retained credentials. Do not execute the Restic README's Keycloak-and-Paperless composition block: Paperless is not part of this installation.

```bash
test "$(yq -er '.services.keycloak.backup.endpoint' "$VALUES")" = restic
RESTIC_CLUSTER=$(yq -er '.deployments.restic.cluster' "$VALUES")
RESTIC_DIR="$WORK_DIR/clusters/$RESTIC_CLUSTER/applications/restic"
REPOSITORY=$(yq -er '.backup.providers.restic.repositories.keycloak.repository' "$RESTIC_DIR/restic-connections.yaml")
REPOSITORY="$REPOSITORY" yq -i '
  .resolved.backup.bindings.keycloak = {"endpoint":"restic","repository":strenv(REPOSITORY)}
' "$VALUES"
export DEPLOYMENT=keycloak
export INSTANCE=keycloak
CLUSTER_ID=$(yq -er '.deployments.keycloak.cluster' "$VALUES")
NS=$(yq -er '.deployments.keycloak.namespace' "$VALUES")
RELEASE=$(yq -er '.deployments.keycloak.release' "$VALUES")
PACKAGE=$(yq -er '.deployments.keycloak.package' "$VALUES")
KUBE_CONTEXT=$(CLUSTER_ID="$CLUSTER_ID" yq -er '.clusters[strenv(CLUSTER_ID)].kubeconfig.context' "$VALUES")
PACKAGE_VERSION=$(PACKAGE="$PACKAGE" yq -er '.packages[strenv(PACKAGE)].version' "$VALUES")
CHART="$WORK_DIR/packages/bartl-keycloak-$PACKAGE_VERSION.tgz"
export KUBECONFIG="$WORK_DIR/clusters/$CLUSTER_ID/base/kubeconfig"
INSTALL_DIR="$WORK_DIR/clusters/$CLUSTER_ID/applications/$INSTANCE"
INTENT_ARGS=()
for mapping in replicas:application.replicas ingressEnabled:ingress.enabled maintenance:ingress.maintenance backupSuspend:backup.suspend; do
  key=${mapping%%:*}; field=${mapping#*:}
  if KEY="$key" yq -e '.operations.deployments.keycloak | has(strenv(KEY))' "$VALUES" >/dev/null; then
    value=$(KEY="$key" yq -r '.operations.deployments.keycloak[strenv(KEY)]' "$VALUES")
    INTENT_ARGS+=(--set "services.keycloak.$field=$value")
  fi
done
helm template "$RELEASE" "$CHART" -n "$NS" -f "$VALUES" \
  --set-string instance="$INSTANCE" --set-string services.keycloak.release="$PACKAGE_VERSION" "${INTENT_ARGS[@]}" \
  --set-string renderMode=connections --show-only templates/connections.yaml > "$INSTALL_DIR/connections.yaml"
for role in reader writer; do
  mkdir -p "$INSTALL_DIR/repository/$role"
  printf '%s' "$role" > "$INSTALL_DIR/repository/$role/username"
  for pair in password:password "$role.restPassword:restPassword"; do
    source="$RESTIC_DIR/protected/repositories/keycloak/${pair%%:*}"
    target="$INSTALL_DIR/repository/$role/${pair#*:}"
    if [ -e "$target" ]; then cmp "$source" "$target"; else cp "$source" "$target"; fi
  done
  source="$RESTIC_DIR/protected/ca.crt"
  target="$INSTALL_DIR/repository/$role/ca.crt"
  if [ -e "$target" ]; then cmp "$source" "$target"; else cp "$source" "$target"; fi
done
```

Now follow the [Keycloak README](https://github.com/bartlapp/bartl-keycloak/blob/main/README.md#obtain-the-release), keeping `DEPLOYMENT=keycloak`, its retained B placement and the same `VALUES`. Run **Obtain the release** to initialize the package's access and ingress variables, then **Configure the installation** and **Prepare the installation files**, including native database/bootstrap/recovery administrator credentials. The repository inputs above satisfy **External backup inputs**; retain them unchanged. Then execute **Create the namespace**, **Create the Kubernetes Secrets**, and only then **Deploy and follow logs**, including TLS waits. This order ensures the selected backup endpoint has its binding and reader/writer Secrets before installation. Use 5Gi `local-path` database storage for synthetic data. Retain the existing bootstrap/recovery administrator independently; never replace a recovered native account.

Require current-generation application Ready and a Ready certificate, then sign in to `https://$KC_HOST/admin/` with the retained administrator. Confirm normal administration before [integrating Forgejo](forgejo.md).

## Retain source and replacement access

Keep protected inputs outside B/C and their Keycloak. For this exercise A may additionally hold test-client material, but it must not be the only copy of customer recovery keys. Base SSH access is selected explicitly:

```bash
ssh -F "$WORK_DIR/clusters/cluster-1/base/ssh.config" cluster-1-node1
```

On the workstation, prepare the nonsecret remote client exports from the actual shared values, without creating another `installation.yaml`:

```bash
{
  printf 'BACKUP_HOST=%q\n' "$BACKUP_HOST"
  printf 'KC_HOST=%q\n' "$KC_HOST"
  printf 'FORGEJO_HOST=%q\n' "$FORGEJO_HOST"
} | ssh -F "$WORK_DIR/clusters/cluster-1/base/ssh.config" cluster-1-node1 \
  'umask 077; mkdir -p /root/bartl-reference; cat > /root/bartl-reference/installation.env'
```

The remote exports are derived test-client input only. Resume, placement, package selection, operations and teardown always read `VALUES` on the workstation.
