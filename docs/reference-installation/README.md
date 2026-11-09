# Bartl-Referenzaufbau auf drei K3s-Clustern

Diese manuelle Übung baut drei getrennte K3s-Cluster im eigenen Hetzner-Projekt auf, prüft den Betrieb und die unabhängige Recovery zweier Anwendungen und baut die Übungsressourcen wieder zurück. Einstieg und gemeinsame Eingaben stehen hier; die folgenden Kapitel führen durch die einzelnen Stationen.

## Ziel und Zuständigkeit

Drei eigenständige Single-Node-Cluster trennen Backup, laufende Anwendungen und Ersatz. A betreibt bartl-restic. B betreibt bartl-keycloak und bartl-forgejo mit Forgejos nativer OpenID-Connect-Anbindung an Keycloak. C enthält zunächst nur die K3s-Basis. Auf C werden beide Anwendungen aus ihren Backups rekonstruiert, geprüft und kontrolliert übernommen. A bleibt dabei verfügbar. Anschließend müssen beide Anwendungen auf C neue Backups erzeugen.

Der Installation Administrator führt jeden dienstübergreifenden Schritt selbst aus. Helm deklariert die Absicht; die vorhandenen Application Controller erledigen die internen Verfahren. Es gibt weder Company Controller noch ein Gesamt-Orchestrierungsskript. Bei einem Defekt oder einer ungeklärten Voraussetzung anhalten und die Ursache mit dem zuständigen Betreiber klären. Keine stillen Reparaturen, Versionswechsel oder Ausweichverfahren.

Die Übung verwendet ausschließlich synthetische Anwendungsdaten. Testdaten, Images, Backups, Datenbanken und Build-Artefakte gehören nicht auf die Workstation. Auf ihr liegen nur Git-Quellen, Installationswerte, geschützte Clusterzugänge und kleine Betriebsnachweise. Für diese Übung entstehen keine Builds. Der Backup-Host A hält später auch die geschützten Recovery-Eingaben und den Testclient; der Ausfall von A gehört nicht zu diesem Durchlauf.

