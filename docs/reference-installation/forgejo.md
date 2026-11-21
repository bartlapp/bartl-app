# Integrate Forgejo with Keycloak

Complete [Restic and Keycloak installation](applications.md). Use native OAuth2/OpenID Connect; no login proxy or automatic account linking by email.

```bash
source "${WORK_DIR:?}/operations/workstation.env"
export DEPLOYMENT=forgejo
export KUBECONFIG="$KB"
yq -i '.operations.deployments.forgejo = (
  {"version":"16.0.7","replicas":1,"ingressEnabled":true} *
  (.operations.deployments.forgejo // {}))' "$VALUES"
```

Execute the [Forgejo operating recipe](https://github.com/bartlapp/bartl-forgejo/blob/main/README.md), using the retained mapping B/namespace `forgejo`/release `forgejo`/instance `forgejo`, the verified 0.2.2 archive and the same `VALUES`. Follow declaration rendering, storage, TLS/SSH, retained identity/configuration and optional Keycloak/Restic composition. Its deployment-intent arguments apply the recorded native 16.0.7 source version during both rendering and installation. Give the state and staging claims separate storage; 20Gi each is only a synthetic sizing choice.

For composition, select `services.forgejo.identityProvider: keycloak` and `backup.endpoint: restic`, already retained in the previous chapter. Use the package's three-declaration binding block and native Keycloak-client provisioning block. The provider realm follows Keycloak's declaration; do not hardcode another issuer. Retain the issued client secret unchanged, and rerender the Forgejo configuration after preparing bindings. Preserve all native identity keys. Run ordinary install, register the native authentication source, and verify authenticated HTTP/SSH. Keep local administration usable independently of Keycloak.

## Provide actual SSH reachability

The retained service choices select NodePort 30222. The chart owns its SSH Service; do not create a competing manual Service or copy a predecessor's selector. Permit this port only from the administrator and test-client A. Read B's retained firewall ID, then inspect live attachment before adding the rule:

```bash
yq -e '.clusters.b.ownership == "managed" and .vms[strenv(B_VM)].ownership == "managed" and
  .clusters.b.observed.firewalls.admin.ownership == "managed" and
  .clusters.b.observed.firewalls.admin.type == "hetzner" and
  .clusters.b.observed.firewalls.admin.provider == .vms[strenv(B_VM)].provider and
  (.clusters.b.observed.firewalls.admin.attachedVms | length) == 1 and
  .clusters.b.observed.firewalls.admin.attachedVms[0] == strenv(B_VM)' "$VALUES" >/dev/null
FIREWALL=$(yq -er '.clusters.b.observed.firewalls.admin.id' "$VALUES")
hcloud firewall describe "$FIREWALL"
hcloud firewall add-rule "$FIREWALL" --direction in --protocol tcp --port 30222 \
  --source-ips "$ADMIN_IP/32,$A_IP/32"
kubectl --kubeconfig "$KB" -n forgejo get service forgejo-ssh -o wide
POD=$(kubectl --kubeconfig "$KB" -n forgejo get pod -l forgejo.bartl.sh/role=app \
  -o jsonpath='{.items[0].metadata.name}')
kubectl --kubeconfig "$KB" -n forgejo exec "$POD" -- cat /data/data/ssh/forgejo.ed25519.pub \
  > "$WORK_DIR/evidence/forgejo-host-key.pub"
```

If a matching rule exists, verify it rather than adding another. Trust the SSH key obtained through authenticated cluster access, not an unauthenticated scan.

## Prepare the test client on A

On the workstation, stream the source's retained bootstrap files to A, not payload data back to the workstation. Bootstrap credentials were supplied/generated once in the package preparation; for this exercise choose username `reference-admin` and email `reference-admin@example.invalid` before initial initialization. Do not change the account merely to fit a probe after creation.

```bash
ssh -F "$WORK_DIR/clusters/a/base/ssh.config" k3s 'apt-get update && apt-get install -y jq git git-lfs bzip2'
SOURCE_DIR="$WORK_DIR/clusters/b/applications/forgejo"
ssh -F "$WORK_DIR/clusters/a/base/ssh.config" k3s \
  'umask 077; mkdir -p /root/bartl-reference/forgejo/bootstrap'
for key in username email password; do
  ssh -F "$WORK_DIR/clusters/a/base/ssh.config" k3s \
    "cat > /root/bartl-reference/forgejo/bootstrap/$key" < "$SOURCE_DIR/protected/bootstrap/$key"
done
ssh -F "$WORK_DIR/clusters/a/base/ssh.config" k3s \
  'cat > /root/bartl-reference/forgejo/host-key.pub' < "$WORK_DIR/evidence/forgejo-host-key.pub"
```

## Verify browser access

In the provider realm selected by Keycloak's declaration, create a synthetic enabled user `reference-user` with verified email `reference-user@example.invalid`, a retained password and no pending required action. Use native Keycloak administration, not Forgejo-side email linking. Record the realm, user UUID and Forgejo client UUID in the nonsecret operating record; these identities must survive recovery.

Open `https://$FORGEJO_HOST`, choose “Sign in with keycloak”, authenticate as that user and verify a distinct Forgejo `reference-user` account. Check logout and new login through the real HTTPS endpoint. Do not grant this user administration. Verify local `reference-admin` login separately. Retain provider/user/client IDs and acceptance results under `operations` or `evidence`, without passwords or tokens. Continue with [service data and access checks](verification.md).
