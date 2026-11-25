# Install Restic on A and Keycloak and Paperless on B

Complete the [three-base setup](README.md). Keep C empty. Every package uses the existing absolute `WORK_DIR` and `VALUES`; replace sample installation paths in package recipes with these retained paths. Run package creation blocks once, with the choices below, rather than pre-creating records and then running creation again.

## Prepare the verification client on A

A is the operator-controlled client for native repository checks as well as the backup host. Prepare it before Restic acceptance, using Base's verified SSH access. From the workstation, for a fresh client directory:

```bash
ssh -F "$WORK_DIR/clusters/cluster-1/base/ssh.config" cluster-1-node1 bash -s <<'REMOTE'
set -euo pipefail
umask 077
apt-get update
apt-get install -y jq git git-lfs bzip2 sqlite3
mkdir -p /root/bartl-reference
cd /root/bartl-reference
test ! -e restic
curl -fL -o restic.bz2 https://github.com/restic/restic/releases/download/v0.19.1/restic_0.19.1_linux_amd64.bz2
printf 'f415415624dcc452f2a02b8c33641791a8c6d6d3b65bbb3543fcf9a25151585c  restic.bz2\n' | sha256sum --check
bzip2 -d restic.bz2
chmod 700 restic
./restic version
REMOTE
```

On resumption, keep the existing verified binary and check its version instead of downloading over it. Later Forgejo and Paperless readback checks reuse this client. Workstation Restic and its cache are not needed. A's continued availability is part of this B→C exercise, not evidence of backup-host-loss recovery.

## Install the backup endpoint on A

Enter A's cluster directory and wait for the next prompt so Base selects its access:

```bash
cd "$WORK_DIR/clusters/cluster-1"
```