Maßgeblich sind die [Kubernetes-Betriebspakete](https://github.com/bartlapp/bartl-app/blob/main/docs/how-to-bartlize.md#kubernetes-operating-packages), das [Kundeninstallationsrepo](https://github.com/bartlapp/bartl-app/blob/main/docs/how-to-bartlize.md#customer-installation-repository) und die [Betriebs- und Übergabeanforderungen](https://github.com/bartlapp/bartl-app/blob/main/docs/how-to-bartlize.md#operate-and-hand-over-an-installation). Die Paket-READMEs für [Restic](https://github.com/bartlapp/bartl-restic/blob/main/README.md), [Keycloak](https://github.com/bartlapp/bartl-keycloak/blob/main/README.md) und [Forgejo](https://github.com/bartlapp/bartl-forgejo/blob/main/README.md) besitzen die jeweiligen nativen Betriebsverfahren. Die festen öffentlichen OCI-Artefakte unten erfordern keinen Zugriff auf private Sources.

## Reihenfolge

1. Hier Budget prüfen, privates Installationsrepo initialisieren und drei K3s-Basen aufbauen.
2. [Anwendungen installieren](Anwendungen.md): DNS, Restic auf A und Keycloak auf B.
3. [Forgejo integrieren](Forgejo.md): native Konfiguration, Storage, SSH und Keycloak-Anbindung.
4. [Fachliche Prüfung](Pruefung.md): synthetische Daten, Git, LFS, PR, Issue, Anhang, Release und Package.
5. [Lifecycle und Recovery](Recovery.md): Backups, Paket-Upgrades, Restart, Stop/Start, finaler Capture, Fencing von B, Rekonstruktion und Upgrade auf C, Restic-Reinstall mit behaltenem PVC, kontrollierte Öffnung und neue Backups.
6. [Removal und Rückbau](Rueckbau.md): Forgejo-Reinstall mit behaltenen PVCs, Abruf neuer Arbeit aus dem anschließenden Backup, Belege und Ressourcenlöschung.

Die Blöcke sind eine einmalige Sequenz, kein idempotentes Installationsskript. Nach einem Stop-Punkt den tatsächlichen Zustand feststellen; nicht ganze Kapitel erneut ausführen. Die Kapitel unterscheiden Workstation und SSH-Sitzung ausdrücklich. Nach einem Terminalwechsel die in diesem Kapitel gesetzten Variablen wieder laden.

## Kosten vor dem ersten Server prüfen

Ein eigenes Hetzner-Cloud-Projekt mit aktivierter Abrechnung, einem eigenen Read/Write-API-Token und Kapazität für drei Debian-13-amd64-VMs vom Typ CPX32 in nbg1 bereitstellen. Projektname und Budgetfreigabe im Installationsrepo festhalten. Ausschließlich dieses freigegebene Projekt verwenden. Auf der Workstation werden Bash, Git, hcloud, jq, curl, OpenSSH mit geladenem Schlüssel, dig, OpenSSL 3, Helm 4.3.0 und ein zu Kubernetes 1.36 kompatibles kubectl benötigt. Die Workstation benötigt öffentliche IPv4-Konnektivität zu SSH und Kubernetes-API. Für die DNS-Befehle dieser Übung ist eine eigene, bereits delegierte deSEC-Zone mit eigenem Token zum Lesen, Anlegen, Ändern und Löschen ihrer Records erforderlich. Niemals fremde Tokens oder Zonen verwenden. Andere DNS-Provider erfordern ein entsprechend dokumentiertes Verfahren und sind nicht die hier gezeigte Variante. Niemals Shell-Tracing einschalten.

Tokens geschützt laden oder in der Bash ohne Shell-History-Eintrag eingeben:

```bash
read -r -s -p 'Hetzner project token: ' HCLOUD_TOKEN; printf '\n'
read -r -s -p 'deSEC token for your own zone: ' DESEC_TOKEN; printf '\n'
export HCLOUD_TOKEN DESEC_TOKEN
```

```bash
hcloud server list
hcloud primary-ip list
hcloud volume list
hcloud load-balancer list
hcloud server-type describe cpx32
hcloud api /pricing | jq '.pricing | {
  currency, vat_rate,
  server: [.server_types[] | select(.name == "cpx32")
    | .prices[] | select(.location == "nbg1")],
  ipv4: [.primary_ips[] | select(.type == "ipv4")
    | .prices[] | select(.location == "nbg1")]
}'
```

Die aktuellen Stundenpreise für drei Server und drei IPv4-Adressen, Steuern, Inklusivtraffic und mögliche Zusatzkosten gegen das eigene freigegebene Gesamtbudget rechnen. Währung, Preisstand, Rechnung und Reserve im Installationsrepo behalten. Diese Anleitung enthält weder eine Budgetfreigabe noch einen festen Providerpreis.

Stop-Punkt vor Provisionierung: Preise, Projekt, verfügbare Kapazität, Inklusivtraffic und Löschtermin prüfen. Keine zusätzlichen Volumes, Load Balancer, Snapshots oder kostenpflichtigen Backups bestellen. Einen konkreten UTC-Löschtermin vor dem ersten Server festlegen und die eigens erzeugten Ressourcen spätestens dann löschen; bei einer Unterbrechung ihre laufenden Kosten ausdrücklich berücksichtigen. Ein ausgeschalteter Server beendet die Berechnung nicht. Es ist kein automatischer Rückbau eingerichtet.

## Privates Installationsrepo initialisieren

Die wiederverwendbare Anleitung bleibt in bartl-app. Die tatsächlichen Werte, Secret-Verwahrungsreferenzen und Nachweise gehören in ein eigenes Repo je Kundeninstallation. Das folgende Repo bleibt lokal und privat, ohne Remote. Eine spätere Veröffentlichung oder ein Remote-Push gehört nicht zu diesen Befehlen. Recovery darf nicht vom Forgejo abhängen, das gerade wiederhergestellt werden soll.

In einer Bash auf der Workstation die eigenen Eingaben erfassen. Der absolute Zielordner muß neu sein. Den SSH-Key zuvor im eigenen Projekt registrieren, wie in der K3s-Anleitung beschrieben, und hier dessen Namen eingeben. Die eigenständig zugängliche geschützte Verwahrung muß unabhängig von B und vom wiederherzustellenden Forgejo sein; für dauerhaften Betrieb auch unabhängig von A.

```bash
read -r -p 'New absolute installation repository path: ' INSTALL_REPO
read -r -p 'Hetzner project name: ' HCLOUD_PROJECT
read -r -p 'Your delegated deSEC zone: ' DNS_ZONE
read -r -p 'Existing project SSH key name: ' SSH_KEY_NAME
read -r -p 'Approved total cost limit (including reserve): ' MAX_COST
read -r -p 'Budget currency: ' BUDGET_CURRENCY
read -r -p 'Deletion deadline (UTC, ISO 8601): ' DELETE_BY_UTC
read -r -p 'Independent protected custody reference (no secret): ' SECRET_CUSTODY_REF
export INSTALL_REPO
export K3S_SOURCE="$HOME/repos/bartlapp/base-k3s"
export INSTALLATION="bartl-$(date -u +%Y%m%d%H%M%S)-$(openssl rand -hex 3)"
export DNS_SUFFIX="$INSTALLATION.$DNS_ZONE"
(
set -euo pipefail
: "${INSTALL_REPO:?}" "${HCLOUD_PROJECT:?}" "${DNS_ZONE:?}" "${SSH_KEY_NAME:?}"
: "${MAX_COST:?}" "${BUDGET_CURRENCY:?}" "${DELETE_BY_UTC:?}" "${SECRET_CUSTODY_REF:?}"
case "$INSTALL_REPO" in /*) ;; *) printf 'Absolute path required\n' >&2; exit 1;; esac
umask 077
test ! -e "$INSTALL_REPO"
mkdir -m 700 "$INSTALL_REPO"
git init --initial-branch=work-reference-installation "$INSTALL_REPO"
cd "$INSTALL_REPO"
mkdir values evidence .lab
printf '%s\n' "Project: $HCLOUD_PROJECT" "Approved limit: $MAX_COST $BUDGET_CURRENCY" \
  "Delete by UTC: $DELETE_BY_UTC" "Protected custody reference: $SECRET_CUSTODY_REF" > evidence/operator-inputs.txt
printf '.lab/\n' > .gitignore
cat > README.md <<EOF
# Installation $INSTALLATION

Diese lokale private Installationsakte beginnt mit der Vorbereitung einer synthetischen Übung. Sie behauptet noch kein erfolgreiches Installations-, Recovery- oder Rückbauergebnis.

## Auftrag und Grenzen

- Eigenes Hetzner-Projekt: $HCLOUD_PROJECT
- Eigene DNS-Zone bei deSEC: $DNS_ZONE
- Freigegebenes Gesamtbudget einschließlich Reserve: $MAX_COST $BUDGET_CURRENCY
- Verbindlicher Löschtermin in UTC: $DELETE_BY_UTC
- Geschützte Verwahrung, nur Referenz ohne Secret-Inhalt: $SECRET_CUSTODY_REF

A hält Backup-Dienst, Recovery-Eingaben und Testclient. B betreibt Keycloak und Forgejo. C dient als unabhängiger Ersatz. Geprüft werden soll die Recovery bei ausgeschaltetem B, einschließlich nativer Anmeldung, erhaltener Daten und Rechte, neuer Writes und deren Backup. Ein gleichzeitiger Verlust von A und B gehört nicht zum Umfang. Für dauerhaften Betrieb müssen die Eingaben zusätzlich unabhängig von A verwahrt werden.

## Betrieb und Nachweise

Die [manuelle Ablaufanleitung](https://github.com/bartlapp/bartl-app/blob/main/docs/reference-installation/README.md) besitzt die vollständigen Aufbau-, Prüf-, Recovery- und Rückbauschritte. Dienstübergreifende Schritte bleiben menschliche Aufgaben.

[installation.env](installation.env) hält die ausgewählten unveränderlichen Pakete und nicht geheimen Eingaben. [values/](values/) hält die deklarierte Absicht, eigene Infrastrukturmanifeste und vor dem Abschalten exportierte wirksame Helm-Werte. [evidence/](evidence/) hält die eigenen Eingaben und die im Ablauf erzeugten bereinigten Resultate. Secret-Namen, Zweck, Eigentümer und tatsächliche Verwahrungsreferenzen werden dort ohne Secret-Inhalte festgehalten.

Den aktuellen Betriebspunkt, Abweichungen und tatsächliche Ergebnisse beim Erreichen jeder Schreibgrenze hier nachtragen. Erfolg nur mit den zugehörigen erhaltenen Nachweisen festhalten. Vor dem Löschen von A entscheiden, ob die synthetischen Recovery-Eingaben verworfen werden dürfen oder für eine fortbestehende Installation unabhängig geschützt erhalten bleiben müssen.
EOF
)
```

Bei einem Fehler im begrenzten Initialisierungsblock hier anhalten und die Eingabe oder den tatsächlichen Verzeichniszustand klären. Die interaktive Shell bleibt offen; nicht mit den Folgeblöcken fortfahren und kein vorhandenes Repository überschreiben.

Nur nach erfolgreichem Initialisierungsblock ins neue Repo wechseln:

```bash
cd "$INSTALL_REPO"
```

`values/` enthält die vollständigen wirksamen Helm-Werte ohne Secret-Inhalte. `evidence/` enthält kleine, bereinigte Betriebsnachweise. `.lab/` bleibt außerhalb von Git; dort liegen insbesondere kubeconfigs, SSH-Hostschlüssel und Erzeugungsbelege. Paßwörter und sonstige Secret-Inhalte werden nicht in Git aufgenommen.

Die Paketwahl ist Bestandteil der Anleitung, keine weitere freie Eingabe:

```bash
cat > installation.env <<EOF
INSTALLATION=$INSTALLATION
DNS_ZONE=$DNS_ZONE
BACKUP_HOST=backup.$DNS_SUFFIX
KC_HOST=keycloak.$DNS_SUFFIX
FORGEJO_HOST=forgejo.$DNS_SUFFIX
LOCATION=nbg1
SERVER_TYPE=cpx32
SSH_KEY_NAME="$SSH_KEY_NAME"
RESTIC_SOURCE=oci://ghcr.io/bartlapp/bartl-restic@sha256:aeaa22dd009fd505c86049de285c81e0a44ab68640f528dc297d6d67efd306de
RESTIC_CHART=oci://ghcr.io/bartlapp/bartl-restic@sha256:78d118df791192bcc8dc08ce7ce13ded3ac01b51c33cd19090c30cb7c2d8f20a
KEYCLOAK_SOURCE=oci://ghcr.io/bartlapp/bartl-keycloak@sha256:e5ec4b622b6b1aec736ae9aecec298c706d12aeed78215c154ddeacbb59257c4
KEYCLOAK_CHART=oci://ghcr.io/bartlapp/bartl-keycloak@sha256:05e664e8c561685ba605a5a02ccc6649aafbb7c3bf3a0c808abc91cffae53aa0
FORGEJO_CHART=oci://ghcr.io/bartlapp/bartl-forgejo@sha256:c9d6e7189d29b7b2923a61c5036e38197005912fdd68c6acec6a78654e297f3c
EOF
source installation.env

helm show chart "$RESTIC_SOURCE"
helm show chart "$RESTIC_CHART"
helm show chart "$KEYCLOAK_SOURCE"
helm show chart "$KEYCLOAK_CHART"
helm show chart "$FORGEJO_CHART"
```

Erwartet werden Restic 0.2.0 und 0.2.1, Keycloak 0.5.0 und 0.5.1 sowie Forgejo-Paket 0.1.0. Keycloak verwendet in beiden Paketen nativ 26.6.2. Der native Versionsübergang dieser Übung ist Forgejo 16.0.7 auf 17.0.1. Keine Image-Overrides und keine beweglichen Chart-Tags verwenden.

## Drei unabhängige K3s-Basen aufbauen

Die [bestehende K3s-Anleitung](https://github.com/bartlapp/base-k3s/blob/main/README.md) besitzt die Provisionierungs-, SSH-, Installations- und Rückbaubefehle. Nicht drei Nodes zu einem gemeinsamen Cluster verbinden. Jeder Durchlauf installiert einen eigenen K3s-Server ohne Join-Token eines anderen Clusters.

Das Repository `base-k3s` unter dem oben gesetzten Pfad als Geschwisterrepo der Bartl-Repositories aus `https://github.com/bartlapp/base-k3s.git` klonen, falls es noch nicht vorhanden ist. Drei getrennte Arbeitskopien verhindern, daß die `.lab/kubeconfig` oder `.lab/ssh.config` der K3s-Anleitung den vorherigen Cluster überschreibt:

```bash
git clone --no-hardlinks "$K3S_SOURCE" "$INSTALL_REPO/.lab/a"
git clone --no-hardlinks "$K3S_SOURCE" "$INSTALL_REPO/.lab/b"
git clone --no-hardlinks "$K3S_SOURCE" "$INSTALL_REPO/.lab/c"
```

Den folgenden Einstieg nacheinander mit `SLOT=a`, `SLOT=b` und `SLOT=c` verwenden:

```bash
SLOT=a
cd "$INSTALL_REPO/.lab/$SLOT"
source "$INSTALL_REPO/installation.env"
export NAME="$INSTALLATION-$SLOT"
export LOCATION SERVER_TYPE SSH_KEY_NAME
SSH_PUBLIC_KEY=$(ssh-add -L)
export SSH_PUBLIC_KEY="${SSH_PUBLIC_KEY%%$'\n'*}"
export STATE="$PWD/.lab/$NAME"
```

Jetzt in dieser Arbeitskopie die K3s-Anleitung ab "Create the VM with Hetzner" ausführen. Die gerade gesetzten Werte nicht durch die dortigen Beispielwerte ersetzen. Den vorhandenen Projekt-SSH-Key wiederverwenden. Danach "Connect and follow logs", "Install K3s", "Enable workstation access", "Install certificate management" und "Verify and hand over the base" vollständig ausführen. Den optionalen Hello-World-Durchlauf auslassen.

Erfolgskontrolle je Cluster: ein Ready-Node, verfügbare CoreDNS-, local-path-, Traefik- und cert-manager-Deployments, default StorageClass `local-path`, Traefik-IngressClass, vorhandene KUBE-ROUTER-FORWARD-Regeln und korrekt zugeordnete Hetzner-Firewall. SSH und Kubernetes-API dürfen nur von der Administrator-IPv4 erreichbar sein; HTTP und HTTPS werden für die späteren Endpunkte benötigt.

Nach allen drei Durchläufen auf der Workstation zurück ins Installationsrepo wechseln:

```bash
cd "$INSTALL_REPO"
export KA="$INSTALL_REPO/.lab/a/.lab/kubeconfig"
export KB="$INSTALL_REPO/.lab/b/.lab/kubeconfig"
export KC="$INSTALL_REPO/.lab/c/.lab/kubeconfig"
for config in "$KA" "$KB" "$KC"; do
  kubectl --kubeconfig "$config" config current-context
  kubectl --kubeconfig "$config" get namespace kube-system \
    -o jsonpath='{.metadata.uid}{"\n"}'
done
kubectl --kubeconfig "$KC" get namespaces,pvc --all-namespaces
```

Die drei `kube-system`-UIDs müssen verschieden sein. C darf noch keine Anwendungsnamespaces oder PVCs enthalten. Ab hier immer den angegebenen kubeconfig verwenden; niemals aus dem zuletzt verwendeten Terminal auf den Zielcluster schließen.

## Workstation-Sitzungen wieder aufnehmen

Nach dem Basisaufbau folgenden geschützten lokalen Sitzungseinstieg erzeugen. Er enthält keine Tokens. Die kleinen Dateien unter `.lab/` bleiben geschützt und außerhalb von Git.

```bash
cat > .lab/workstation.env <<'ENV'
: "${INSTALL_REPO:?Absolute path of your installation repository required}"
: "${HCLOUD_TOKEN:?Load your own project token from protected custody}"
: "${DESEC_TOKEN:?Load your own deSEC zone token from protected custody}"
export HCLOUD_TOKEN DESEC_TOKEN
cd "$INSTALL_REPO"
source installation.env
export KA="$INSTALL_REPO/.lab/a/.lab/kubeconfig"
export KB="$INSTALL_REPO/.lab/b/.lab/kubeconfig"
export KC="$INSTALL_REPO/.lab/c/.lab/kubeconfig"
A_IP=$(cat ".lab/a/.lab/$INSTALLATION-a/host")
B_IP=$(cat ".lab/b/.lab/$INSTALLATION-b/host")
C_IP=$(cat ".lab/c/.lab/$INSTALLATION-c/host")
ADMIN_IP=$(curl --ipv4 --fail --silent --show-error https://api.ipify.org)
DNS_API="https://desec.io/api/v1/domains/$DNS_ZONE"
desec() {
  printf 'header = "Authorization: Token %s"\n' "${DESEC_TOKEN:?}" |
    curl --config - --fail-with-body --silent --show-error "$@"
}
current_condition() {
  local config="$1" namespace="$2" resource="$3" condition="$4"
  kubectl --kubeconfig "$config" -n "$namespace" get "$resource" -o json |
    jq -e --arg condition "$condition" '
      .metadata.generation as $g | .status.observedGeneration==$g and
      any(.status.conditions[]; .type==$condition and .status=="True" and .observedGeneration==$g)'
}
ENV
source .lab/workstation.env
git -C "$K3S_SOURCE" rev-parse HEAD > evidence/base-k3s-revision.txt
```

In jedem neuen Workstation-Terminal `INSTALL_REPO` wieder auf den eigenen absoluten Pfad setzen, die zwei eigenen API-Tokens geschützt laden und `source "$INSTALL_REPO/.lab/workstation.env"` ausführen. Hat sich die Administrator-IPv4 geändert, zuerst in jedem Basis-Checkout das dokumentierte Verfahren "Update administrator access" ausführen und die späteren anwendungsspezifischen Allowlisten ebenfalls kontrolliert anpassen. SSH-Befehle der Folgekapitel öffnen jeweils eine eigene A-Sitzung; nach `exit` geht es auf der Workstation weiter.

Die Secret-Inhalte werden auf A erzeugt, nicht ins Installationsrepo kopiert. Dort ihre Namen, Zweck, Eigentümer und die tatsächlichen geschützten Verwahrungsreferenzen festhalten. A ist in dieser Übung ein unabhängiger Recovery-Eingabeträger gegenüber B; der gemeinsame Verlust von A und B wird nicht geprüft. Vor dauerhafter Übergabe müssen Repository-Schlüssel, Reader-/Writer-/Admin-Credentials, native Konfiguration und Identity-Secrets, Keycloak-Recovery-Zugang und administrative Infrastrukturzugänge zusätzlich in der benannten kundenseitig kontrollierten Verwahrung liegen. Ihre Lesbarkeit ohne die zu rettenden Dienste prüfen. Aufbewahrungsdauer, zulässigen Datenverlust, Recovery-Zeit und Löschverantwortung vor einem dauerhaften Betrieb festlegen; der Lab-Rückbau verwirft ausschließlich die hier erzeugten synthetischen Daten.

Weiter mit [Anwendungen installieren](Anwendungen.md).
