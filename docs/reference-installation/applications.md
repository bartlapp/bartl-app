# Install Restic on A and Keycloak on B

Complete the [three-base setup](README.md). Keep C empty. Every package uses the existing absolute `WORK_DIR` and `VALUES`; replace sample installation paths in package recipes with these retained paths. Run package creation blocks once, with the choices below, rather than pre-creating records and then running creation again.

## Install the backup endpoint on A

Enter A's cluster directory and wait for the next prompt so Base selects its access:

```bash
cd "$WORK_DIR/clusters/cluster-1"
```

At that next prompt, start a child Bash without direnv's prompt hook and load the cross-service facts:

```bash
bash --noprofile --norc
source "$WORK_DIR/operations/workstation.env"
```

Run the entire Restic setup below in this child shell. Base clears deployment fields when the watched installation record changes in a cluster-scoped interactive shell; Restic's manual interface instead retains the variables supplied by its own recipe.

Follow the [Restic README](https://github.com/bartlapp/bartl-restic/blob/main/README.md#prerequisites-and-release) from archive acquisition through **Configure a new endpoint**. Keep its verified 0.3.0 archive. In the creation block select `DEPLOYMENT=restic`, `INSTANCE=restic`, `CLUSTER_ID=cluster-1`, `NS=backup`, `RELEASE=backup`, `PACKAGE=restic`, `REPOSITORY=keycloak` and `CAPACITY=25Gi`. The capacity is a synthetic exercise choice, not production sizing.

Continue through declaration rendering and storage creation. At **Prepare DNS, TLS and repository credentials**, use the [DNS checkpoint](#dns-checkpoint) below with `HOST="$RESTIC_HOST"` and `IP="$A_IP"`, then resume the package's TLS and credential preparation. Retain its repository encryption key, distinct reader/writer/admin transport passwords, `htpasswd` and validating CA independently. Use managed TLS or explicitly retained external TLS, never competing certificate owners.

Complete **Install and verify**, including the native writer/reader round-trip for `keycloak`. Then follow [Add a repository](https://github.com/bartlapp/bartl-restic/blob/main/README.md#add-a-repository) with `REPOSITORY=forgejo`, not its sample `paperless`, and repeat the package round-trip for that repository. Do not replace the repository list or generate any credential twice. Native package admission initializes genuinely new repositories; never run `restic init` separately.

```bash
source "$WORK_DIR/operations/workstation.env"
for repository in keycloak forgejo; do
  code=$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "https://$BACKUP_HOST/$repository/config")
  test "$code" = 401
done
current_condition "$KA" backup resticapplication/backup-restic Ready
```

Require trusted public HTTPS and authenticated reader access through the package's procedure. Readers may manage native locks but not mutate backup content; writers are append-only; maintenance authority stays separate. A survives this exercise but is not an independent secondary backup: its loss is outside the claim.

After Restic acceptance, leave this child shell before selecting B:

```bash
exit
```

## Create Keycloak's deployment on B

Enter B and wait for the next prompt:

```bash
cd "$WORK_DIR/clusters/cluster-2"
```

Follow the current [Keycloak new-deployment procedure](https://github.com/bartlapp/bartl-keycloak/blob/main/README.md#install-a-new-deployment), starting at **Obtain the release**. Use its latest-stable acquisition and cache procedure, subject to the [publication limitation](README.md#package-handoffs). In **Configure the installation**, choose `DEPLOYMENT=keycloak`, `INSTANCE=keycloak`, `NS=keycloak`, `RELEASE=keycloak` and `PACKAGE=keycloak`; Base has selected `CLUSTER_ID=cluster-2`.

Run the complete Configure creation block and wait for the next prompt in its deployment directory. It creates an empty `services.keycloak` entry. Only **after that block**, and before its declaration rendering or installation, supply the composition choices:

```bash
yq -i '.services.keycloak.backup.endpoint = "restic" |
  .services.keycloak.backup.schedule = "0 2 * * *" |
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

At Keycloak's **External backup inputs**, leave its selected deployment directory and `INSTALL_DIR` unchanged. Restic must already be Ready with the `keycloak` repository admitted. Start a child Bash to keep Restic's package variables separate:

```bash
bash --noprofile --norc
export REPOSITORY=keycloak
export CONSUMER_DIR="$WORK_DIR/clusters/cluster-2/applications/keycloak"
```

In that child shell, run Restic's [Resume an existing deployment](https://github.com/bartlapp/bartl-restic/blob/main/README.md#resume-an-existing-deployment) for `DEPLOYMENT=restic`, preserving the existing `WORK_DIR` and `VALUES`. Then run **Connect an application**, using the `REPOSITORY` and `CONSUMER_DIR` assignments above instead of its Paperless examples. When the handoff completes, return to the Keycloak shell:

```bash
exit
```

The handoff copies the retained encryption key, scoped reader/writer usernames and transport passwords, and validating CA into Keycloak's `repository/reader/` and `repository/writer/`. It does not hand off repository-admin authority. On resumption, retain these files rather than recopying or regenerating them. The composed URL already comes from Restic's declaration; do not execute the handoff prose's alternative direct-URL assignment.

Return to Keycloak's **Install and inspect** in the still-selected deployment. Refresh declarations, create namespace `keycloak`, native credential Secrets and backup reader/writer Secrets, then perform the ordinary install and TLS/current-generation readiness checks exactly as documented. Complete **Verify Keycloak** and **Retain operating and recovery inputs**, including the current backed-up master-realm administrator at `INSTALL_DIR/recovery-admin/`. Verify fresh administration through `https://$KC_HOST/admin/` before [integrating Forgejo](forgejo.md).

## DNS checkpoint

Run this workstation checkpoint separately when each package has rendered its hostname and before it requires the public route. The package supplies `HOST`; select A's address for Restic and B's address for the initial Keycloak/Forgejo placements. This coordinates DNS only, not package configuration.

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

Keep protected inputs independently usable outside B/C and their Keycloak. A may additionally hold synthetic test-client material but must not be the only copy of recovery keys. Continue with [Forgejo integration](forgejo.md); that chapter exports the three actual service endpoints to A once all declarations exist.
