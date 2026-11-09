# Reinstall, verify the backup and remove the installation

On the workstation, load the [variables and helpers](README.md#prepare-workstation-commands):

```bash
source "${WORK_DIR:?}/.lab/workstation.env"
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
(cd "$WORK_DIR/.lab/a";
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

## Delete all resources created for this exercise

Use this cleanup after a completed or interrupted run. For an interrupted run, skip the application checks above and remove only resources actually created. Keep `$WORK_DIR` until cloud cleanup is complete: it contains the access files and resource identities needed for deletion. If nothing was provisioned, go straight to [local deletion](#delete-the-local-directory).

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

## Delete the local directory

After confirming that the lab's DNS records and cloud resources are gone, delete the entire working directory, including configuration, evidence and cluster access files:

```bash
cd "${WORK_DIR:?}" && cd .. && rm -rf -- "$WORK_DIR" &&
  unset WORK_DIR KA KB KC HCLOUD_TOKEN DESEC_TOKEN
```
