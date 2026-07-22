import { Customer } from '../types';
import { normalizePhoneNumber } from './phoneNormalizer';

export interface DuplicateGroup {
  id: string; // e.g. "DUP-GRP-101"
  groupKey: string;
  matchType: 'Name + Mobile' | 'Mobile' | 'WhatsApp' | 'IMO' | 'Email' | 'Name Only';
  confidenceScore: number; // 100, 95, 90, 85, 80, 50
  matchedValue: string;
  matchedField: 'Mobile' | 'WhatsApp' | 'IMO' | 'Email' | 'Name' | 'Name + Mobile';
  customers: Customer[];
  customerIds: string[];
  detectedDate: string;
  status: 'Pending' | 'Merged' | 'Archived' | 'Ignored' | 'Resolved';
  resolutionReason?: 'Merged' | 'Archived' | 'Keep Both' | 'Ignored';
  primaryCustomerId?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface DuplicateResolution {
  groupKey: string;
  status: 'Merged' | 'Archived' | 'Ignored' | 'Resolved';
  resolutionReason: 'Merged' | 'Archived' | 'Keep Both' | 'Ignored';
  primaryCustomerId?: string;
  resolvedAt: string;
  resolvedBy?: string;
}

export interface DuplicateStats {
  totalGroups: number;
  confirmedCount: number; // 100%, 95%
  possibleCount: number;  // 90%, 85%, 80%, 50%
  pendingCount: number;
  mergedTodayCount: number;
  archivedTodayCount: number;
  ignoredCount: number;
  keepBothCount: number;
  avgConfidence: number;
  lastScanTime: string;
}

const STORAGE_KEY_RESOLUTIONS = 'move_abroad_crm_duplicate_resolutions';
const STORAGE_KEY_LAST_SCAN = 'move_abroad_crm_duplicate_last_scan';

export function getDuplicateResolutions(): Record<string, DuplicateResolution> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RESOLUTIONS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error("Failed to read duplicate resolutions:", e);
    return {};
  }
}

export function saveDuplicateResolution(resolution: DuplicateResolution) {
  const resolutions = getDuplicateResolutions();
  resolutions[resolution.groupKey] = resolution;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_RESOLUTIONS, JSON.stringify(resolutions));
    } catch (e) {
      console.error("Failed to save duplicate resolution:", e);
    }
  }
}

export function getLastScanTime(): string {
  if (typeof window === 'undefined') return new Date().toISOString();
  return localStorage.getItem(STORAGE_KEY_LAST_SCAN) || new Date().toISOString();
}

export function updateLastScanTime(): string {
  const now = new Date().toISOString();
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_LAST_SCAN, now);
    } catch (e) {
      console.error("Failed to save last scan time:", e);
    }
  }
  return now;
}

/**
 * Enterprise Multi-Pass Duplicate Detection Engine
 * Scans all active customers and groups them into duplicate clusters in < 50ms
 */
