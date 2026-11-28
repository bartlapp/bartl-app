// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import ipaddr from 'ipaddr.js';
import { parseDocument } from 'yaml';

const schema = JSON.parse(readFileSync(new URL('../schemas/installation.schema.json', import.meta.url), 'utf8'));
const ajv = addFormats(new Ajv({ allErrors: true, strict: true }));
const validateStructure = ajv.compile(schema);
const resourceProfiles = Object.fromEntries(['hetzner', 'aws'].map((type, index) => [
  type, Object.fromEntries(['vm', 'network'].map(kind => [
    kind, ajv.getSchema(`${schema.$id}#/definitions/${kind}/oneOf/${index}`),
  ])),
]));
const pointer = (...parts) => '/' + parts.map(part => String(part).replaceAll('~', '~0').replaceAll('/', '~1')).join('/');

/** Validate the central record only; package-owned values require each selected package's schema. */
export function validateInstallation(record) {
  if (!validateStructure(record)) {
    return { valid: false, errors: validateStructure.errors.map(error => ({
      kind: 'schema', path: error.instancePath || '/', message: error.message,
      keyword: error.keyword, details: error.params,
    })) };
  }
  const errors = [];
  validateReferences(record, errors);
  return { valid: errors.length === 0, errors };
}

/** Parse one YAML or JSON document without silently overwriting duplicate keys. */
export function validateInstallationText(source) {
  let record;
  try {
    const document = parseDocument(source, { uniqueKeys: true, strict: true });
    if (document.errors.length) {
      return { valid: false, errors: document.errors.map(error => ({ kind: 'parse', path: '/', message: error.message })) };
    }
    record = document.toJS({ maxAliasCount: 100 });
  } catch (error) {
    return { valid: false, errors: [{ kind: 'parse', path: '/', message: error.message }] };
  }
  return validateInstallation(record);
}

