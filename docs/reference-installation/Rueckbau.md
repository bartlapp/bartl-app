# Reinstall, verify the backup and remove the installation

Before the first workstation command, load the [workstation session](README.md#resume-a-workstation-session):

```bash
source "${INSTALL_REPO:?}/.lab/workstation.env"
```

Removing a package and destroying its data are different operations. First reinstall Forgejo with its state retained and read the new work from its subsequent backup. Then retain the operational evidence and remove the lab. These exercises use backups whose publication and verification are already complete. Never delete a namespace before finalization has finished.

## Reinstall Forgejo on C with its state retained

Proceed only after the new backup following takeover has finished publishing. Keep the state and capture PVCs, configuration Secrets and backup Secrets. Delete the Application CR while its controller is still running, then uninstall the Helm release:

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

The new Application CR has a new owner UID. Regenerate the installation-managed SSH Service from the current package Service selector and apply it; the old selector no longer identifies the application. Then recheck HTTPS access, Git over SSH, the new file `recovered.txt`, `reference-user`'s read permission and the native Keycloak login.

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

Transfer the sanitized snapshot record from the workstation to A and open an SSH session there. Keep application data off the workstation.

```bash
jq -e '.success==true and (.snapshot|test("^[a-f0-9]{64}$"))' evidence/forgejo-reinstalled-backup.json
(cd "$INSTALL_REPO/.lab/a";
 scp -F .lab/ssh.config ../../evidence/forgejo-reinstalled-backup.json k3s:/root/bartl-reference/forgejo-reinstalled-backup.json
 ssh -F .lab/ssh.config k3s)
```

On A, download and verify the qualified native Restic client, then restore the selected snapshot into a new directory:

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

This checks more than the existence of another snapshot: the file written only after takeover on C is natively readable from its subsequent backup. Do not use a live mount of the Forgejo PVC for this check.

## Retain evidence and discard test data

Keep only explicit installation values, pinned package references, secret custody references and sanitized evidence in the installation repository. Never commit `kubectl get secrets -o yaml` output, credentials, database dumps or complete restores. Retain small records showing:

- current Application generations, versions and operation results;
- full snapshot IDs for the final captures and backups created after recovery;
- distinct source and target PVC UIDs;
- preserved application content, native identities and permissions;
- confirmed source shutdown, routing and active backup schedules;
- actual resource removal and the cost upper bound;
- the operator, pricing date, budget, deletion deadline and actual secret custody references.

From the workstation, export the complete effective Helm values of the remaining releases. The stopped B values were already retained before shutdown. These packages accept only Secret references through Helm values, but inspect every export for secret contents before committing it.

```bash
helm get values backup --kubeconfig "$KA" -n backup --all > values/restic-a-effective.yaml
helm get values keycloak --kubeconfig "$KC" -n keycloak --all > values/keycloak-c-effective.yaml
helm get values forgejo --kubeconfig "$KC" -n forgejo --all > values/forgejo-c-effective.yaml
```

Lab removal discards the synthetic data, credentials and restores held on A. For a lasting customer handover, first place these recovery inputs in protected custody controlled by the customer. A completed lab run does not need them after teardown.

## Delete all resources created for this exercise

Back on the workstation, remove your three DNS A records first. Before each deletion, read the record and confirm that it belongs to this installation. Do not delete the zone or anyone else's records.

```bash
for host in "$BACKUP_HOST" "$KC_HOST" "$FORGEJO_HOST"; do
  subname=${host%.$DNS_ZONE}
  desec "$DNS_API/rrsets/$subname/A/" | jq .
  desec --request DELETE "$DNS_API/rrsets/$subname/A/"
  sleep 2
done
```

Then follow the existing [K3s teardown procedure](https://github.com/bartlapp/base-k3s/blob/main/README.md#delete-the-entire-lab) in full for each of the three checkouts. It binds deletion to the corresponding creation record and checks each server, Primary IP and firewall separately. Remove B, then C, then A. Delete A only after retaining the required evidence.

```bash
cd "$INSTALL_REPO/.lab/b"
# K3s: Delete the entire lab, including identity checks and confirmation.
cd "$INSTALL_REPO/.lab/c"
# Follow the same documented teardown procedure for C.
cd "$INSTALL_REPO/.lab/a"
# Follow the same documented teardown procedure for A.
```

These directory changes lead to the existing procedure; they are not a complete executable deletion routine. Each deletion requires a deliberate operator action. Afterwards, inspect the project inventory. Success means that this installation's resources are absent, not that the whole project is empty.

```bash
hcloud server list
hcloud primary-ip list
hcloud firewall list
hcloud volume list
hcloud load-balancer list
unset KUBECONFIG
```

Use each server's creation and deletion times to calculate billable hours, rounding each started hour up and including IPv4. Record the pricing date and reserve, then compare the result with your approved budget in `evidence/operator-inputs.txt`. Distinguish this upper bound from the provider's final invoice.

## Close the private installation record

Review the files before staging the explicit paths below. The repository has no remote and remains private. Do not add `.lab/` files or test data.

```bash
cd "$INSTALL_REPO"
git status --short --branch
git add README.md .gitignore installation.env values evidence
git diff --cached --stat
git diff --cached --check
```

Inspect the staged contents for secrets, then commit the verified operating state locally. Configure a remote only after separately deciding its destination and private visibility.

```bash
git commit -m 'Record verified reference installation'
```