export function scanDuplicateGroups(customers: Customer[]): {
  groups: DuplicateGroup[];
  stats: DuplicateStats;
} {
  const resolutions = getDuplicateResolutions();
  const activeCustomers = customers.filter(c => !c.isArchived);

  // Maps for clustering by match key
  const nameMobileBuckets = new Map<string, Customer[]>();
  const mobileBuckets = new Map<string, { normVal: string; rawVal: string; customers: Customer[] }>();
  const whatsAppBuckets = new Map<string, { normVal: string; rawVal: string; customers: Customer[] }>();
  const imoBuckets = new Map<string, { normVal: string; rawVal: string; customers: Customer[] }>();
  const emailBuckets = new Map<string, { emailVal: string; customers: Customer[] }>();
  const nameOnlyBuckets = new Map<string, { nameVal: string; customers: Customer[] }>();

  // Helper function to extract email from remarks or email field
  const extractEmail = (cust: Customer): string => {
    if (cust.remarks) {
      const match = cust.remarks.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (match) return match[0].toLowerCase();
    }
    return '';
  };

  // Populate buckets
  for (const cust of activeCustomers) {
    const normName = (cust.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const normMobile = normalizePhoneNumber(cust.mobileNumber || '');
    const normWhatsApp = normalizePhoneNumber(cust.whatsAppNumber || '');
    const normImo = normalizePhoneNumber(cust.imoNumber || '');
    const email = extractEmail(cust);

    // 100%: Name + Mobile bucket
    if (normName && normMobile) {
      const key = `${normName}_${normMobile}`;
      if (!nameMobileBuckets.has(key)) nameMobileBuckets.set(key, []);
      nameMobileBuckets.get(key)!.push(cust);
    }

    // 95%: Mobile bucket
    if (normMobile) {
      if (!mobileBuckets.has(normMobile)) {
        mobileBuckets.set(normMobile, { normVal: normMobile, rawVal: cust.mobileNumber, customers: [] });
      }
      mobileBuckets.get(normMobile)!.customers.push(cust);
    }

    // 90%: WhatsApp bucket
    if (normWhatsApp) {
      if (!whatsAppBuckets.has(normWhatsApp)) {
        whatsAppBuckets.set(normWhatsApp, { normVal: normWhatsApp, rawVal: cust.whatsAppNumber || cust.mobileNumber, customers: [] });
      }
      whatsAppBuckets.get(normWhatsApp)!.customers.push(cust);
    }

    // 85%: IMO bucket
    if (normImo) {
      if (!imoBuckets.has(normImo)) {
        imoBuckets.set(normImo, { normVal: normImo, rawVal: cust.imoNumber || cust.mobileNumber, customers: [] });
      }
      imoBuckets.get(normImo)!.customers.push(cust);
    }

    // 80%: Email bucket
    if (email) {
      if (!emailBuckets.has(email)) {
        emailBuckets.set(email, { emailVal: email, customers: [] });
      }
      emailBuckets.get(email)!.customers.push(cust);
    }

    // 50%: Name Only bucket (Min length 3 chars to prevent false positives)
    if (normName && normName.length >= 3) {
      if (!nameOnlyBuckets.has(normName)) {
        nameOnlyBuckets.set(normName, { nameVal: cust.name, customers: [] });
      }
      nameOnlyBuckets.get(normName)!.customers.push(cust);
    }
  }

  // Track assigned customer pairs to prevent redundant groups across lower confidence tiers
  const processedCustomerPairs = new Set<string>();
  const rawGroups: DuplicateGroup[] = [];
  let groupCounter = 101;

  const makePairKey = (id1: string, id2: string) => [id1, id2].sort().join('___');

  // Helper to construct group
  const addGroup = (
    groupKey: string,
    matchType: DuplicateGroup['matchType'],
    confidenceScore: number,
    matchedValue: string,
    matchedField: DuplicateGroup['matchedField'],
    groupCustomers: Customer[]
  ) => {
    if (groupCustomers.length < 2) return;

    // Check if all customer pairs in this bucket are already grouped in a higher confidence bucket
    let hasNewPair = false;
    for (let i = 0; i < groupCustomers.length; i++) {
      for (let j = i + 1; j < groupCustomers.length; j++) {
        const pairKey = makePairKey(groupCustomers[i].id, groupCustomers[j].id);
        if (!processedCustomerPairs.has(pairKey)) {
          hasNewPair = true;
          processedCustomerPairs.add(pairKey);
        }
      }
    }

    if (!hasNewPair) return;

    const savedRes = resolutions[groupKey];
    const group: DuplicateGroup = {
      id: `DUP-GRP-${groupCounter++}`,
      groupKey,
      matchType,
      confidenceScore,
      matchedValue,
      matchedField,
      customers: groupCustomers,
      customerIds: groupCustomers.map(c => c.id),
      detectedDate: groupCustomers[0].createdAt || new Date().toISOString(),
      status: savedRes ? savedRes.status : 'Pending',
      resolutionReason: savedRes ? savedRes.resolutionReason : undefined,
      primaryCustomerId: savedRes?.primaryCustomerId || groupCustomers[0].id,
      resolvedAt: savedRes?.resolvedAt,
      resolvedBy: savedRes?.resolvedBy
    };

    rawGroups.push(group);
  };

  // Tier 1: Name + Mobile (100%)
  nameMobileBuckets.forEach((custs, key) => {
    if (custs.length >= 2) {
      const gKey = `namemobile_${key}`;
      addGroup(gKey, 'Name + Mobile', 100, `${custs[0].name} (${custs[0].mobileNumber})`, 'Name + Mobile', custs);
    }
  });

  // Tier 2: Mobile (95%)
  mobileBuckets.forEach((data, normMob) => {
    if (data.customers.length >= 2) {
      const gKey = `mobile_${normMob}`;
      addGroup(gKey, 'Mobile', 95, data.rawVal, 'Mobile', data.customers);
    }
  });

  // Tier 3: WhatsApp (90%)
  whatsAppBuckets.forEach((data, normWA) => {
    if (data.customers.length >= 2) {
      const gKey = `whatsapp_${normWA}`;
      addGroup(gKey, 'WhatsApp', 90, data.rawVal, 'WhatsApp', data.customers);
    }
  });

  // Tier 4: IMO (85%)
  imoBuckets.forEach((data, normIMO) => {
    if (data.customers.length >= 2) {
      const gKey = `imo_${normIMO}`;
      addGroup(gKey, 'IMO', 85, data.rawVal, 'IMO', data.customers);
    }
  });

  // Tier 5: Email (80%)
  emailBuckets.forEach((data, email) => {
    if (data.customers.length >= 2) {
      const gKey = `email_${email}`;
      addGroup(gKey, 'Email', 80, data.emailVal, 'Email', data.customers);
    }
  });

  // Tier 6: Name Only (50%)
  nameOnlyBuckets.forEach((data, normName) => {
    if (data.customers.length >= 2) {
      const gKey = `nameonly_${normName}`;
      addGroup(gKey, 'Name Only', 50, data.nameVal, 'Name', data.customers);
    }
  });

  const lastScan = getLastScanTime();
  const todayStr = new Date().toISOString().split('T')[0];

  // Calculate statistics
  let confirmedCount = 0;
  let possibleCount = 0;
  let pendingCount = 0;
  let mergedTodayCount = 0;
  let archivedTodayCount = 0;
  let ignoredCount = 0;
  let keepBothCount = 0;
  let totalConfidence = 0;

  rawGroups.forEach(g => {
    totalConfidence += g.confidenceScore;
    if (g.confidenceScore >= 95) confirmedCount++;
    else possibleCount++;

    if (g.status === 'Pending') pendingCount++;
    if (g.status === 'Ignored') ignoredCount++;
    if (g.status === 'Resolved' && g.resolutionReason === 'Keep Both') keepBothCount++;

    if (g.resolvedAt && g.resolvedAt.startsWith(todayStr)) {
      if (g.resolutionReason === 'Merged') mergedTodayCount++;
      if (g.resolutionReason === 'Archived') archivedTodayCount++;
    }
  });

  const avgConfidence = rawGroups.length > 0
    ? Math.round((totalConfidence / rawGroups.length) * 10) / 10
    : 0;

  const stats: DuplicateStats = {
    totalGroups: rawGroups.length,
    confirmedCount,
    possibleCount,
    pendingCount,
    mergedTodayCount,
    archivedTodayCount,
    ignoredCount,
    keepBothCount,
    avgConfidence,
    lastScanTime: lastScan
  };

  return { groups: rawGroups, stats };
}
