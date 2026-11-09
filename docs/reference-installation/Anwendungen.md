# Anwendungen installieren

Vor dem ersten Block auf der Workstation den [Sitzungseinstieg](README.md#workstation-sitzungen-wieder-aufnehmen) laden:

```bash
source "${INSTALL_REPO:?}/.lab/workstation.env"
```

Fortsetzung der [K3s-Basis](README.md). Alle Workstation-Befehle laufen in `$INSTALL_REPO`, außer wenn der Block ausdrücklich die SSH-Sitzung auf A eröffnet. `KA`, `KB` und `KC` bezeichnen die drei absoluten kubeconfig-Pfade aus der Hauptanleitung. C bleibt bis zur Recovery ohne Anwendungen.

## Endpunkte vorbereiten

```bash
cd "$INSTALL_REPO"
source installation.env
A_IP=$(cat ".lab/a/.lab/$INSTALLATION-a/host")
B_IP=$(cat ".lab/b/.lab/$INSTALLATION-b/host")
C_IP=$(cat ".lab/c/.lab/$INSTALLATION-c/host")
ADMIN_IP=$(curl --ipv4 --fail --silent --show-error https://api.ipify.org)
```

Bei deSEC zunächst die Zone und vorhandenen Records lesen. Die Funktion übergibt den Token über stdin, nicht als Prozeßargument:

```bash
desec() {
  printf 'header = "Authorization: Token %s"\n' "${DESEC_TOKEN:?}" |
    curl --config - --fail-with-body --silent --show-error "$@"
}
DNS_API="https://desec.io/api/v1/domains/$DNS_ZONE"
desec "$DNS_API/"
desec "$DNS_API/rrsets/" | jq .
```

Nur unbenutzte Namen anlegen. Die drei Records nacheinander erstellen; bei HTTP 429 die angegebene Wartezeit einhalten, bei unklarem Ergebnis zuerst den Record lesen. Kein bestehender Record wird überschrieben.

```bash
for pair in "$BACKUP_HOST $A_IP" "$KC_HOST $B_IP" "$FORGEJO_HOST $B_IP"; do
  read -r host ip <<< "$pair"
  desec --request POST "$DNS_API/rrsets/" --json \
    "$(jq -nc --arg name "${host%.$DNS_ZONE}" --arg ip "$ip" \
      '{subname:$name,type:"A",ttl:900,records:[$ip]}')"
  sleep 2
done
```

Die 900 Sekunden TTL dienen dem geplanten Handover. Vor Zertifikatsanforderungen müssen beide autoritativen Server und die öffentlichen Resolver die richtige IPv4 liefern. Keine zusätzlichen AAAA-Records anlegen.

```bash
for host in "$BACKUP_HOST" "$KC_HOST" "$FORGEJO_HOST"; do
  for resolver in ns1.desec.io ns2.desec.org 1.1.1.1 8.8.8.8; do
    dig @"$resolver" "$host" A +noall +comments +answer
  done
done
```

Stop-Punkt: Autoritative Antworten benötigen das Flag `aa`; sämtliche Antworten müssen zur vorgesehenen VM gehören. Bei einem lokalen Problem mit der Auflösung des Nameserver-Namens dessen Adresse durch DNS ermitteln und dieselbe autoritative Gegenstelle direkt befragen. Nicht die Workstation-DNS-Konfiguration oder TLS-Prüfung verändern.

## A: getrennte Backup-Repositories

```bash
kubectl --kubeconfig "$KA" create namespace backup
(cd .lab/a; ssh -F .lab/ssh.config k3s)
```

Die folgenden Befehle laufen in dieser SSH-Sitzung auf A. Sie erzeugen die geschützten Eingaben ausschließlich dort. Reader, Writer und Admin erhalten je Anwendung verschiedene Paßwörter; Reader und Writer verwenden denselben Repository-Schlüssel.

```bash
set -euo pipefail
umask 077
mkdir -m 700 /root/bartl-reference
mkdir /root/bartl-reference/repositories
for app in keycloak forgejo; do
  mkdir "/root/bartl-reference/repositories/$app"
  cd "/root/bartl-reference/repositories/$app"
  openssl rand -hex 32 | tr -d '\n' > password
  for role in writer reader admin; do
    mkdir "$role"
    printf '%s' "$role" > "$role/username"
    openssl rand -hex 32 | tr -d '\n' > "$role/restPassword"
    cp password "$role/password"
    cp /etc/ssl/certs/ca-certificates.crt "$role/ca.crt"
    printf '%s:%s\n' "$role" \
      "$(openssl passwd -apr1 -stdin < "$role/restPassword")" >> htpasswd
  done
  kubectl -n backup create secret generic "$app-repository-auth" --from-file=htpasswd
  kubectl -n backup create secret generic "$app-repository-key" --from-file=password
  kubectl -n backup create secret generic "$app-repository-admin" --from-file=admin/
done
exit
```

Zurück auf der Workstation. Den Restic-PVC und öffentlich vertrauenswürdiges TLS anlegen. Traefik reicht TLS unverändert an den Restic-Service weiter. Entscheidend ist Service-Port 443, nicht Pod-Port 8443.

```bash
cat > values/restic-a.yaml <<'YAML'
application:
  replicas: 1
existingClaim: repository
tlsSecret: repository-tls
repositories:
  - name: keycloak
    authSecret: keycloak-repository-auth
    passwordSecret: keycloak-repository-key
  - name: forgejo
    authSecret: forgejo-repository-auth
    passwordSecret: forgejo-repository-key
YAML
cat > values/restic-infrastructure.yaml <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: repository
  namespace: backup
spec:
  accessModes: [ReadWriteOnce]
  storageClassName: local-path
  resources:
    requests:
      storage: 25Gi
---
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: letsencrypt
  namespace: backup
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-account
    solvers:
      - http01:
          ingress:
            ingressClassName: traefik
            serviceType: ClusterIP
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: repository-tls
  namespace: backup
spec:
  secretName: repository-tls
  dnsNames: ["$BACKUP_HOST"]
  issuerRef:
    name: letsencrypt
    kind: Issuer
---
apiVersion: traefik.io/v1alpha1
kind: IngressRouteTCP
metadata:
  name: restic
  namespace: backup
spec:
  entryPoints: [websecure]
  routes:
    - match: HostSNI(\`$BACKUP_HOST\`)
      services:
        - name: backup-restic
          port: 443
  tls:
    passthrough: true
EOF
export KUBECONFIG="$KA"
kubectl apply -f values/restic-infrastructure.yaml
kubectl -n backup wait certificate/repository-tls --for=condition=Ready --timeout=10m
helm install backup "$RESTIC_SOURCE" -n backup -f values/restic-a.yaml \
  --wait=legacy --timeout=5m
kubectl -n backup wait resticapplication/backup-restic --for=condition=Ready --timeout=30m
kubectl -n backup get resticapplication/backup-restic -o json | jq -e '
  .metadata.generation as $g | .status.observedGeneration==$g and
  any(.status.conditions[]; .type=="Ready" and .status=="True" and .observedGeneration==$g)'
curl --silent --show-error --output /dev/null --write-out '%{http_code}\n' \
  "https://$BACKUP_HOST/keycloak/config"
```

Die letzte Antwort muß `401` sein, bei gültiger TLS-Prüfung. Ein TLS-Fehler ist kein erfolgreicher Zugriffsschutz. Reader-Zugriff mit den geschützten Credentials auf A prüfen; die verschlüsselte Repository-Konfiguration nicht ins Terminal ausgeben:

```bash
(cd .lab/a;
 scp -F .lab/ssh.config ../../installation.env k3s:/root/bartl-reference/installation.env
 ssh -F .lab/ssh.config k3s)
```

In der geöffneten SSH-Sitzung auf A:

```bash
cd /root/bartl-reference/repositories/keycloak/reader
source /root/bartl-reference/installation.env
printf 'user = "reader:%s"\n' "$(cat restPassword)" |
  curl --config - --fail --silent --show-error --output /dev/null \
  "https://$BACKUP_HOST/keycloak/config"
exit
```

## B: Keycloak

Die [Keycloak-Anleitung](https://codeberg.org/bartlapp/bartl-keycloak/src/branch/main/README.md#install-keycloak) liefert die vollständigen TLS-, Secret- und Installationsblöcke. Für diesen Durchlauf gelten folgende Eingaben und Abweichungen:

- Cluster B, Namespace und Release `keycloak`.
- Chart `$KEYCLOAK_SOURCE`, später Upgrade auf `$KEYCLOAK_CHART`.
- Installation `$INSTALLATION`, Instanz `keycloak`, Hostname `https://$KC_HOST`.
- Datenbank 5 GiB auf `local-path`.
- Credentials auf A unter `/root/bartl-reference/keycloak/` erzeugen und dort behalten. Nicht den Beispielblock ausführen, der die Bootstrap-Credentials nach Secret-Erstellung löscht; sie werden für Recovery benötigt.
- Recovery-Administrator ist derselbe gesicherte native Administrator, kein neu erzeugter Benutzer.
- Backup sofort gegen das leere Repository auf A konfigurieren. Keine zweite oder provisorische Backup-Gegenstelle auf B anlegen.

Die vollständigen gewünschten Werte auf der Workstation schreiben:

```bash
cat > values/keycloak-b.yaml <<EOF
identity:
  installation: "$INSTALLATION"
  instance: keycloak
configuration:
  hostname: "https://$KC_HOST"
application:
  replicas: 1
database:
  secretName: keycloak-database
  adminSecretName: keycloak-database-admin
  size: 5Gi
bootstrapAdminSecret: keycloak-bootstrap
recoveryAdminSecret: keycloak-recovery
ingress:
  enabled: true
  className: traefik
  tlsSecretName: keycloak-tls
  maintenance: false
  administratorSourceRanges: ["$ADMIN_IP/32", "$A_IP/32"]
  controllerNamespace: kube-system
backup:
  repository: "rest:https://$BACKUP_HOST/keycloak/"
  readerSecret: keycloak-backup-reader
  writerSecret: keycloak-backup-writer
  schedule: "0 2 * * *"
  timeZone: Europe/Berlin
  suspend: true
EOF
kubectl --kubeconfig "$KB" create namespace keycloak
```

In der SSH-Sitzung auf A die drei Credentials-Verzeichnisse vorbereiten:

```bash
(cd "$INSTALL_REPO/.lab/a"; ssh -F .lab/ssh.config k3s)
```

In der geöffneten SSH-Sitzung auf A:

```bash
umask 077
mkdir -p /root/bartl-reference/keycloak/{database-b,database-admin-b,bootstrap}
cd /root/bartl-reference/keycloak
printf keycloak > database-b/username
printf keycloak > database-b/database
openssl rand -hex 32 | tr -d '\n' > database-b/password
printf postgres > database-admin-b/username
openssl rand -hex 32 | tr -d '\n' > database-admin-b/password
printf admin > bootstrap/username
openssl rand -hex 32 | tr -d '\n' > bootstrap/password
exit
```

Secrets von A über stdin unmittelbar in B anlegen, ohne lokale Secret-Datei:

```bash
(cd .lab/a; ssh -F .lab/ssh.config k3s 'bash -se' <<'REMOTE'
set -euo pipefail
cd /root/bartl-reference/keycloak
kubectl -n keycloak create secret generic keycloak-database --from-file=database-b/ --dry-run=client -o yaml
printf '\n---\n'
kubectl -n keycloak create secret generic keycloak-database-admin --from-file=database-admin-b/ --dry-run=client -o yaml
printf '\n---\n'
kubectl -n keycloak create secret generic keycloak-bootstrap --from-file=bootstrap/ --dry-run=client -o yaml
printf '\n---\n'
kubectl -n keycloak create secret generic keycloak-recovery --from-file=bootstrap/ --dry-run=client -o yaml
for role in reader writer; do
  printf '\n---\n'
  kubectl -n keycloak create secret generic "keycloak-backup-$role" \
    --from-file="/root/bartl-reference/repositories/keycloak/$role/" --dry-run=client -o yaml
done
REMOTE
) | kubectl --kubeconfig "$KB" create -f -
```

Auf der Workstation die TLS-Manifeste für beide Anwendungen aus den gemeinsamen Eingaben erzeugen:

```bash
for app in keycloak forgejo; do
  case "$app" in
    keycloak) host=$KC_HOST ;;
    forgejo) host=$FORGEJO_HOST ;;
  esac
  cat > "values/$app-tls.yaml" <<EOF
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: letsencrypt
  namespace: $app
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-account
    solvers:
      - http01:
          ingress:
            ingressClassName: traefik
            serviceType: ClusterIP
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: $app-tls
  namespace: $app
spec:
  secretName: $app-tls
  dnsNames: ["$host"]
  issuerRef:
    name: letsencrypt
    kind: Issuer
EOF
done
```

```bash
export KUBECONFIG="$KB"
kubectl apply -f values/keycloak-tls.yaml
kubectl -n keycloak wait certificate/keycloak-tls --for=condition=Ready --timeout=10m
helm install keycloak "$KEYCLOAK_SOURCE" -n keycloak -f values/keycloak-b.yaml \
  --wait=legacy --timeout=10m
kubectl -n keycloak wait keycloakapplication/keycloak --for=condition=Ready --timeout=10m
kubectl -n keycloak get keycloakapplication/keycloak -o json
curl --fail --silent --show-error \
  "https://$KC_HOST/realms/master/.well-known/openid-configuration" | jq .issuer
```

Stop-Punkt: `status.observedGeneration` und die Ready-Condition müssen zur aktuellen Generation gehören. Die Administration über `https://$KC_HOST/admin/` muß mit dem gesicherten Administrator funktionieren. Erst dann Forgejo installieren.