At the next prompt follow the [Restic README](https://github.com/bartlapp/bartl-restic/blob/main/README.md#prerequisites-and-release) from latest-stable acquisition through **Configure a new endpoint**, keeping this selected cluster. In its creation block choose `DEPLOYMENT=restic`, `INSTANCE=restic`, `NS=backup`, `RELEASE=backup`, `PACKAGE=restic`, `REPOSITORY=keycloak` and `CAPACITY=25Gi`. Capacity is a synthetic exercise choice: verify that the selected histories fit before provisioning. The grouped block enters Restic's deployment directory; wait for its next prompt before rendering.

After that prompt, run [Select the test issuer](README.md#test-tls-profile) before declaration rendering. For `acme.fke.systems`, continue with managed staging issuance and the independently prepared test CA trust.

Continue through declaration rendering and storage creation. At **Prepare DNS, TLS and repository credentials**, use the [DNS checkpoint](#dns-checkpoint) below with `HOST="$RESTIC_HOST"` and `IP="$A_IP"`, then resume the package's TLS and credential preparation. Retain its repository encryption key, distinct reader/writer/admin transport passwords, `htpasswd` and validating CA independently. Use managed TLS or explicitly retained external TLS, never competing certificate owners.

Complete the workstation-side **Install and verify** checks, then use [Verify a repository from A](#verify-a-repository-from-a) below for `REPOSITORY=keycloak`. Follow [Add a repository](https://github.com/bartlapp/bartl-restic/blob/main/README.md#add-a-repository) separately for `REPOSITORY=forgejo` and `REPOSITORY=paperless`, repeating that A-client round-trip for each. Preserve the existing repository list and credentials. Native package admission initializes genuinely new repositories; never run `restic init` separately.

```bash
source "$WORK_DIR/operations/workstation.env"
for repository in keycloak forgejo paperless; do
  code=$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "https://$BACKUP_HOST/$repository/config")
  test "$code" = 401
done
current_condition "$KA" backup resticapplication/backup-restic Ready
```

Require certificate-verified HTTPS under the selected test trust and authenticated reader access through the package's procedure. Readers may manage native locks but not mutate backup content; writers are append-only; maintenance authority stays separate. A survives this exercise but is not an independent secondary backup: its loss is outside the claim.


## Verify a repository from A

Start in the workstation's selected Restic deployment after that repository is admitted. For each newly selected repository, supply only its scoped verification inputs to A. Choose `REPOSITORY` once; subsequent checks derive its URL from Restic's declaration:

```bash
export REPOSITORY=keycloak
CLIENT_SSH="$WORK_DIR/clusters/cluster-1/base/ssh.config"
CLIENT_DIR="/root/bartl-reference/repositories/$REPOSITORY/client"
REPOSITORY_URL=$(yq -er '.backup.providers[strenv(INSTANCE)].repositories[strenv(REPOSITORY)].repository' \
  "$INSTALL_DIR/restic-connections.yaml")
ssh -F "$CLIENT_SSH" cluster-1-node1 "umask 077; mkdir -p '$CLIENT_DIR'"
for key in password writer.restPassword reader.restPassword; do
  ssh -F "$CLIENT_SSH" cluster-1-node1 "umask 077; cat > '$CLIENT_DIR/$key'" \
    < "$INSTALL_DIR/protected/repositories/$REPOSITORY/$key"
done
ssh -F "$CLIENT_SSH" cluster-1-node1 "umask 077; cat > '$CLIENT_DIR/ca.crt'" \
  < "$INSTALL_DIR/protected/ca.crt"
{
  printf 'export REPOSITORY_URL=%q\nexport REPOSITORY_INPUTS=%q\n' "$REPOSITORY_URL" "$CLIENT_DIR"
  printf '%s\n' 'export PATH="/root/bartl-reference:$PATH"'
} | ssh -F "$CLIENT_SSH" cluster-1-node1 "umask 077; cat > '$CLIENT_DIR/client.env'"
ssh -F "$CLIENT_SSH" -t cluster-1-node1 "cd '$CLIENT_DIR' && exec bash"
```

The new prompt is on A in the selected repository's client directory. Load the supplied inputs:

```bash
source ./client.env
```

Execute only the round-trip block from Restic's [Verify repository access from a client](https://github.com/bartlapp/bartl-restic/blob/main/README.md#verify-repository-access-from-a-client), keeping these supplied variables instead of its example assignments. Require authenticated write, reader restore and byte equality over the public HTTPS endpoint. Do not read the backend volume or disable certificate verification. Then run `exit` to return to the paused workstation deployment.

For later checks of the same repository, reuse its retained client files rather than re-copying or regenerating credentials. Enter its existing client directory on A and load `client.env`. No admin password or `htpasswd` is sent to this client. The workstation's HTTPS/401 check above remains a separate public reachability check.

## Create Keycloak's deployment on B

Enter B and wait for the next prompt:

```bash
cd "$WORK_DIR/clusters/cluster-2"
```

Follow the [Keycloak new-deployment procedure](https://github.com/bartlapp/bartl-keycloak/blob/main/README.md#install-a-new-deployment), starting at **Obtain the release**. In **Configure the installation**, choose `DEPLOYMENT=keycloak`, `INSTANCE=keycloak`, `NS=keycloak`, `RELEASE=keycloak` and `PACKAGE=keycloak`; Base has selected `CLUSTER_ID=cluster-2`.

Run the complete Configure creation block and wait for the next prompt in its deployment directory. It creates an empty `services.keycloak` entry. Only **after that block**, and before its declaration rendering or installation, supply the composition choices:

First run [Select the test issuer](README.md#test-tls-profile) in the selected Keycloak deployment directory, then apply the composition settings below.

```bash
yq -i '.services.keycloak.backup.endpoint = "restic" |
  .services.keycloak.backup.schedule = "*/5 * * * *" |
  .services.keycloak.backup.timeZone = "Europe/Berlin"' "$VALUES"
RESTIC_CONNECTIONS="$WORK_DIR/clusters/cluster-1/applications/restic/restic-connections.yaml"
REPOSITORY=$(yq -er '.backup.providers.restic.repositories.keycloak.repository' "$RESTIC_CONNECTIONS")
REPOSITORY="$REPOSITORY" yq -i '.resolved.backup.bindings.keycloak = {
  "endpoint":"restic", "repository":strenv(REPOSITORY)
}' "$VALUES"
```

This is the composed backup form; do not additionally set the package's example direct `backup.repository`. Preserve any explicit service credential references and explicit disablement; do not replace them with copied declaration defaults. For an existing installation, resume rather than rerunning this new-deployment setup.

Continue Keycloak's declaration rendering, then its **Prepare DNS** procedure with B's ingress address and the retained zone. First load the cross-service facts in this parent shell, then select the DNS inputs:

```bash
source "$WORK_DIR/operations/workstation.env"
HOST="$KC_HOST"
IP="$B_IP"
```

Use the [DNS checkpoint](#dns-checkpoint) instead of performing a second DNS creation. Continue **Prepare the installation files** to generate or supply native credentials once.

## Transfer Keycloak's scoped backup inputs

At Keycloak's **External backup inputs**, keep its terminal paused in the deployment directory. In a second direnv-hooked Bash terminal, enter Restic:

```bash
cd "$WORK_DIR/clusters/cluster-1/applications/restic"
```

At the next prompt run Restic's **Resume an existing deployment**, keeping this directory instead of its sample path. Then run **Connect an application**, choosing:

```bash
export REPOSITORY=keycloak
export CONSUMER_DIR="$WORK_DIR/clusters/cluster-2/applications/keycloak"
```

Return to the paused Keycloak terminal when the handoff is complete; no nested no-hook shell is required.

The handoff copies the retained encryption key, scoped reader/writer usernames and transport passwords, and validating CA into Keycloak's `repository/reader/` and `repository/writer/`. It does not hand off repository-admin authority. On resumption, retain these files rather than recopying or regenerating them. The composed URL already comes from Restic's declaration; do not execute the handoff prose's alternative direct-URL assignment.

Return to Keycloak's **Install and inspect** in the still-selected deployment. Refresh declarations, create namespace `keycloak`, native credential Secrets and backup reader/writer Secrets, then perform the ordinary install and TLS/current-generation readiness checks. Complete **Verify Keycloak** and **Retain operating and recovery inputs**, including the current backed-up master-realm administrator at `INSTALL_DIR/recovery-admin/`. Verify fresh administration through `https://$KC_HOST/admin/`, then install Paperless below.

## Install Paperless on B

In its own direnv-hooked terminal, enter B's cluster directory:

```bash
cd "$WORK_DIR/clusters/cluster-2"
```

At the next prompt follow the [Paperless README](https://github.com/bartlapp/bartl-paperless/blob/main/README.md#select-cluster-access-and-obtain-the-release) from chart acquisition. In **Configure a new deployment**, choose `DEPLOYMENT=paperless`, `INSTANCE=paperless`, `NS=paperless`, `RELEASE=paperless` and `PACKAGE=paperless`. After the grouped creation block and next prompt, select the source native version and capture schedule before declaration rendering:

Run [Select the test issuer](README.md#test-tls-profile) in the selected Paperless deployment directory before continuing.

```bash
yq -i '.services.paperless.version = "3.3.0" |
  .services.paperless.backup.schedule = "*/5 * * * *" |
  .services.paperless.backup.timeZone = "Europe/Berlin"' "$VALUES"
```

This deliberately exercises the supported 3.3.0 → 3.3.1 replacement later. Continue declaration rendering and four-claim creation, using the approved capacities. At **DNS and external TLS**, source `operations/workstation.env` and use the [DNS checkpoint](#dns-checkpoint) with `HOST="$PAPERLESS_HOST"` and `IP="$B_IP"`, then resume Paperless's TLS procedure.

At **Compose with an existing Keycloak**, choose `KC_DEPLOYMENT=keycloak` and `KC_CONNECTIONS="$WORK_DIR/clusters/cluster-2/applications/keycloak/connections.yaml"`. Supply the retained current recovery-admin username/password from that Keycloak directory as Paperless's `protected/keycloak-admin/{username,password}`. Complete the package-owned realm/client preparation; do not create a second identity provider or select a direct issuer as well.

At **External backup inputs**, pause the Paperless terminal. In the separate Restic terminal, resume its selected deployment and use **Connect an application** with `REPOSITORY=paperless` and `CONSUMER_DIR="$WORK_DIR/clusters/cluster-2/applications/paperless"`. Its output is the scoped reader/writer directories, not administrative access.

Back in the Paperless terminal, read the actual URL for its direct-repository input:

```bash
export REPOSITORY_URL
REPOSITORY_URL=$(yq -er '.backup.providers.restic.repositories.paperless.repository' \
  "$WORK_DIR/clusters/cluster-1/applications/restic/restic-connections.yaml")
```

Run the remainder of **External backup inputs** with that value instead of its example URL. Complete **Prepare application credentials and configuration** and **Install and verify**. Preserve the independent Paperless key and OIDC client secret. Require current-generation Ready, native 3.3.0, trusted HTTPS and fresh native administrator login. Keep ordinary capture/ingestion semantics unchanged; the cross-service document and permission fixtures are in [service acceptance](verification.md#paperless-source-acceptance).

Continue with [Forgejo integration](forgejo.md), then exercise all source applications before retirement.

## DNS checkpoint

Run this workstation checkpoint separately when each package has rendered its hostname and before it requires the public route. The package supplies `HOST`; select A's address for Restic and B's for initial Keycloak, Forgejo and Paperless placements. This coordinates DNS only, not package configuration.

```bash
source "$WORK_DIR/operations/workstation.env"
: "${HOST:?Set the package-declared hostname}" "${IP:?Set its selected ingress address}"
DNS_SUBNAME=${HOST%."$DNS_ZONE"}
test "$DNS_SUBNAME.$DNS_ZONE" = "$HOST"
desec "$DNS_API/"
desec "$DNS_API/rrsets/" | jq .
DNS_TTL=$(desec "$DNS_API/" | jq -er '.minimum_ttl')
```

Reuse a matching A record. For an absent authorized record only:

```bash
desec --request POST "$DNS_API/rrsets/" --json \
  "$(jq -nc --arg name "$DNS_SUBNAME" --arg ip "$IP" --argjson ttl "$DNS_TTL" \
    '{subname:$name,type:"A",ttl:$ttl,records:[$ip]}')"
```

Inspect conflicts, including AAAA, before proceeding. An uncertain response requires a live read, not a blind write retry. Retain only the run's confirmed record and verify resolution:

```bash
HOST="$HOST" IP="$IP" DNS_TTL="$DNS_TTL" yq -i '.operations.dns[strenv(HOST)] = {
  "type":"A", "address":strenv(IP), "ttl":env(DNS_TTL)
}' "$VALUES"
for resolver in ns1.desec.io ns2.desec.org; do
  dig @"$resolver" "$HOST" A +norecurse +noall +comments +answer
done
dig @1.1.1.1 "$HOST" A +noall +comments +answer
dig @8.8.8.8 "$HOST" A +noall +comments +answer
```

Require authoritative `aa` answers and the intended address everywhere before certificate issuance. Do not remove unrelated records or overwrite another installation. Respect deSEC retry intervals.

## Retain source and replacement access

Keep protected inputs independently usable outside B/C and their Keycloak. A may additionally hold synthetic test-client material but must not be the only copy of recovery keys. The [Forgejo integration](forgejo.md) chapter exports all four service endpoints to A once their declarations exist.
