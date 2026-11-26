// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import test from 'node:test';
import { validateInstallation, validateInstallationText } from '../scripts/validate-installation.mjs';

const identity = () => ({ schemaVersion: 1, customer: 'acme', installation: 'production' });
const valid = record => assert.deepEqual(validateInstallation(record), { valid: true, errors: [] });
const invalid = (record, kind, path) => {
  const result = validateInstallation(record);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.kind === kind && error.path.startsWith(path)), JSON.stringify(result.errors));
};

test('accepts the minimal identified installation', () => valid(identity()));
test('rejects absent identity, unknown fields, wrong types and schema versions', () => {
  invalid({ ...identity(), customer: undefined }, 'schema', '/');
  invalid({ ...identity(), schemaVersion: 2 }, 'schema', '/schemaVersion');
  invalid({ ...identity(), installation: 1 }, 'schema', '/installation');
  invalid({ ...identity(), typo: true }, 'schema', '/');
});

test('parses YAML and JSON without accepting duplicate keys', () => {
  assert.equal(validateInstallationText('schemaVersion: 1\ncustomer: acme\ninstallation: production\n').valid, true);
  assert.equal(validateInstallationText(JSON.stringify(identity())).valid, true);
  for (const source of [
    'schemaVersion: 1\ncustomer: acme\ncustomer: other\ninstallation: production\n',
    '{"schemaVersion":1,"customer":"acme","customer":"other","installation":"production"}',
    'schemaVersion: 1\ncustomer: acme\ninstallation: production\nservices:\n  app:\n    enabled: true\n    enabled: false\n',
    'schemaVersion: [',
    'schemaVersion: 1\n---\nschemaVersion: 1\n',
  ]) {
    const result = validateInstallationText(source);
    assert.equal(result.valid, false);
    assert.ok(result.errors.every(error => error.kind === 'parse'));
  }
});

test('bounds package-owned content without duplicating package schemas', () => {
  valid({ ...identity(), services: { app: { packageSpecificChoice: { enabled: false } } }, resolved: { app: { endpoint: 'https://service.example' } } });
  invalid({ ...identity(), services: { app: 'not-an-object' } }, 'schema', '/services/app');
  invalid({ ...identity(), resolved: { app: ['not-an-object'] } }, 'schema', '/resolved/app');
});

const hetzner = () => ({ type: 'hetzner', scope: { project: 'acme-production' }, credentials: { environment: 'HCLOUD_TOKEN' } });
const vm = () => ({
  provider: 'cloud', ownership: 'managed',
  configuration: { name: 'node', serverType: 'cpx32', location: 'hel1', image: 'debian-13' },
});
const network = () => ({
  provider: 'cloud', ownership: 'managed',
  configuration: { name: 'private', cidr: '10.20.0.0/16' },
  subnets: { nodes: { cidr: '10.20.1.0/24', configuration: { networkZone: 'eu-central', type: 'cloud' } } },
});
const base = () => ({
  ...identity(), providers: { cloud: hetzner() },
  vms: { node: vm() },
  clusters: { base: { management: 'self-managed', ownership: 'managed', nodes: { node: { role: 'server' } }, configuration: { distribution: 'k3s' } } },
});
const application = () => ({
  ...base(), services: { app: {} },
  packages: { app: { version: '1.0.0', chart: 'oci://ghcr.io/example/app', chartSha256: 'a'.repeat(64) } },
  deployments: { app: { instance: 'app', cluster: 'base', namespace: 'application', release: 'app', package: 'app' } },
});
const managed = () => ({
  ...identity(),
  providers: { aws: { type: 'aws', scope: { accountId: '123456789012', region: 'eu-central-1' }, credentials: { environment: 'AWS_PROFILE' } } },
  networks: { vpc: {
    provider: 'aws', ownership: 'external', configuration: { name: 'existing', cidr: '10.0.0.0/16' },
    subnets: {
      a: { cidr: '10.0.1.0/24', configuration: { availabilityZone: 'eu-central-1a' } },
      b: { cidr: '10.0.2.0/24', configuration: { availabilityZone: 'eu-central-1b' } },
    },
  } },
  clusters: { eks: {
    management: 'provider-managed', provider: 'aws', ownership: 'external',
    configuration: { service: 'eks', name: 'existing', version: '1.35', roleArn: 'arn:aws:iam::123456789012:role/eks', network: 'vpc', subnets: ['a', 'b'], endpointPublicAccess: false },
  } },
});