function validateReferences(record, errors) {
  const fail = (path, message) => errors.push({ kind: 'semantic', path, message });
  const has = (map, key) => Object.hasOwn(map ?? {}, key);
  const reference = (section, id, path) => {
    if (!has(record[section], id)) {
      fail(path, `Unknown ${section} reference ${JSON.stringify(id)}`);
      return undefined;
    }
    return record[section][id];
  };
  const providerType = (providerId, expected, path) => {
    const provider = reference('providers', providerId, path);
    if (provider && provider.type !== expected) fail(path, `Provider type ${JSON.stringify(provider.type)} does not match ${JSON.stringify(expected)}`);
  };
  const resourceProvider = (kind, id, resource) => {
    const path = pointer(`${kind}s`, id);
    const provider = reference('providers', resource.provider, `${path}/provider`);
    if (!provider) return;
    const validate = resourceProfiles[provider.type]?.[kind];
    if (!validate || !validate(resource)) fail(path, `Resource does not match its ${provider.type} provider profile`);
  };
  const cidr = (value, path) => {
    try {
      const range = ipaddr.parseCIDR(value);
      const [address, prefix] = range;
      if (address.toByteArray().some((byte, index) => {
        const hostBits = Math.min(8, Math.max(0, (index + 1) * 8 - prefix));
        return (byte & ((1 << hostBits) - 1)) !== 0;
      })) fail(path, 'CIDR must use the network address, without host bits');
      return range;
    } catch {
      fail(path, 'Invalid IP network or prefix length');
      return undefined;
    }
  };
  const contained = (inner, outer) => inner[0].kind() === outer[0].kind() && inner[1] >= outer[1] && inner[0].match(outer);
  const attachment = (networkId, subnetId, provider, path) => {
    const network = reference('networks', networkId, `${path}/network`);
    if (!network) return undefined;
    if (network.provider !== provider) fail(`${path}/network`, 'Network attachment crosses provider bindings');
    if (!has(network.subnets, subnetId)) {
      fail(`${path}/subnet`, `Unknown subnet ${JSON.stringify(subnetId)} in network ${JSON.stringify(networkId)}`);
      return undefined;
    }
    return network.subnets[subnetId];
  };

  if (record.dns?.provider) providerType(record.dns.provider, 'desec', '/dns/provider');
  for (const [providerId, provider] of Object.entries(record.providers ?? {})) {
    if (provider.credentials.passEntry && !record.credentials?.passStore) {
      fail(pointer('providers', providerId, 'credentials'), 'passEntry requires an explicitly selected credentials.passStore');
    }
  }
  for (const [networkId, network] of Object.entries(record.networks ?? {})) {
    resourceProvider('network', networkId, network);
    const parent = cidr(network.configuration.cidr, pointer('networks', networkId, 'configuration', 'cidr'));
    const subnetRanges = [];
    for (const [subnetId, subnet] of Object.entries(network.subnets)) {
      const child = cidr(subnet.cidr, pointer('networks', networkId, 'subnets', subnetId, 'cidr'));
      if (parent && child && !contained(child, parent)) fail(pointer('networks', networkId, 'subnets', subnetId, 'cidr'), 'Subnet is outside its network CIDR');
      if (child) {
        if (subnetRanges.some(other => contained(child, other) || contained(other, child))) {
          fail(pointer('networks', networkId, 'subnets', subnetId, 'cidr'), 'Subnets in one network must not overlap');
        }
        subnetRanges.push(child);
      }
    }
  }
  for (const [vmId, vm] of Object.entries(record.vms ?? {})) {
    resourceProvider('vm', vmId, vm);
    if (vm.observed?.primaryIPv6?.network) cidr(vm.observed.primaryIPv6.network, pointer('vms', vmId, 'observed', 'primaryIPv6', 'network'));
    for (const [attachmentId, value] of Object.entries(vm.networkAttachments ?? {})) {
      const path = pointer('vms', vmId, 'networkAttachments', attachmentId);
      const subnet = attachment(value.network, value.subnet, vm.provider, path);
      if (subnet && value.address) {
        const range = cidr(subnet.cidr, `${path}/subnet`);
        const address = ipaddr.parse(value.address);
        if (range && (address.kind() !== range[0].kind() || !address.match(range))) fail(`${path}/address`, 'Address is outside its attached subnet');
      }
    }
    for (const field of ['networkAttachments', 'networkInterfaces']) {
      for (const [attachmentId, observation] of Object.entries(vm.observed?.[field] ?? {})) {
        const path = pointer('vms', vmId, 'observed', field, attachmentId);
        const desired = vm.networkAttachments?.[attachmentId];
        if (!desired) {
          fail(path, 'Observed attachment has no declared VM network attachment');
        } else {
          const observedId = record.networks?.[desired.network]?.observed?.id;
          if (observation.networkId !== undefined && observedId !== undefined && String(observation.networkId) !== String(observedId)) {
            fail(`${path}/networkId`, 'Observed attachment network ID differs from the referenced network');
          }
        }
      }
    }
  }
  const membership = new Map();
  for (const [clusterId, cluster] of Object.entries(record.clusters ?? {})) {
    const path = pointer('clusters', clusterId);
    if (cluster.kubeconfig?.credential?.passEntry && !record.credentials?.passStore) {
      fail(`${path}/kubeconfig/credential`, 'passEntry requires an explicitly selected credentials.passStore');
    }
    for (const vmId of Object.keys(cluster.nodes ?? {})) {
      reference('vms', vmId, `${path}/nodes/${vmId}`);
      if (membership.has(vmId)) fail(`${path}/nodes/${vmId}`, `VM ${JSON.stringify(vmId)} already belongs to cluster ${JSON.stringify(membership.get(vmId))}`);
      else membership.set(vmId, clusterId);
    }
    if (cluster.management === 'provider-managed') {
      providerType(cluster.provider, 'aws', `${path}/provider`);
      const zones = new Set();
      for (const subnetId of cluster.configuration.subnets) {
        const subnet = attachment(cluster.configuration.network, subnetId, cluster.provider, `${path}/configuration`);
        if (subnet?.configuration.availabilityZone) zones.add(subnet.configuration.availabilityZone);
      }
      if (zones.size < 2) fail(`${path}/configuration/subnets`, 'EKS requires subnets in at least two availability zones');
      for (const [index, value] of (cluster.configuration.publicAccessCidrs ?? []).entries()) cidr(value, `${path}/configuration/publicAccessCidrs/${index}`);
    } else {
      if (!Object.values(cluster.nodes).some(node => node.role === 'server')) fail(`${path}/nodes`, 'Self-managed cluster needs at least one server node');
      for (const key of ['clusterCIDR', 'serviceCIDR']) {
        if (cluster.configuration[key]) cidr(cluster.configuration[key], `${path}/configuration/${key}`);
      }
    }
    for (const [firewallId, firewall] of Object.entries(cluster.observed?.firewalls ?? {})) {
      const firewallPath = `${path}/observed/firewalls/${firewallId}`;
      providerType(firewall.provider, firewall.type === 'hetzner' ? 'hetzner' : 'aws', `${firewallPath}/provider`);
      if (cluster.provider && firewall.provider !== cluster.provider) fail(`${firewallPath}/provider`, 'Firewall crosses the cluster provider binding');
      for (const [index, vmId] of (firewall.attachedVms ?? []).entries()) {
        const vm = reference('vms', vmId, `${firewallPath}/attachedVms/${index}`);
        if (vm && vm.provider !== firewall.provider) fail(`${firewallPath}/attachedVms/${index}`, 'Firewall attachment crosses provider bindings');
        if (cluster.management === 'self-managed' && !has(cluster.nodes, vmId)) fail(`${firewallPath}/attachedVms/${index}`, 'Firewall attachment is not a node of this cluster');
      }
    }
  }
  const placements = new Map();
  for (const [id, deployment] of Object.entries(record.deployments ?? {})) {
    for (const [field, section] of [['instance', 'services'], ['cluster', 'clusters'], ['package', 'packages']]) reference(section, deployment[field], pointer('deployments', id, field));
    const target = JSON.stringify([deployment.cluster, deployment.namespace, deployment.release]);
    if (placements.has(target)) fail(pointer('deployments', id), `Helm target already selected by deployment ${JSON.stringify(placements.get(target))}`);
    else placements.set(target, id);
    const selectedPackage = record.packages?.[deployment.package];
    if (['oci://ghcr.io/bartlapp/bartl-keycloak', 'oci://ghcr.io/bartlapp/bartl-restic'].includes(selectedPackage?.chart)) {
      const service = record.services?.[deployment.instance];
      const operation = record.operations?.deployments?.[id];
      for (const field of ['running', 'replicas']) {
        if (has(operation, field)) fail(pointer('operations', 'deployments', id, field), 'Runtime intent belongs to the application CR, not installation values');
        if (has(service, field)) fail(pointer('services', deployment.instance, field), 'Runtime intent belongs to the application CR, not installation values');
      }
      if (has(service?.application, 'replicas')) fail(pointer('services', deployment.instance, 'application', 'replicas'), 'Replicas belong to the application CR, not installation values');
    }
  }
  for (const deploymentId of Object.keys(record.operations?.deployments ?? {})) reference('deployments', deploymentId, pointer('operations', 'deployments', deploymentId));
  for (const [instance, points] of Object.entries(record.operations?.recovery?.points ?? {})) {
    reference('services', instance, pointer('operations', 'recovery', 'points', instance));
    for (const [pointId, point] of Object.entries(points)) {
      const path = pointer('operations', 'recovery', 'points', instance, pointId, 'deployment');
      const deployment = reference('deployments', point.deployment, path);
      if (deployment && deployment.instance !== instance) fail(path, 'Recovery point deployment belongs to another application instance');
    }
  }
  for (const [name, entry] of Object.entries(record.operations?.dns ?? {})) {
    if (entry.provider) providerType(entry.provider, 'desec', pointer('operations', 'dns', name, 'provider'));
  }
}

function main(args) {
  if (args.length !== 1 || args[0] === '--help' || args[0] === '-h') {
    console.error('Usage: node scripts/validate-installation.mjs <installation.yaml>');
    console.error('Offline central schema and reference checks only; validate package-owned values separately with the selected package schemas.');
    return args.length === 1 ? 0 : 2;
  }
  let result;
  try {
    result = validateInstallationText(readFileSync(resolve(args[0]), 'utf8'));
  } catch (error) {
    console.error(`input: ${error.message}`);
    return 2;
  }
  for (const error of result.errors) console.error(`${error.kind} ${error.path}: ${error.message}`);
  if (result.valid) console.log('Central installation record is valid offline. Package schemas, live existence, access and deletion authority are not verified.');
  return result.valid ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
