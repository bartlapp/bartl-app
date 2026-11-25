# Operator workstation

Prepare the common tools for the selected package procedure, then add only the tools needed for its provider, repository administration and credential storage. Supplied cluster access and protected credential files do not require Hetzner tools or a `pass` store. Installation records identify the actual providers and access arrangements; application packages retain their own supported deployment and recovery requirements.

## Tools

| Tool | Purpose | Requirement |
| --- | --- | --- |
| Git and OpenSSH | Clone and synchronize configuration and encrypted stores; access hosts | Authorized SSH identity |
| GitHub CLI (`gh`) | Create private repositories and inspect access and repository rules | Required for GitHub; authenticated as the authorized operator |
| Bash and standard Unix utilities | Run explicit access preparation and commissioning commands | Bash, including when the interactive shell is Zsh |
| direnv | Select Base's cluster-local working context | Required for the Base recipe; [hook into Bash](https://direnv.net/docs/hook.html) |
| pass | Read, generate and update encrypted credentials | Only when using a `pass` store |
| GnuPG, gpg-agent and pinentry | Encrypt/decrypt entries and unlock the operator key | Only for GPG-backed custody; usable private key and local prompt |
| [Mike Farah yq](https://github.com/mikefarah/yq#install) | Read YAML inventory as JSON | Go-based yq v4, not the Python tool of the same name |
| jq | Query JSON and check operation results | jq 1.6 or later |
| kubectl | Prepare access files and operate Kubernetes | Within one minor version of the target API server |
| Helm | Install and operate application packages | Helm 4.x, minimum supported version 4.3.0; select 4.3.2 for new workstation installations |
| OpenSSL / LibreSSL | Generate credentials and backup endpoint password hashes | `rand -hex` and `passwd -apr1 -stdin` |
| hcloud | Hetzner project operations | Only when creating or administering Hetzner resources |
| curl and dig | HTTPS client calls and DNS checks | Common package procedures; DNS administration uses the selected provider's interface |

Ruby and MessagePack are not required. Installing these tools does not install customer workloads on the workstation.

Helm 4.3.0 is the recorded tested baseline for the current journey and reference installation. It is our minimum supported recipe version, not a demonstrated technical minimum of Keycloak or K3s. The recipes use Helm 4's `--wait=legacy` syntax; Helm 3's boolean `--wait` is not compatible with these commands. Selecting a newer Helm version does not extend the existing qualification evidence: record the actual version and exercised path when verifying an installation.

## Install and configure

Agree new or replacement workstation dependencies with the affected operators before introducing them. Update this tool list, setup instructions and checks together; a new runtime is an operator prerequisite, not an invisible implementation detail.

Use the platform package manager or the tools' official distributions. On macOS with Homebrew, install missing tools rather than upgrading an existing qualified toolchain blindly:

```bash
brew install git bash direnv yq jq kubernetes-cli
```

This command does not pin versions. Select [Helm 4.3.2](https://github.com/helm/helm/releases/tag/v4.3.2) and a [kubectl version compatible with the target cluster](https://kubernetes.io/docs/tasks/tools/) explicitly. macOS supplies SSH, curl, dig and LibreSSL. On Linux, use distribution packages where they meet the requirements, otherwise use official release binaries.

For Hetzner resource operations, also install `hcloud` (`brew install hcloud`). For a `pass` store, install `pass`, GnuPG and a usable pinentry (`brew install pass gnupg pinentry-mac` on macOS).

For GitHub, install `gh` if missing (`brew install gh` on macOS). Supply `GH_TOKEN`/`GITHUB_TOKEN`, or authenticate with `gh auth login --hostname github.com`.

On macOS, if the supplied `openssl` fails the capability checks below, install and select Homebrew's OpenSSL:

```bash
brew install openssl@3
export PATH="$(brew --prefix openssl@3)/bin:$PATH"
```

### Verification and recovery clients

The operator workstation does not need a native Restic installation for the reference walkthrough. Its [client preparation](reference-installation/applications.md#prepare-the-verification-client-on-a) installs Restic on A before repository acceptance; later readback checks reuse it. Normal application capture/reconstruction and backend maintenance run in their packages.

Manual repository inspection or file recovery requires native Restic on the selected operator-controlled recovery host. A workstation may be selected deliberately for that purpose, but its binary and cache are not general onboarding prerequisites.

### Select the operating identity

Base and the package recipes use direnv to select retained cluster and deployment context, including for externally supplied clusters. Use a dedicated shell without inherited provider tokens, Helm target overrides or personal Kubernetes configuration. Select the intended cluster context and the credentials required by the operation; supplied credential files need no password-store setup. Until cluster selection succeeds, use `KUBECONFIG=/dev/null`. For Hetzner operations, select the intended provider token and use `HCLOUD_CONFIG=/dev/null` to avoid a personal default. Leaving a direnv scope restores the previous environment, not necessarily an empty one.

When using a `pass` store, select `PASSWORD_STORE_DIR` explicitly (use `/dev/null` until selection succeeds). A missing store or failed decryption must stop the operation, not select a personal default. Use your own GPG identity and explicitly select its keyring. Each authorized operator needs the recipient public keys and their own usable private key; never share private keys. On macOS, a terminal-independent prompt can be selected with `pinentry-program /usr/local/bin/pinentry-mac` in the relevant keyring's `gpg-agent.conf` (use the actual installed path, commonly `/opt/homebrew/bin/pinentry-mac` on Apple Silicon). Reload that dedicated agent after configuration changes. An execution environment with a sandbox needs access to its own keyring and agent sockets, not another operator's personal keyring.

### Verify recipient identities

Only for GPG-backed custody: use the selected `GNUPGHOME` and approved `RECIPIENT_FILE`; for an existing password store, use its `.gpg-id`. Select your own certification key:

```bash
gpg --list-secret-keys --keyid-format long
read -r -p 'Your certification-key fingerprint: ' SIGNING_FINGERPRINT
RECIPIENTS=($(cat "$RECIPIENT_FILE"))
for fingerprint in "${RECIPIENTS[@]}"; do
  gpg --fingerprint "$fingerprint"
done
```

Compare the full recipient fingerprints with independently verified identities. Locally certify the verified keys:

```bash
for fingerprint in "${RECIPIENTS[@]}"; do
  if [ "$fingerprint" != "$SIGNING_FINGERPRINT" ]; then
    gpg --local-user "$SIGNING_FINGERPRINT" --quick-lsign-key "$fingerprint"
  fi
done
```

These certifications stay in the operator's keyring and are non-exportable. They establish recipient identity without assigning recipients ownertrust. Use ordinary `pass` encryption and verify decryption through the installation procedure; no `--trust-model always` override is needed.


## Use supplied cluster access

Use this path to prepare local access to a compatible existing cluster, without provisioning or adopting its infrastructure. Supply its complete `installation.yaml` and kubeconfig. Obtain the public context loader through [Get the Base recipe](https://github.com/bartlapp/base-k3s/blob/main/README.md#get-the-base-recipe), stopping after the checkout sets `BASE_REPO`.

In direnv-hooked Bash, select the installation, its recorded cluster key and supplied access file:

```bash
export WORK_DIR="$HOME/bartl/acme/acme-installation"
export TARGET_CLUSTER=cluster-1
export SUPPLIED_KUBECONFIG=/protected/supplied-kubeconfig
```

For an installation not yet prepared on this workstation, copy the loader once. If its retained `.envrc` is already present, keep it instead:

```bash
cp "$BASE_REPO/installation.envrc" "$WORK_DIR/.envrc"
```

Review and approve the installation context:

```bash
cd "$WORK_DIR"
cat .envrc
direnv allow
```

At the next prompt, prepare the new cluster directory and retain its supplied kubeconfig:

```bash
mkdir -p "$WORK_DIR/clusters/$TARGET_CLUSTER/base"
printf 'source_env ../../.envrc\nload_cluster "${PWD##*/}"\n' \
  > "$WORK_DIR/clusters/$TARGET_CLUSTER/.envrc"
install -m 600 "$SUPPLIED_KUBECONFIG" "$WORK_DIR/clusters/$TARGET_CLUSTER/base/kubeconfig"
direnv allow "$WORK_DIR/clusters/$TARGET_CLUSTER"
cd "$WORK_DIR/clusters/$TARGET_CLUSTER"
```

At the next prompt, check the supplied cluster:

```bash
kubectl --context "$KUBE_CONTEXT" get --raw=/readyz
kubectl --context "$KUBE_CONTEXT" get nodes,storageclass
```

For already prepared access, enter its retained cluster directory and run those checks; do not repeat preparation. Retain the selectors and protected access independently, then continue with the selected package's prerequisites. Its ingress must preserve real client addresses wherever application admission uses source-IP allowlists. The cluster administrator owns provisioning, provider networking and removal. No Hetzner machine selector or provider credentials are needed here.

## Check the workstation

Run the common check below, then only the additional checks applicable to the operation. Standalone package use with supplied cluster access and credentials needs neither the Hetzner nor encrypted-store check. Do not print credential values.

```bash
for tool in git ssh bash direnv jq yq kubectl helm openssl curl dig; do
  command -v "$tool" || exit 1
done
yq --version
jq --version
helm version --short
kubectl version --client
openssl version
openssl rand -hex 32 >/dev/null
printf 'name: workstation-check\n' | yq -o=json '.' | jq -e '.name == "workstation-check"'
printf 'synthetic-check\n' | openssl passwd -apr1 -stdin >/dev/null
```

Verify the displayed yq implementation and major version, Helm version and kubectl compatibility against the table. These checks establish executable availability and parser/hash behavior, not provider authentication. A global Ruby installation or its gems have no role in the checks.

### Hetzner operations

Before creating or administering Hetzner resources:

```bash
command -v hcloud || exit 1
hcloud version
```

### Encrypted pass store

Only when retaining or retrieving credentials through `pass`:

```bash
for tool in pass gpg gpg-agent; do
  command -v "$tool" || exit 1
done
```

Select the authorized store and keyring as above. Verify actual decryption through the installation's access procedure; binary availability does not prove access to the private key or a working pinentry.

### GitHub repository administration

Only when creating or administering GitHub repositories (not for anonymous chart downloads):

```bash
gh --version
gh api user --jq .login
```

For supplied cluster access and protected credential files, continue directly with the selected package's access procedure. For a Git-backed installation with an encrypted store, clone both repositories and follow its access-selection and decryption procedure. Then use the read-only provider or cluster checks required by the operation. Cluster access cannot exist before its credentials have been issued. With multiple clusters, select the target explicitly; never merge with personal kubeconfigs.

Application tokens and kubeconfigs must never enter Git in plaintext. Access preparation may materialize restricted-permission credentials in ignored runtime storage. Ending the session does not erase these files; retain independently needed inputs before any authorized disposal. Credential creation, infrastructure provisioning and rotation are explicit operating steps, never side effects of directory entry.