test('accepts Base and standalone machines without requiring a cluster', () => {
  valid(base());
  const record = base();
  delete record.clusters;
  valid(record);
});

test('accepts network attachments and independently scoped external dependencies', () => {
  const record = base();
  record.networks = { private: network() };
  record.networks.private.ownership = 'external';
  record.vms.node.networkAttachments = { private: { network: 'private', subnet: 'nodes', address: '10.20.1.10' } };
  record.vms.node.observed = { server: { id: 123 }, primaryIPv4: { id: 456, ownership: 'external', address: '192.0.2.10' } };
  record.clusters.base.observed = { firewalls: { access: { type: 'hetzner', provider: 'cloud', ownership: 'external', id: 789, attachedVms: ['node'] } } };
  valid(record);
  assert.equal(record.networks.private.ownership, 'external');
  assert.equal(record.vms.node.observed.primaryIPv4.ownership, 'external');
  assert.equal(record.clusters.base.observed.firewalls.access.ownership, 'external');
});

test('accepts desired-only and partial typed observations without inventing missing values', () => {
  for (const observed of [{}, { server: { id: '123' } }, { primaryIPv4: { id: 456, ownership: 'managed' } }]) {
    const record = base();
    record.vms.node.observed = observed;
    record.clusters.base.observed = {};
    valid(record);
    assert.deepEqual(record.vms.node.observed, observed);
    assert.equal(record.clusters.base.observed.api, undefined);
  }
});

test('accepts provider-managed Kubernetes with referenced AWS networks', () => valid(managed()));

test('accepts deployments, replacement targets and operation intent', () => {
  const record = application();
  record.deployments.candidate = { ...record.deployments.app, release: 'candidate' };
  record.operations = {
    deployments: { candidate: { replicas: 0, ingressEnabled: false, maintenance: true } },
    recovery: { points: { app: { latest: { deployment: 'app', snapshot: 'snapshot-123' } } } },
  };
  valid(record);
});

test('rejects Keycloak runtime values without breaking other packages replica overrides', () => {
  for (const chart of ['oci://ghcr.io/bartlapp/bartl-paperless', 'oci://ghcr.io/bartlapp/bartl-forgejo']) {
    const record = application();
    record.packages.app.chart = chart;
    record.operations = { deployments: { app: { replicas: 0 } } };
    valid(record);
  }
  const keycloak = () => {
    const record = application();
    record.packages.app.chart = 'oci://ghcr.io/bartlapp/bartl-keycloak';
    return record;
  };
  valid(keycloak());
  for (const service of [{ running: false }, { replicas: 0 }, { application: { replicas: 2 } }]) {
    const record = keycloak();
    record.services.app = service;
    invalid(record, 'semantic', '/services/app');
  }
  const record = keycloak();
  record.operations = { deployments: { app: { replicas: 0 } } };
  invalid(record, 'semantic', '/operations/deployments/app/replicas');
  record.operations.deployments.app = { ingressEnabled: false, maintenance: true, backupSuspend: true };
  valid(record);
  record.operations.deployments.app = { running: false };
  invalid(record, 'schema', '/operations/deployments/app');
});

test('rejects unknown common fields, malformed observations and implicit ownership', () => {
  const mutations = [
    record => { record.vms.node.configuration.serverTypo = 'cx23'; },
    record => { record.vms.node.observed = { server: { id: false } }; },
    record => { record.vms.node.observed = { primaryIPv4: { id: 12, address: '192.0.2.1' } }; },
    record => { record.vms.node.observed = { primaryIPv4: { id: 12, ownership: 'managed', address: '999.0.0.1' } }; },
    record => { delete record.vms.node.ownership; },
    record => { delete record.clusters.base.ownership; },
    record => { record.clusters.base.observed = { firewalls: { access: { type: 'hetzner', provider: 'cloud', id: 12 } } }; },
    record => { record.providers.cloud.scope = {}; },
    record => { record.providers.cloud.credentials = { token: 'plaintext' }; },
  ];
  for (const mutate of mutations) {
    const record = base();
    mutate(record);
    invalid(record, 'schema', '/');
  }
});

