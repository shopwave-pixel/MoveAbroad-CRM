export interface ActivityItem {
  id: string;
  customerId: string;
  type: 'CREATED' | 'TICKET_CREATED' | 'TICKET_CLOSED' | 'FOLLOWUP_ADDED' | 'FOLLOWUP_COMPLETED' | 'CALL_LOGGED' | 'WHATSAPP_CONTACTED' | 'IMO_CONTACTED' | 'UPDATED' | 'STATUS_CHANGED';
  activity: string;
  user: string;
  timestamp: string; // ISO string
}

// Get all logged activities from localStorage
export function getLoggedActivities(): ActivityItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('move_abroad_crm_custom_activities');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to read activities:", e);
    return [];
  }
}

// Save logged activities to localStorage
export function saveLoggedActivities(activities: ActivityItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('move_abroad_crm_custom_activities', JSON.stringify(activities));
  } catch (e) {
    console.error("Failed to save activities:", e);
  }
}

// Log a new activity
export function logCustomerActivity(
  customerId: string,
  type: ActivityItem['type'],
  activity: string,
  user: string = 'Staff'
): ActivityItem {
  const activities = getLoggedActivities();
  const newItem: ActivityItem = {
    id: `ACT-${Math.floor(100000 + Math.random() * 900000)}`,
    customerId,
    type,
    activity,
    user,
    timestamp: new Date().toISOString()
  };
  
  activities.unshift(newItem);
  // Keep last 1000 items
  if (activities.length > 1000) {
    activities.pop();
  }
  saveLoggedActivities(activities);
  
  // Dispatch a custom event so UI can re-render instantly
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('crm-activity-logged', { detail: newItem }));
  }
  
  return newItem;
}

// Get chronological timeline for a customer
export function getCustomerTimeline(
  customerId: string,
  customer: any,
  tickets: any[],
  followUps: any[]
): ActivityItem[] {
  const timeline: ActivityItem[] = [];
  
  // 1. Customer Created
  if (customer && customer.createdAt) {
    timeline.push({
      id: `ACT-CRE-${customer.id}`,
      customerId: customer.id,
      type: 'CREATED',
      activity: 'CUSTOMER PROFILE CREATED',
      user: 'SYSTEM',
      timestamp: customer.createdAt
    });
  }
  
  // 2. Tickets
  tickets.filter(t => t.customerId === customerId).forEach(t => {
    timeline.push({
      id: `ACT-TKT-CRE-${t.id}`,
      customerId,
      type: 'TICKET_CREATED',
      activity: `SUPPORT TICKET CREATED: ${t.id} - ${t.conversationDescription}`,
      user: 'STAFF',
      timestamp: t.createdAt
    });
    
    if (t.status === 'Closed') {
      // If closed, add a closing event (use same time or slightly later)
      timeline.push({
        id: `ACT-TKT-CLO-${t.id}`,
        customerId,
        type: 'TICKET_CLOSED',
        activity: `SUPPORT TICKET CLOSED: ${t.id}`,
        user: 'STAFF',
        timestamp: new Date(new Date(t.createdAt).getTime() + 60000).toISOString() // 1 min after creation if no other stamp
      });
    }
  });
  
  // 3. Follow-ups
  followUps.filter(f => f.customerId === customerId).forEach(f => {
    timeline.push({
      id: `ACT-FUP-ADD-${f.id}`,
      customerId,
      type: 'FOLLOWUP_ADDED',
      activity: `FOLLOW-UP REMINDER ADDED: ${f.id} - "${f.notes}"`,
      user: 'STAFF',
      timestamp: f.createdAt || customer.createdAt
    });
    
    if (f.status === 'Completed') {
      timeline.push({
        id: `ACT-FUP-COM-${f.id}`,
        customerId,
        type: 'FOLLOWUP_COMPLETED',
        activity: `FOLLOW-UP REMINDER COMPLETED: ${f.id}`,
        user: 'STAFF',
        timestamp: new Date(new Date(f.createdAt || customer.createdAt).getTime() + 120000).toISOString()
      });
    }
  });
  
  // 4. Custom Logged Activities (Calls, WhatsApp, IMO, Updates)
  const logged = getLoggedActivities().filter(act => act.customerId === customerId);
  timeline.push(...logged);
  
  // 5. Sort by timestamp descending (newest first)
  timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  // Remove duplicates by ID to avoid overlapping with actual ticket/follow-up logs
  const seenIds = new Set<string>();
  return timeline.filter(item => {
    if (seenIds.has(item.id)) return false;
    seenIds.add(item.id);
    return true;
  });
}
