# Operator workstation

Prepare this workstation before using an installation checkout or the [reference installation](reference-installation/README.md). Installation repositories link here and specify their actual providers, credentials, cluster versions and any deviations. Application packages retain their own supported deployment and recovery requirements.

## Tools

| Tool | Purpose | Requirement |
| --- | --- | --- |
| Git and OpenSSH | Clone and synchronize configuration and encrypted stores; access hosts | Authorized SSH identity |
| Bash and standard Unix utilities | Run activation and commissioning commands | Bash, including when the interactive shell is Zsh |
| direnv | Activate customer access and restore the prior environment on exit | Install its hook in the interactive shell |
| pass | Read, generate and update encrypted credentials | GnuPG-backed password store |
| GnuPG, gpg-agent and pinentry | Encrypt/decrypt entries and unlock the operator key | Working local passphrase prompt |
| [Mike Farah yq](https://github.com/mikefarah/yq#install) | Read YAML inventory as JSON | Go-based yq v4, not the Python tool of the same name |
| jq | Query JSON, transform kubeconfigs and check operation results | jq 1.6 or later |
| kubectl | Prepare access files and operate Kubernetes | Within one minor version of the target API server |
| Helm | Install and operate application packages | 4.3.0 for the current journey and reference installation |
| OpenSSL | Prepare backup endpoint password hashes | OpenSSL 3 with `passwd -apr1` support |
| hcloud | Hetzner project operations | Required for the Hetzner profile |
| curl and dig | DNS API requests and authoritative/public DNS checks | Required for the deSEC profile |

Ruby and MessagePack are not required. Installing these tools does not install customer workloads on the workstation.

## Install and configure

Agree new or replacement workstation dependencies with the affected operators before introducing them. Update this tool list, setup instructions and checks together; a new runtime is an operator prerequisite, not an invisible implementation detail.

Use the platform package manager or the tools' official distributions. On macOS with Homebrew, install missing tools rather than upgrading an existing qualified toolchain blindly:

```bash
brew install git bash direnv pass gnupg pinentry-mac yq jq kubernetes-cli hcloud openssl@3
```

This command does not pin versions. Select [Helm 4.3.0](https://github.com/helm/helm/releases/tag/v4.3.0) and a [kubectl version compatible with the target cluster](https://kubernetes.io/docs/tasks/tools/) explicitly. macOS supplies SSH, curl and dig. Put the installed OpenSSL 3 binary on `PATH`; Homebrew's `openssl@3` is keg-only. On Linux, use distribution packages where their versions meet the requirements, otherwise use official release binaries. `pass`'s package supplies its platform dependencies.

Install the [direnv shell hook](https://direnv.net/docs/hook.html) once. For Zsh, add `eval "$(direnv hook zsh)"` to `~/.zshrc`; for Bash, add `eval "$(direnv hook bash)"` to `~/.bashrc`. Start a new interactive shell afterward. Review each checkout's `.envrc` before `direnv allow`.

Use your own GPG identity. Each authorized operator needs the recipient public keys and their own usable private key; never share private keys. On macOS, a terminal-independent prompt can be selected with `pinentry-program /usr/local/bin/pinentry-mac` in the relevant keyring's `gpg-agent.conf` (use the actual installed path, commonly `/opt/homebrew/bin/pinentry-mac` on Apple Silicon). Reload that dedicated agent after configuration changes. An execution environment with a sandbox also needs access to its own keyring, agent sockets and direnv approval directory; it does not need another operator's personal keyring.

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

Clone the installation and its encrypted store, activate the checkout, then use its documented read-only provider and cluster checks. Access requires repository permissions, an authorized GPG key, existing provider tokens and reachable endpoints. Cluster access cannot exist before the cluster credentials have been issued. With multiple clusters, select the target explicitly.

Application tokens and kubeconfigs must never enter Git in plaintext. Local activation may materialize restricted-permission credentials in ignored runtime storage; leaving the directory restores environment variables but does not erase those files. Credential creation, infrastructure provisioning and rotation are explicit journey steps, never side effects of activation.