test('requires explicit protected store selection for pass references', () => {
  const record = base();
  record.providers.cloud.credentials = { passEntry: 'providers/cloud' };
  invalid(record, 'semantic', '/providers/cloud/credentials');
  record.credentials = { passStore: '../acme-secrets' };
  valid(record);
});

test('rejects dangling provider, VM, package, instance, cluster and operation targets', () => {
  const cases = [
    [record => { record.vms.node.provider = 'missing'; }, '/vms/node/provider'],
    [record => { record.clusters.base.nodes.missing = { role: 'agent' }; }, '/clusters/base/nodes/missing'],
    [record => { record.deployments.app.package = 'missing'; }, '/deployments/app/package'],
    [record => { record.deployments.app.instance = 'missing'; }, '/deployments/app/instance'],
    [record => { record.deployments.app.cluster = 'missing'; }, '/deployments/app/cluster'],
    [record => { record.operations = { deployments: { missing: { replicas: 0 } } }; }, '/operations/deployments/missing'],
    [record => { record.operations = { recovery: { points: { app: { point: { deployment: 'missing', snapshot: 'snap' } } } } }; }, '/operations/recovery/points/app/point/deployment'],
    [record => { record.operations = { recovery: { points: { missing: { point: { deployment: 'app', snapshot: 'snap' } } } } }; }, '/operations/recovery/points/missing'],
    [record => { record.dns = { root: 'example.test', provider: 'missing' }; }, '/dns/provider'],
  ];
  for (const [mutate, path] of cases) {
    const record = application();
    mutate(record);
    invalid(record, 'semantic', path);
  }
});

test('rejects dangling networks/subnets and cross-provider attachment', () => {
  const record = base();
  record.networks = { private: network() };
  record.vms.node.networkAttachments = { private: { network: 'missing', subnet: 'nodes' } };
  invalid(record, 'semantic', '/vms/node/networkAttachments/private/network');
  record.vms.node.networkAttachments.private.network = 'private';
  record.vms.node.networkAttachments.private.subnet = 'missing';
  invalid(record, 'semantic', '/vms/node/networkAttachments/private/subnet');
  record.vms.node.networkAttachments.private.subnet = 'nodes';
  record.providers.other = { ...hetzner(), scope: { project: 'other-customer' } };
  record.networks.private.provider = 'other';
  invalid(record, 'semantic', '/vms/node/networkAttachments/private/network');
});

test('rejects incompatible provider types and managed cluster subnet targets', () => {
  const record = managed();
  record.providers.aws = hetzner();
  invalid(record, 'semantic', '/clusters/eks/provider');
  const missing = managed();
  missing.clusters.eks.configuration.subnets[1] = 'missing';
  invalid(missing, 'semantic', '/clusters/eks/configuration/subnet');
});

test('rejects duplicate membership, agent-only clusters and duplicate Helm targets', () => {
  const duplicate = base();
  duplicate.clusters.other = structuredClone(duplicate.clusters.base);
  invalid(duplicate, 'semantic', '/clusters/other/nodes/node');
  const noServer = base();
  noServer.clusters.base.nodes.node.role = 'agent';
  invalid(noServer, 'semantic', '/clusters/base/nodes');
  const collision = application();
  collision.deployments.other = { ...collision.deployments.app };
  invalid(collision, 'semantic', '/deployments/other');
});

test('rejects unsafe CIDRs, subnet boundaries and attachment addresses', () => {
  for (const value of ['10.20.0.0/33', '10.20.0.1/16', '999.20.0.0/16']) {
    const record = base();
    record.networks = { private: network() };
    record.networks.private.configuration.cidr = value;
    invalid(record, 'semantic', '/networks/private/configuration/cidr');
  }
  const record = base();
  record.networks = { private: network() };
  record.networks.private.subnets.nodes.cidr = '10.30.0.0/24';
  invalid(record, 'semantic', '/networks/private/subnets/nodes/cidr');
  record.networks.private.subnets.nodes.cidr = '10.20.1.0/24';
  record.vms.node.networkAttachments = { private: { network: 'private', subnet: 'nodes', address: '10.21.1.10' } };
  invalid(record, 'semantic', '/vms/node/networkAttachments/private/address');
});

