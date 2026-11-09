# Reinstall, verify the backup and remove the installation

On the workstation, load the [session](README.md#resume-a-workstation-session):

```bash
source "${INSTALL_REPO:?}/.lab/workstation.env"
```

Use only fully published and verified backups. Never delete a namespace before finalization finishes.

## Reinstall Forgejo on C with its state retained

Wait for the post-takeover backup to finish publishing. Retain state and capture PVCs, configuration Secrets and backup Secrets. Delete the Application CR while its controller is running, then uninstall the Helm release:

```bash
export KUBECONFIG="$KC"
kubectl -n forgejo get pvc -o json > evidence/forgejo-before-reinstall-pvc.json
helm upgrade forgejo "$FORGEJO_CHART" -n forgejo -f values/forgejo-c.yaml --set replicas=0
kubectl -n forgejo wait forgejoapplication/forgejo --for=condition=Stopped --timeout=10m
current_condition "$KC" forgejo forgejoapplication/forgejo Stopped
kubectl -n forgejo delete forgejoapplication forgejo --wait=true --timeout=20m
helm uninstall forgejo -n forgejo
kubectl -n forgejo get pvc,secret
helm install forgejo "$FORGEJO_CHART" -n forgejo -f values/forgejo-c.yaml --wait=legacy --timeout=5m
kubectl -n forgejo wait forgejoapplication/forgejo --for=condition=Ready --timeout=20m
current_condition "$KC" forgejo forgejoapplication/forgejo Ready
kubectl -n forgejo get pvc -o json | jq -e --slurpfile before evidence/forgejo-before-reinstall-pvc.json \
  '([.items[].metadata.uid]|sort)==([$before[0].items[].metadata.uid]|sort)'
```

The new Application CR has a new owner UID, so the old SSH Service selector no longer matches. Regenerate it below, then recheck HTTPS, Git over SSH, `recovered.txt`, `reference-user`'s read permission and native Keycloak login.

```bash
kubectl -n forgejo get service forgejo -o json | jq '{apiVersion:"v1",kind:"Service",
  metadata:{name:"forgejo-ssh",namespace:"forgejo"},spec:{type:"NodePort",
  externalTrafficPolicy:"Local",selector:.spec.selector,
  ports:[{name:"ssh",port:2222,targetPort:2222,nodePort:30222}]}}' > values/forgejo-ssh-c.json
kubectl apply -f values/forgejo-ssh-c.json
REQUEST="reinstalled-$(date -u +%Y%m%dT%H%M%SZ)"
kubectl -n forgejo annotate forgejoapplication forgejo forgejo.bartl.sh/backup-request="$REQUEST" --overwrite
kubectl -n forgejo wait forgejoapplication/forgejo --for=jsonpath='{.status.backup.request}'="$REQUEST" --timeout=20m
kubectl -n forgejo wait forgejoapplication/forgejo --for=jsonpath='{.status.backup.success}'=true --timeout=20m
kubectl -n forgejo get forgejoapplication/forgejo -o json |
  jq '.status.backup' > evidence/forgejo-reinstalled-backup.json
```

## Read new work from the subsequent backup

From the workstation, transfer the sanitized snapshot record to A and connect there. Keep application data off the workstation.

```bash
jq -e '.success==true and (.snapshot|test("^[a-f0-9]{64}$"))' evidence/forgejo-reinstalled-backup.json
(cd "$INSTALL_REPO/.lab/a";
 scp -F .lab/ssh.config ../../evidence/forgejo-reinstalled-backup.json k3s:/root/bartl-reference/forgejo-reinstalled-backup.json
 ssh -F .lab/ssh.config k3s)
```

On A, restore the selected snapshot with the checksum-verified Restic client:

```bash
cd /root/bartl-reference
SNAPSHOT=$(jq -er .snapshot forgejo-reinstalled-backup.json)
umask 077
curl -fL -o restic.bz2 https://github.com/restic/restic/releases/download/v0.19.1/restic_0.19.1_linux_amd64.bz2
printf 'f415415624dcc452f2a02b8c33641791a8c6d6d3b65bbb3543fcf9a25151585c  restic.bz2\n' | sha256sum --check
bzip2 -d restic.bz2
chmod 700 restic
./restic version
source installation.env
export RESTIC_REPOSITORY="rest:https://$BACKUP_HOST/forgejo/"
export RESTIC_PASSWORD_FILE=/root/bartl-reference/repositories/forgejo/reader/password
export RESTIC_REST_USERNAME=reader
export RESTIC_REST_PASSWORD="$(cat repositories/forgejo/reader/restPassword)"
: "${SNAPSHOT:?Supply the full ID of the verified backup from C}"
./restic restore "$SNAPSHOT" --target /root/bartl-reference/reinstalled-restore
repo=/root/bartl-reference/reinstalled-restore/capture/state/data/repositories/reference-admin/reference.git
actual=$(git --git-dir="$repo" show main:recovered.txt)
test "$actual" = 'New write on recovered C'
exit
```

The check must read `recovered.txt`, written after takeover on C, from the restored backup, not a live Forgejo PVC mount.

## Retain evidence and discard test data

Retain explicit installation values, pinned package references, secret custody references and sanitized evidence. Never commit Secret contents, credentials, database dumps or complete restores. Keep small records of:

- current Application generations, versions and operation results;
- full snapshot IDs for the final captures and backups created after recovery;
- distinct source and target PVC UIDs;
- preserved application content, native identities and permissions;
- confirmed source shutdown, routing and active backup schedules;
- actual resource removal and the cost upper bound;
- the operator, pricing date, budget, deletion deadline and actual secret custody references.

On the workstation, export effective Helm values; B's stopped values are already retained. The packages use Secret references, but inspect every export for secret contents before committing.

```bash
helm get values backup --kubeconfig "$KA" -n backup --all > values/restic-a-effective.yaml
helm get values keycloak --kubeconfig "$KC" -n keycloak --all > values/keycloak-c-effective.yaml
helm get values forgejo --kubeconfig "$KC" -n forgejo --all > values/forgejo-c-effective.yaml
```

Removing A discards its synthetic data, credentials and restores. For a lasting customer handover, first put recovery inputs in customer-controlled protected custody.

## Delete all resources created for this exercise

On the workstation, delete the three DNS A records. Before each deletion, confirm that the displayed record belongs to this installation. Do not delete the zone or other records.

```bash
for host in "$BACKUP_HOST" "$KC_HOST" "$FORGEJO_HOST"; do
  subname=${host%.$DNS_ZONE}
  desec "$DNS_API/rrsets/$subname/A/" | jq .
  desec --request DELETE "$DNS_API/rrsets/$subname/A/"
  sleep 2
done
```

Follow the [K3s teardown procedure](https://github.com/bartlapp/base-k3s/blob/main/README.md#delete-the-entire-lab) in each checkout below, in order: B, C, A. Match each server, Primary IP and firewall to its creation record. Retain the required evidence before deleting A.

```bash
cd "$INSTALL_REPO/.lab/b"
# K3s: Delete the entire lab, including identity checks and confirmation.
cd "$INSTALL_REPO/.lab/c"
# Follow the same documented teardown procedure for C.
cd "$INSTALL_REPO/.lab/a"
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

Calculate the cost upper bound from each server's creation and deletion times, rounding each started hour up and including IPv4. Record the pricing date and reserve, and compare it with the approved budget in `evidence/operator-inputs.txt`. This is not the provider's final invoice.

## Close the private installation record

Review the files, then stage only the paths below. Keep the repository private and without a remote. Exclude `.lab/` and test data.

```bash
cd "$INSTALL_REPO"
git status --short --branch
git add README.md .gitignore installation.env values evidence
git diff --cached --stat
git diff --cached --check
```

Inspect staged contents for secrets before committing. Adding a remote requires a separate decision on destination and private visibility.

```bash
git commit -m 'Record verified reference installation'
```
