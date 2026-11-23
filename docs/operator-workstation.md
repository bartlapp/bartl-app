# Operator workstation

Prepare this workstation before using an installation checkout or the [reference installation](reference-installation/README.md). Installation repositories link here and specify their actual providers, credentials, cluster versions and any deviations. Application packages retain their own supported deployment and recovery requirements.

## Tools

| Tool | Purpose | Requirement |
| --- | --- | --- |
| Git and OpenSSH | Clone and synchronize configuration and encrypted stores; access hosts | Authorized SSH identity |
| Bash and standard Unix utilities | Run explicit access preparation and commissioning commands | Bash, including when the interactive shell is Zsh |
| direnv | Select Base's cluster-local working context | Required for the Base recipe; [hook into Bash](https://direnv.net/docs/hook.html) |
| pass | Read, generate and update encrypted credentials | GnuPG-backed password store |
| GnuPG, gpg-agent and pinentry | Encrypt/decrypt entries and unlock the operator key | Working local passphrase prompt |
| [Mike Farah yq](https://github.com/mikefarah/yq#install) | Read YAML inventory as JSON | Go-based yq v4, not the Python tool of the same name |
| jq | Query JSON and check operation results | jq 1.6 or later |
| kubectl | Prepare access files and operate Kubernetes | Within one minor version of the target API server |
| Helm | Install and operate application packages | Helm 4.x, minimum supported version 4.3.0; select 4.3.2 for new workstation installations |
| OpenSSL | Prepare backup endpoint password hashes | OpenSSL 3 with `passwd -apr1` support |
| hcloud | Hetzner project operations | Required for the Hetzner profile |
| curl and dig | DNS API requests and authoritative/public DNS checks | Required for the deSEC profile |

Ruby and MessagePack are not required. Installing these tools does not install customer workloads on the workstation.

Helm 4.3.0 is the recorded tested baseline for the current journey and reference installation. It is our minimum supported recipe version, not a demonstrated technical minimum of Keycloak or K3s. The recipes use Helm 4's `--wait=legacy` syntax; Helm 3's boolean `--wait` is not compatible with these commands. Selecting a newer Helm version does not extend the existing qualification evidence: record the actual version and exercised path when verifying an installation.

## Install and configure

Agree new or replacement workstation dependencies with the affected operators before introducing them. Update this tool list, setup instructions and checks together; a new runtime is an operator prerequisite, not an invisible implementation detail.

Use the platform package manager or the tools' official distributions. On macOS with Homebrew, install missing tools rather than upgrading an existing qualified toolchain blindly:

```bash
brew install git bash direnv pass gnupg pinentry-mac yq jq kubernetes-cli hcloud openssl@3
```

This command does not pin versions. Select [Helm 4.3.2](https://github.com/helm/helm/releases/tag/v4.3.2) and a [kubectl version compatible with the target cluster](https://kubernetes.io/docs/tasks/tools/) explicitly. macOS supplies SSH, curl and dig. Put the installed OpenSSL 3 binary on `PATH`; Homebrew's `openssl@3` is keg-only. On Linux, use distribution packages where their versions meet the requirements, otherwise use official release binaries. `pass`'s package supplies its platform dependencies.

Base uses direnv to select its cluster-local access definition; application packages also accept explicitly supplied external cluster access without a directory hook. Use a dedicated shell without inherited provider tokens, Helm target overrides or personal Kubernetes configuration. Explicitly select the customer's password store, provider credentials and cluster context before operating. Until selection succeeds, disable implicit access (for example `PASSWORD_STORE_DIR=/dev/null`, `HCLOUD_CONFIG=/dev/null` and `KUBECONFIG=/dev/null` in a clean environment). A missing store or failed decryption must stop the operation, not select a personal default. Leaving a direnv scope restores the previous environment, not necessarily an empty one.

Use your own GPG identity and explicitly select its keyring. Each authorized operator needs the recipient public keys and their own usable private key; never share private keys. On macOS, a terminal-independent prompt can be selected with `pinentry-program /usr/local/bin/pinentry-mac` in the relevant keyring's `gpg-agent.conf` (use the actual installed path, commonly `/opt/homebrew/bin/pinentry-mac` on Apple Silicon). Reload that dedicated agent after configuration changes. An execution environment with a sandbox needs access to its own keyring and agent sockets, not another operator's personal keyring.

## Check the workstation

Run before commissioning; do not print credential values:

```bash
for tool in git ssh bash direnv pass gpg gpg-agent jq yq kubectl helm openssl hcloud curl dig; do
  command -v "$tool" || exit 1
done
yq --version
jq --version
helm version --short
kubectl version --client
openssl version
printf 'name: workstation-check\n' | yq -o=json '.' | jq -e '.name == "workstation-check"'
printf 'synthetic-check\n' | openssl passwd -apr1 -stdin >/dev/null
```

Verify the displayed yq implementation and major version, Helm version and kubectl compatibility against the table. These checks establish executable availability and parser/hash behavior, not provider authentication. A global Ruby installation or its gems have no role in the checks.

Clone the installation and its encrypted store, follow its explicit access-selection procedure, then use its documented read-only provider and cluster checks. Access requires repository permissions, an authorized GPG key with verified decryption, existing provider tokens and reachable endpoints. Cluster access cannot exist before the cluster credentials have been issued. With multiple clusters, select the target explicitly; never merge with personal kubeconfigs.

Application tokens and kubeconfigs must never enter Git in plaintext. Access preparation may materialize restricted-permission credentials in ignored runtime storage. Ending the session does not erase these files; retain independently needed inputs before any authorized disposal. Credential creation, infrastructure provisioning and rotation are explicit operating steps, never side effects of directory entry.