test('rejects observed attachment mismatches and firewall references across provider scope', () => {
  const record = base();
  record.networks = { private: { ...network(), observed: { id: 42 } } };
  record.vms.node.networkAttachments = { private: { network: 'private', subnet: 'nodes' } };
  record.vms.node.observed = { networkAttachments: { private: { networkId: 43 } } };
  invalid(record, 'semantic', '/vms/node/observed/networkAttachments/private/networkId');
  record.vms.node.observed = { networkAttachments: { missing: { networkId: 42 } } };
  invalid(record, 'semantic', '/vms/node/observed/networkAttachments/missing');
  delete record.vms.node.observed;
  record.providers.other = { ...hetzner(), scope: { project: 'other-project' } };
  record.clusters.base.observed = { firewalls: { access: { type: 'hetzner', provider: 'other', ownership: 'external', id: 55, attachedVms: ['node'] } } };
  invalid(record, 'semantic', '/clusters/base/observed/firewalls/access/attachedVms/0');
});

test('does not attach recovery evidence to a different application instance', () => {
  const record = application();
  record.services.other = {};
  record.operations = { recovery: { points: { other: { latest: { deployment: 'app', snapshot: 'snap' } } } } };
  invalid(record, 'semantic', '/operations/recovery/points/other/latest/deployment');
});

test('requires independent ownership on networks and rejects unsupported managed node membership', () => {
  const record = base();
  record.networks = { private: network() };
  delete record.networks.private.ownership;
  invalid(record, 'schema', '/networks/private');
  const eks = managed();
  eks.clusters.eks.nodes = { invented: { role: 'server' } };
  invalid(eks, 'schema', '/clusters/eks');
});

test('checks network, firewall and DNS operation provider and VM references', () => {
  const record = base();
  record.networks = { private: network() };
  record.networks.private.provider = 'missing';
  invalid(record, 'semantic', '/networks/private/provider');
  delete record.networks;
  record.clusters.base.observed = { firewalls: { access: { type: 'hetzner', provider: 'cloud', ownership: 'managed', id: 12, attachedVms: ['missing'] } } };
  invalid(record, 'semantic', '/clusters/base/observed/firewalls/access/attachedVms/0');
  delete record.clusters.base.observed;
  record.operations = { dns: { app: { type: 'A', address: '192.0.2.1', ttl: 300, provider: 'missing', ownership: 'managed' } } };
  invalid(record, 'semantic', '/operations/dns/app/provider');
});

test('requires retained kubeconfig pass references to select their store explicitly', () => {
  const record = base();
  record.clusters.base.kubeconfig = { context: 'production', credential: { passEntry: 'clusters/base/kubeconfig' } };
  invalid(record, 'semantic', '/clusters/base/kubeconfig/credential');
  record.credentials = { passStore: '../acme-secrets' };
  valid(record);
});

test('rejects overlapping subnets and managed clusters confined to one availability zone', () => {
  const record = base();
  record.networks = { private: network() };
  record.networks.private.subnets.overlap = {
    cidr: '10.20.1.128/25', configuration: { networkZone: 'eu-central', type: 'cloud' },
  };
  invalid(record, 'semantic', '/networks/private/subnets/overlap/cidr');
  const eks = managed();
  eks.networks.vpc.subnets.b.configuration.availabilityZone = 'eu-central-1a';
  invalid(eks, 'semantic', '/clusters/eks/configuration/subnets');
});

test('validates VM and network settings against the referenced provider without duplicate type fields', () => {
  const record = base();
  record.providers.cloud = managed().providers.aws;
  invalid(record, 'semantic', '/vms/node');
  delete record.vms;
  delete record.clusters;
  record.networks = { private: network() };
  invalid(record, 'semantic', '/networks/private');
});
