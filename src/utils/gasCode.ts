export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * Google Apps Script - MoveAboard CRM Backend REST API
 * 
 * Instructions:
 * 1. Open a new Google Sheet.
 * 2. Click on "Extensions" -> "Apps Script".
 * 3. Delete any default code in Code.gs and paste this script.
 * 4. Click the Save icon (floppy disk).
 * 5. Click "Deploy" (top right) -> "New deployment".
 * 6. Select type: "Web app".
 * 7. Set:
 *    - Description: "MoveAboard CRM REST API"
 *    - Execute as: "Me" (your-email)
 *    - Who has access: "Anyone" (This is crucial to allow the CRM UI to access it)
 * 8. Click "Deploy".
 * 9. Authorize the application if prompted.
 * 10. Copy the "Web app URL" and paste it into the Settings of your MoveAboard CRM App!
 */

// Handle GET requests
function doGet(e) {
  try {
    const action = e ? e.parameter.action : 'get_data';

    if (action === 'ping') {
      return jsonResponse({
        success: true,
        message: 'MoveAboard CRM Backend Online'
      });
    }

    const sheets = setupSheets();
    
    if (action === 'get_data') {
      const customers = getCustomers(sheets.customersSheet);
      const tickets = getTickets(sheets.ticketsSheet);
      const followUps = getFollowUps(sheets.followUpsSheet);
      const users = getUsers(sheets.usersSheet);
      const archivedCustomers = getArchivedCustomers(sheets.archivedCustomersSheet);
      
      return jsonResponse({
        success: true,
        customers: customers,
        tickets: tickets,
        followUps: followUps,
        users: users,
        archivedCustomers: archivedCustomers
      });
    }
    
    if (action === 'get_users') {
      const users = getUsers(sheets.usersSheet);
      return jsonResponse({
        success: true,
        users: users
      });
    }

    if (action === 'get_customers') {
      const customers = getCustomers(sheets.customersSheet);
      return jsonResponse({
        success: true,
        customers: customers
      });
    }

    if (action === 'get_archived_customers') {
      const archived = getArchivedCustomers(sheets.archivedCustomersSheet);
      return jsonResponse({
        success: true,
        customers: archived
      });
    }
    
    if (action === 'search_customer') {
      const query = (e.parameter.query || '').toLowerCase();
      const customers = getCustomers(sheets.customersSheet);
      
      const filtered = customers.filter(c => 
        c.id.toLowerCase().includes(query) ||
        c.name.toLowerCase().includes(query) || 
        c.mobileNumber.toLowerCase().includes(query)
      );
      
      return jsonResponse({
        success: true,
        customers: filtered
      });
    }

    if (action === 'search_follow_up') {
      const query = (e.parameter.query || '').toLowerCase();
      const followUps = getFollowUps(sheets.followUpsSheet);
      
      const filtered = followUps.filter(f => 
        f.id.toLowerCase().includes(query) ||
        f.name.toLowerCase().includes(query) || 
        f.mobileNumber.toLowerCase().includes(query) ||
        (f.notes || '').toLowerCase().includes(query)
      );
      
      return jsonResponse({
        success: true,
        followUps: filtered
      });
    }
    
    return jsonResponse({
      success: false,
      error: "Invalid action: " + action
    });
    
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err.toString()
    });
  }
}

// Handle POST requests
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.tryLock(30000);
    let payload = {};
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else {
      payload = e.parameter;
    }
    
    // Add logging of payload as requested
    Logger.log(JSON.stringify(payload));
    
    const action = payload.action;
    const sheets = setupSheets();
    
    // --- AUTH & SETUP ACTIONS ---
    if (action === 'setup_sheets') {
      const adminFullName = (payload.adminFullName || 'System Admin').trim();
      const adminLoginId = (payload.adminLoginId || '').trim();
      const adminPasswordHash = (payload.adminPasswordHash || '').trim();
      
      if (adminLoginId && adminPasswordHash) {
        const users = getUsers(sheets.usersSheet);
        const exists = users.some(u => u.loginId.toLowerCase() === adminLoginId.toLowerCase());
        if (!exists) {
          const userId = "USR-000001";
          const createdAt = new Date().toISOString();
          appendRowByHeader(sheets.usersSheet, {
            "User ID": userId,
            "Full Name": adminFullName,
            "Login ID": adminLoginId,
            "Password": adminPasswordHash,
            "Role": "Admin",
            "Status": "Active",
            "Created At": createdAt
          });
        }
      }
      return jsonResponse({
        success: true,
        message: "Default sheets and admin verified successfully."
      });
    }
    
    if (action === 'login') {
      const loginIdRaw = payload.loginId;
      const passwordHashRaw = payload.passwordHash;
      
      const loginId = typeof loginIdRaw === 'string' ? loginIdRaw.trim() : '';
      const passwordHash = typeof passwordHashRaw === 'string' ? passwordHashRaw.trim() : '';
      
      console.log("Authentication logs:");
      console.log("- Login ID received: '" + loginId + "'");
      console.log("- Password Hash received: '" + (passwordHash ? "******" : "empty") + "'");
      
      if (!sheets.usersSheet) {
        console.log("- Result: Users sheet missing");
        return jsonResponse({ success: false, error: "Users sheet missing" });
      }
      
      if (!loginId || !passwordHash) {
        console.log("- Result: Missing Login ID or Password Hash");
        return jsonResponse({ success: false, error: "Login ID and Password Hash are required." });
      }
      
      let users = getUsers(sheets.usersSheet);
      
      // Automatically create a default admin if no users exist
      if (users.length === 0) {
        console.log("- No users exist. Auto-creating default admin.");
        const userId = "USR-000001";
        const createdAt = new Date().toISOString();
        const defaultHash = hashPassword("2026");
        appendRowByHeader(sheets.usersSheet, {
          "User ID": userId,
          "Full Name": "Admin",
          "Login ID": "admin",
          "Password": defaultHash,
          "Role": "Admin",
          "Status": "Active",
          "Created At": createdAt
        });
        SpreadsheetApp.flush();
        users = getUsers(sheets.usersSheet);
      }
      
      const user = users.find(u => u.loginId.toLowerCase().trim() === loginId.toLowerCase() && u.passwordHash.trim() === passwordHash);
      
      // Backend debug logging as requested
      Logger.log(payload);
      Logger.log(payload.passwordHash);
      if (user) {
        Logger.log(user.passwordHash);
        Logger.log(user.passwordHash === payload.passwordHash);
      } else {
        const found = users.find(u => u.loginId.toLowerCase().trim() === loginId.toLowerCase());
        if (found) {
          Logger.log(found.passwordHash);
          Logger.log(found.passwordHash === payload.passwordHash);
        } else {
          Logger.log("null");
          Logger.log("false");
        }
      }
      
      if (!user) {
        const userExists = users.some(u => u.loginId.toLowerCase().trim() === loginId.toLowerCase());
        console.log("- User found in sheet: " + (userExists ? "Yes" : "No"));
        console.log("- Password Hash matched: No");
        console.log("- Final authentication result: Failed");
        if (userExists) {
          return jsonResponse({ success: false, error: "Password incorrect" });
        } else {
          return jsonResponse({ success: false, error: "User not found" });
        }
      }
      
      console.log("- User found in sheet: Yes");
      console.log("- Password Hash matched: Yes");
      
      if (user.status === 'Disabled') {
        console.log("- Final authentication result: Failed (Account disabled)");
        return jsonResponse({ success: false, error: "Account disabled" });
      }
      
      console.log("- Final authentication result: Success");
      return jsonResponse({
        success: true,
        user: {
          id: user.id,
          fullName: user.fullName,
          loginId: user.loginId,
          role: user.role,
          status: "Active"
        },
        message: "Login successful."
      });
    }
    
    if (action === 'create_user') {
      const fullName = (payload.fullName || '').trim();
      const loginId = (payload.loginId || '').trim();
      const passwordHash = (payload.passwordHash || '').trim();
      const role = (payload.role || 'Staff').trim();
      const status = (payload.status || 'Active').trim();
      
      if (!fullName || !loginId || !passwordHash) {
        return jsonResponse({ success: false, error: "Full Name, Login ID, and Password Hash are required." });
      }
      
      const usersBefore = getUsers(sheets.usersSheet);
      const exists = usersBefore.some(u => u.loginId.toLowerCase() === loginId.toLowerCase());
      if (exists) {
        return jsonResponse({ success: false, error: "A user with this Login ID already exists." });
      }
      
      let nextNum = 1;
      if (usersBefore.length > 0) {
        const nums = usersBefore.map(u => {
          const match = u.id.match(/USR-(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        });
        nextNum = Math.max(...nums) + 1;
      }
      const userId = "USR-" + nextNum.toString().padStart(6, '0');
      const createdAt = new Date().toISOString();
      
      appendRowByHeader(sheets.usersSheet, {
        "User ID": userId,
        "Full Name": fullName,
        "Login ID": loginId,
        "Password": passwordHash,
        "Role": role,
        "Status": status,
        "Created At": createdAt
      });
      
      // Verify user was actually written before returning success
      SpreadsheetApp.flush();
      const usersAfter = getUsers(sheets.usersSheet);
      const verifiedUser = usersAfter.find(u => u.id === userId);
      if (!verifiedUser) {
        return jsonResponse({ success: false, error: "Failed to write user to Google Sheets. Verification failed." });
      }
      
      return jsonResponse({
        success: true,
        user: {
          id: verifiedUser.id,
          fullName: verifiedUser.fullName,
          loginId: verifiedUser.loginId,
          role: verifiedUser.role,
          status: verifiedUser.status,
          createdAt: verifiedUser.createdAt
        },
        message: "User created successfully."
      });
    }
    
    if (action === 'update_user') {
      const id = payload.id;
      const fullName = (payload.fullName || '').trim();
      const loginId = (payload.loginId || '').trim();
      const passwordHash = (payload.passwordHash || '').trim();
      const role = (payload.role || 'Staff').trim();
      const status = (payload.status || 'Active').trim();
      
      if (!id || !fullName || !loginId) {
        return jsonResponse({ success: false, error: "ID, Full Name, and Login ID are required." });
      }
      
      const users = getUsers(sheets.usersSheet);
      const exists = users.some(u => u.id !== id && u.loginId.toLowerCase() === loginId.toLowerCase());
      if (exists) {
        return jsonResponse({ success: false, error: "Another user with this Login ID already exists." });
      }
      
      const updateData = {
        "Full Name": fullName,
        "Login ID": loginId,
        "Role": role,
        "Status": status
      };
      
      if (passwordHash) {
        updateData["Password"] = passwordHash;
      }
      
      const updated = updateRowById(sheets.usersSheet, id, "User ID", updateData);
      if (updated) {
        return jsonResponse({ success: true, message: "User updated successfully." });
      } else {
        return jsonResponse({ success: false, error: "User not found." });
      }
    }
    
    if (action === 'delete_user') {
      const id = payload.id;
      if (!id) {
        return jsonResponse({ success: false, error: "User ID is required." });
      }
      
      const deleted = deleteRowById(sheets.usersSheet, id, "User ID");
      if (deleted) {
        return jsonResponse({ success: true, message: "User deleted successfully." });
      } else {
        return jsonResponse({ success: false, error: "User not found." });
      }
    }
    
    // --- CUSTOMER ACTIONS ---
    if (action === 'add_customer') {
      const name = (payload.name || '').trim();
      const mobileNumber = (payload.mobileNumber || '').trim();
      const whatsAppNumber = (payload.whatsAppNumber || '').trim();
      const destinationCountry = (payload.destinationCountry || '').trim();
      const source = (payload.source || 'Other').trim();
      const remarks = (payload.remarks || '').trim();
      const customerCategory = (payload.customerCategory || '').trim();
      const address = (payload.address || '').trim();
      const gender = (payload.gender || '').trim();
      
      if (!name || !mobileNumber) {
        return jsonResponse({ success: false, error: "Customer name and mobile number are required." });
      }
      
      const customers = getCustomers(sheets.customersSheet);
      const exists = customers.some(c => c.mobileNumber === mobileNumber);
      if (exists) {
        return jsonResponse({ success: false, error: "A customer with this mobile number already exists." });
      }
      
      let nextNum = 1;
      if (customers.length > 0) {
        const nums = customers.map(c => {
          const match = c.id.match(/CUS-(\\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        });
        nextNum = Math.max(...nums) + 1;
      }
      const customerId = "CUS-" + nextNum.toString().padStart(6, '0');
      const createdAt = new Date().toISOString();
      
      appendRowByHeader(sheets.customersSheet, {
        "Customer ID": customerId,
        "Full Name": name,
        "Mobile Number": mobileNumber,
        "WhatsApp Number": whatsAppNumber,
        "Destination Country": destinationCountry,
        "Source": source,
        "Remarks": remarks,
        "Created At": createdAt,
        "Customer Category": customerCategory,
        "Address": address,
        "Gender": gender
      });
      
      const newCustomer = {
        id: customerId,
        name: name,
        mobileNumber: mobileNumber,
        whatsAppNumber: whatsAppNumber,
        destinationCountry: destinationCountry,
        source: source,
        remarks: remarks,
        createdAt: createdAt,
        customerCategory: customerCategory,
        address: address,
        gender: gender
      };
      
      return jsonResponse({
        success: true,
        customer: newCustomer,
        message: "Customer added successfully."
      });
    }
    
    if (action === 'update_customer') {
      const id = payload.id;
      const name = (payload.name || '').trim();
      const mobileNumber = (payload.mobileNumber || '').trim();
      const whatsAppNumber = (payload.whatsAppNumber || '').trim();
      const destinationCountry = (payload.destinationCountry || '').trim();
      const source = (payload.source || 'Other').trim();
      const remarks = (payload.remarks || '').trim();
      const customerCategory = (payload.customerCategory || '').trim();
      const address = (payload.address || '').trim();
      const gender = (payload.gender || '').trim();
      
      if (!id || !name || !mobileNumber) {
        return jsonResponse({ success: false, error: "ID, Customer Name and Mobile Number are required." });
      }

      const customers = getCustomers(sheets.customersSheet);
      const exists = customers.some(c => c.id !== id && c.mobileNumber === mobileNumber);
      if (exists) {
        return jsonResponse({ success: false, error: "Another customer with this mobile number already exists." });
      }

      const updated = updateRowById(sheets.customersSheet, id, "Customer ID", {
        "Full Name": name,
        "Mobile Number": mobileNumber,
        "WhatsApp Number": whatsAppNumber,
        "Destination Country": destinationCountry,
        "Source": source,
        "Remarks": remarks,
        "Customer Category": customerCategory,
        "Address": address,
        "Gender": gender
      });

      if (updated) {
        updateDenormalizedCustomerData(sheets, id, name, mobileNumber);
        return jsonResponse({
          success: true,
          message: "Customer updated successfully."
        });
      } else {
        return jsonResponse({ success: false, error: "Customer not found." });
      }
    }

    if (action === 'delete_customer') {
      const id = payload.id;
      if (!id) {
        return jsonResponse({ success: false, error: "Customer ID is required." });
      }

      const deleted = deleteRowById(sheets.customersSheet, id, "Customer ID");
      if (deleted) {
        deleteCascadeByCustomerId(sheets, id);
        return jsonResponse({ success: true, message: "Customer and associated records deleted." });
      } else {
        return jsonResponse({ success: false, error: "Customer not found." });
      }
    }

    if (action === 'archive_customer') {
      const id = payload.id;
      const archivedBy = (payload.archivedBy || 'Staff').trim();
      const archiveReason = (payload.archiveReason || 'Manual Archive').trim();
      const archivedAt = payload.archivedAt || new Date().toISOString();

      if (!id) {
        return jsonResponse({ success: false, error: "Customer ID is required." });
      }

      const customers = getCustomers(sheets.customersSheet);
      const targetCustomer = customers.find(c => c.id === id);

      if (!targetCustomer) {
        return jsonResponse({ success: false, error: "Customer not found in Customers sheet." });
      }

      // 1. Update Customers sheet Status to 'Archived'
      const updated = updateRowById(sheets.customersSheet, id, "Customer ID", {
        "Status": "Archived",
        "Archived At": archivedAt,
        "Archived By": archivedBy
      });

      if (!updated) {
        return jsonResponse({ success: false, error: "Failed to update Customer status in Google Sheets." });
      }

      // 2. Add entry into Archived Customers sheet
      const archivedList = getArchivedCustomers(sheets.archivedCustomersSheet);
      let nextNum = 1;
      if (archivedList.length > 0) {
        const nums = archivedList.map(a => {
          const match = (a.archiveId || '').match(/ARC-(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        });
        nextNum = Math.max(...nums) + 1;
      }
      const archiveId = "ARC-" + nextNum.toString().padStart(6, '0');

      appendRowByHeader(sheets.archivedCustomersSheet, {
        "Archive ID": archiveId,
        "Customer ID": targetCustomer.id,
        "Full Name": targetCustomer.name,
        "Mobile Number": targetCustomer.mobileNumber,
        "WhatsApp Number": targetCustomer.whatsAppNumber || '',
        "IMO Number": targetCustomer.imoNumber || '',
        "Email": '',
        "Customer Category": targetCustomer.customerCategory || '',
        "Address": targetCustomer.address || '',
        "Gender": targetCustomer.gender || '',
        "Destination Country": targetCustomer.destinationCountry || '',
        "Source": targetCustomer.source || '',
        "Remarks": targetCustomer.remarks || '',
        "Created At": targetCustomer.createdAt || '',
        "Archived At": archivedAt,
        "Archived By": archivedBy,
        "Archive Reason": archiveReason,
        "Original Customer ID": targetCustomer.id,
        "Status": "Archived"
      });

      SpreadsheetApp.flush();

      return jsonResponse({
        success: true,
        archiveId: archiveId,
        customerId: id,
        message: "Customer successfully archived into Archived Customers sheet."
      });
    }

    if (action === 'restore_customer') {
      const id = payload.id;
      const restoredBy = (payload.restoredBy || 'Staff').trim();
      const restoredAt = payload.restoredAt || new Date().toISOString();

      if (!id) {
        return jsonResponse({ success: false, error: "Customer ID is required." });
      }

      // 1. Update Customers sheet Status back to 'Active'
      const updated = updateRowById(sheets.customersSheet, id, "Customer ID", {
        "Status": "Active",
        "Restored At": restoredAt,
        "Restored By": restoredBy
      });

      if (!updated) {
        return jsonResponse({ success: false, error: "Customer not found in Customers sheet." });
      }

      // 2. Remove entry from Archived Customers sheet
      deleteRowById(sheets.archivedCustomersSheet, id, "Customer ID");
      deleteRowById(sheets.archivedCustomersSheet, id, "Original Customer ID");

      SpreadsheetApp.flush();

      return jsonResponse({
        success: true,
        customerId: id,
        message: "Customer successfully restored to Active status."
      });
    }

    if (action === 'permanent_delete_customer') {
      const id = payload.id;
      if (!id) {
        return jsonResponse({ success: false, error: "Customer ID is required." });
      }

      // 1. Delete from Customers sheet
      deleteRowById(sheets.customersSheet, id, "Customer ID");

      // 2. Delete from Archived Customers sheet
      deleteRowById(sheets.archivedCustomersSheet, id, "Customer ID");
      deleteRowById(sheets.archivedCustomersSheet, id, "Original Customer ID");

      // 3. Delete associated records
      deleteCascadeByCustomerId(sheets, id);

      SpreadsheetApp.flush();

      return jsonResponse({
        success: true,
        customerId: id,
        message: "Customer permanently deleted from system."
      });
    }

    // --- TICKET ACTIONS ---
    if (action === 'create_ticket') {
      const customerId = (payload.customerId || '').trim();
      const name = (payload.name || '').trim();
      const mobileNumber = (payload.mobileNumber || '').trim();
      const conversationDescription = (payload.conversationDescription || '').trim();
      const status = (payload.status || 'Open').trim();
      
      if (!customerId || !name || !mobileNumber || !conversationDescription) {
        return jsonResponse({ success: false, error: "Customer details and conversation description are required." });
      }
      
      const tickets = getTickets(sheets.ticketsSheet);
      
      let nextNum = 1;
      if (tickets.length > 0) {
        const nums = tickets.map(t => {
          const match = t.id.match(/TKT-(\\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        });
        nextNum = Math.max(...nums) + 1;
      }
      const ticketId = "TKT-" + nextNum.toString().padStart(6, '0');
      const createdAt = new Date().toISOString();
      
      appendRowByHeader(sheets.ticketsSheet, {
        "Ticket ID": ticketId,
        "Customer ID": customerId,
        "Customer Name": name,
        "Mobile Number": mobileNumber,
        "Conversation Description": conversationDescription,
        "Status": status,
        "Created At": createdAt
      });
      
      const newTicket = {
        id: ticketId,
        customerId: customerId,
        name: name,
        mobileNumber: mobileNumber,
        conversationDescription: conversationDescription,
        status: status,
        createdAt: createdAt
      };
      
      return jsonResponse({
        success: true,
        ticket: newTicket,
        message: "Ticket created successfully."
      });
    }

    if (action === 'update_ticket') {
      const id = payload.id;
      const conversationDescription = (payload.conversationDescription || '').trim();
      const status = (payload.status || 'Open').trim();

      if (!id || !conversationDescription) {
        return jsonResponse({ success: false, error: "Ticket ID and Description are required." });
      }

      const updated = updateRowById(sheets.ticketsSheet, id, "Ticket ID", {
        "Conversation Description": conversationDescription,
        "Status": status
      });

      if (updated) {
        return jsonResponse({ success: true, message: "Ticket updated successfully." });
      } else {
        return jsonResponse({ success: false, error: "Ticket not found." });
      }
    }

    if (action === 'delete_ticket') {
      const id = payload.id;
      if (!id) {
        return jsonResponse({ success: false, error: "Ticket ID is required." });
      }

      const deleted = deleteRowById(sheets.ticketsSheet, id, "Ticket ID");
      if (deleted) {
        return jsonResponse({ success: true, message: "Ticket deleted successfully." });
      } else {
        return jsonResponse({ success: false, error: "Ticket not found." });
      }
    }

    // --- FOLLOWUP ACTIONS ---
    if (action === 'create_follow_up') {
      const customerId = (payload.customerId || '').trim();
      const name = (payload.name || '').trim();
      const mobileNumber = (payload.mobileNumber || '').trim();
      const followUpDate = (payload.followUpDate || '').trim();
      const followUpTime = (payload.followUpTime || '').trim();
      const notes = (payload.notes || '').trim();
      const status = (payload.status || 'Pending').trim();

      if (!customerId || !name || !mobileNumber || !followUpDate || !followUpTime) {
        return jsonResponse({ success: false, error: "Customer, Date, and Time are required." });
      }

      const followUps = getFollowUps(sheets.followUpsSheet);
      let nextNum = 1;
      if (followUps.length > 0) {
        const nums = followUps.map(f => {
          const match = f.id.match(/FUP-(\\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        });
        nextNum = Math.max(...nums) + 1;
      }
      const followUpId = "FUP-" + nextNum.toString().padStart(6, '0');
      const createdAt = new Date().toISOString();

      appendRowByHeader(sheets.followUpsSheet, {
        "Follow-up ID": followUpId,
        "Customer ID": customerId,
        "Customer Name": name,
        "Mobile Number": mobileNumber,
        "Follow-up Date": followUpDate,
        "Follow-up Time": followUpTime,
        "Notes": notes,
        "Status": status,
        "Created At": createdAt
      });

      const newFollowUp = {
        id: followUpId,
        customerId: customerId,
        name: name,
        mobileNumber: mobileNumber,
        followUpDate: followUpDate,
        followUpTime: followUpTime,
        notes: notes,
        status: status,
        createdAt: createdAt
      };

      return jsonResponse({
        success: true,
        followUp: newFollowUp,
        message: "Follow-up reminder created successfully."
      });
    }

    if (action === 'update_follow_up') {
      const id = payload.id;
      const followUpDate = (payload.followUpDate || '').trim();
      const followUpTime = (payload.followUpTime || '').trim();
      const notes = (payload.notes || '').trim();
      const status = (payload.status || 'Pending').trim();

      if (!id || !followUpDate || !followUpTime) {
        return jsonResponse({ success: false, error: "ID, Date, and Time are required." });
      }

      const updated = updateRowById(sheets.followUpsSheet, id, "Follow-up ID", {
        "Follow-up Date": followUpDate,
        "Follow-up Time": followUpTime,
        "Notes": notes,
        "Status": status
      });

      if (updated) {
        return jsonResponse({ success: true, message: "Follow-up updated successfully." });
      } else {
        return jsonResponse({ success: false, error: "Follow-up not found." });
      }
    }

    if (action === 'complete_follow_up') {
      const id = payload.id;
      const status = (payload.status || 'Completed').trim();

      if (!id) {
        return jsonResponse({ success: false, error: "ID is required." });
      }

      const updated = updateRowById(sheets.followUpsSheet, id, "Follow-up ID", {
        "Status": status
      });

      if (updated) {
        return jsonResponse({ success: true, message: "Follow-up marked as completed." });
      } else {
        return jsonResponse({ success: false, error: "Follow-up not found." });
      }
    }

    if (action === 'delete_follow_up') {
      const id = payload.id;
      if (!id) {
        return jsonResponse({ success: false, error: "ID is required." });
      }

      const deleted = deleteRowById(sheets.followUpsSheet, id, "Follow-up ID");
      if (deleted) {
        return jsonResponse({ success: true, message: "Follow-up deleted successfully." });
      } else {
        return jsonResponse({ success: false, error: "Follow-up not found." });
      }
    }
    
    return jsonResponse({
      success: false,
      error: "Invalid action or format."
    });
    
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err.toString()
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {
      // Ignore lock release error
    }
  }
}

// Set up the spreadsheet structures for core and enterprise sheets
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheetDefinitions = [
    {
      name: "Users",
      headers: ["User ID", "Full Name", "Login ID", "Password", "Role", "Status", "Created At"]
    },
    {
      name: "Customers",
      headers: ["Customer ID", "Full Name", "Mobile Number", "WhatsApp Number", "Destination Country", "Source", "Remarks", "Created At", "Customer Category", "Address", "Gender", "Status", "Archived At", "Archived By", "Restored At", "Restored By"]
    },
    {
      name: "Tickets",
      headers: ["Ticket ID", "Customer ID", "Customer Name", "Mobile Number", "Conversation Description", "Status", "Created At"]
    },
    {
      name: "FollowUps",
      headers: ["Follow-up ID", "Customer ID", "Customer Name", "Mobile Number", "Follow-up Date", "Follow-up Time", "Notes", "Status", "Created At"]
    },
    {
      name: "Archived Customers",
      headers: ["Archive ID", "Customer ID", "Full Name", "Mobile Number", "WhatsApp Number", "IMO Number", "Email", "Customer Category", "Address", "Gender", "Destination Country", "Source", "Remarks", "Created At", "Archived At", "Archived By", "Archive Reason", "Original Customer ID", "Status"]
    },
    {
      name: "Duplicate Groups",
      headers: ["Group ID", "Match Type", "Confidence Score", "Matched Value", "Primary Customer ID", "Duplicate Customer IDs", "Status", "Detected At", "Reviewed By", "Reviewed At"]
    },
    {
      name: "Duplicate Audit Log",
      headers: ["Log ID", "Group ID", "Action", "Primary Customer", "Duplicate Customer", "Performed By", "Date Time", "Reason"]
    },
    {
      name: "Customer Notes",
      headers: ["Note ID", "Customer ID", "Note", "Created By", "Created At", "Updated At"]
    },
    {
      name: "Activity Log",
      headers: ["Activity ID", "Customer ID", "Module", "Action", "Performed By", "Date Time", "Description"]
    },
    {
      name: "Sync Queue",
      headers: ["Queue ID", "Action", "Payload", "Status", "Retry Count", "Created At", "Completed At"]
    },
    {
      name: "System Logs",
      headers: ["Log ID", "Level", "Module", "Message", "Stack Trace", "Created At"]
    },
    {
      name: "Settings",
      headers: ["Setting Key", "Setting Value", "Updated By", "Updated At"]
    },
    {
      name: "Countries",
      headers: ["Country ID", "Country Name", "Status", "Sort Order"]
    },
    {
      name: "Categories",
      headers: ["Category ID", "Category Name", "Color", "Status"]
    },
    {
      name: "Sources",
      headers: ["Source ID", "Source Name", "Status"]
    },
    {
      name: "Dashboard Cache",
      headers: ["Metric", "Value", "Updated At"]
    },
    {
      name: "Notifications",
      headers: ["Notification ID", "User ID", "Title", "Message", "Type", "Read", "Created At"]
    },
    {
      name: "Employee Activity",
      headers: ["Employee ID", "Employee Name", "Tickets", "Customers", "FollowUps", "Login Time", "Logout Time", "Date"]
    },
    {
      name: "Backup History",
      headers: ["Backup ID", "File Name", "Google Drive URL", "Created By", "Created At"]
    },
    {
      name: "API Keys",
      headers: ["Provider", "API Key", "Status", "Updated At"]
    }
  ];

  function ensureSheetHeaders(sheet, requiredHeaders) {
    const lastColumn = sheet.getLastColumn();
    let existingHeaders = [];
    if (lastColumn > 0) {
      existingHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function(h) {
        return String(h).trim();
      });
    }
    
    const headersToAppend = [];
    for (let i = 0; i < requiredHeaders.length; i++) {
      const reqHeader = requiredHeaders[i];
      let found = false;
      for (let j = 0; j < existingHeaders.length; j++) {
        if (existingHeaders[j].toLowerCase() === reqHeader.trim().toLowerCase()) {
          found = true;
          break;
        }
      }
      if (!found) {
        headersToAppend.push(reqHeader);
      }
    }
    
    if (headersToAppend.length > 0) {
      const startCol = lastColumn + 1;
      const range = sheet.getRange(1, startCol, 1, headersToAppend.length);
      range.setValues([headersToAppend]);
      sheet.getRange(1, 1, 1, startCol + headersToAppend.length - 1).setFontWeight("bold");
    }
  }

  const resultSheets = {};

  for (let i = 0; i < sheetDefinitions.length; i++) {
    const def = sheetDefinitions[i];
    let sheet = ss.getSheetByName(def.name);
    if (!sheet) {
      sheet = ss.insertSheet(def.name);
      sheet.appendRow(def.headers);
      sheet.getRange(1, 1, 1, def.headers.length).setFontWeight("bold");
    } else {
      ensureSheetHeaders(sheet, def.headers);
    }

    if (def.name === "Users") resultSheets.usersSheet = sheet;
    else if (def.name === "Customers") resultSheets.customersSheet = sheet;
    else if (def.name === "Tickets") resultSheets.ticketsSheet = sheet;
    else if (def.name === "FollowUps") resultSheets.followUpsSheet = sheet;
    else if (def.name === "Archived Customers") resultSheets.archivedCustomersSheet = sheet;
    else if (def.name === "Duplicate Groups") resultSheets.duplicateGroupsSheet = sheet;
    else if (def.name === "Duplicate Audit Log") resultSheets.duplicateAuditLogSheet = sheet;
    else if (def.name === "Customer Notes") resultSheets.customerNotesSheet = sheet;
    else if (def.name === "Activity Log") resultSheets.activityLogSheet = sheet;
    else if (def.name === "Sync Queue") resultSheets.syncQueueSheet = sheet;
    else if (def.name === "System Logs") resultSheets.systemLogsSheet = sheet;
    else if (def.name === "Settings") resultSheets.settingsSheet = sheet;
    else if (def.name === "Countries") resultSheets.countriesSheet = sheet;
    else if (def.name === "Categories") resultSheets.categoriesSheet = sheet;
    else if (def.name === "Sources") resultSheets.sourcesSheet = sheet;
    else if (def.name === "Dashboard Cache") resultSheets.dashboardCacheSheet = sheet;
    else if (def.name === "Notifications") resultSheets.notificationsSheet = sheet;
    else if (def.name === "Employee Activity") resultSheets.employeeActivitySheet = sheet;
    else if (def.name === "Backup History") resultSheets.backupHistorySheet = sheet;
    else if (def.name === "API Keys") resultSheets.apiKeysSheet = sheet;
  }

  return resultSheets;
}

// Fetch all users as JSON objects using dynamic header mapping
function getUsers(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0].map(h => String(h).trim());
  const rows = data.slice(1);
  return rows.map(row => {
    const getVal = (colName, defaultVal = '') => {
      const idx = headers.indexOf(colName);
      return idx !== -1 && idx < row.length ? String(row[idx]) : defaultVal;
    };
    return {
      id: getVal("User ID"),
      fullName: getVal("Full Name"),
      loginId: getVal("Login ID"),
      passwordHash: getVal("Password"),
      role: getVal("Role"),
      status: getVal("Status"),
      createdAt: getVal("Created At")
    };
  });
}

// Fetch all customers as JSON objects using dynamic header mapping
function getCustomers(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0].map(h => String(h).trim());
  const rows = data.slice(1);
  
  return rows.map(row => {
    const getVal = (colName, defaultVal = '') => {
      const idx = headers.indexOf(colName);
      return idx !== -1 && idx < row.length ? String(row[idx]) : defaultVal;
    };

    const statusVal = getVal("Status", "Active");
    const isArchived = statusVal.toLowerCase() === 'archived' || getVal("Is Archived").toLowerCase() === 'true';
    
    return {
      id: getVal("Customer ID"),
      name: getVal("Full Name"),
      mobileNumber: getVal("Mobile Number"),
      whatsAppNumber: getVal("WhatsApp Number"),
      destinationCountry: getVal("Destination Country"),
      source: getVal("Source", "Other"),
      remarks: getVal("Remarks"),
      createdAt: getVal("Created At"),
      customerCategory: getVal("Customer Category"),
      address: getVal("Address"),
      gender: getVal("Gender"),
      status: statusVal,
      isArchived: isArchived,
      archivedAt: getVal("Archived At"),
      archivedBy: getVal("Archived By"),
      restoredAt: getVal("Restored At"),
      restoredBy: getVal("Restored By")
    };
  });
}

// Fetch all archived customers as JSON objects using dynamic header mapping
function getArchivedCustomers(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0].map(h => String(h).trim());
  const rows = data.slice(1);

  return rows.map(row => {
    const getVal = (colName, defaultVal = '') => {
      const idx = headers.indexOf(colName);
      return idx !== -1 && idx < row.length ? String(row[idx]) : defaultVal;
    };

    return {
      archiveId: getVal("Archive ID"),
      id: getVal("Customer ID") || getVal("Original Customer ID"),
      name: getVal("Full Name"),
      mobileNumber: getVal("Mobile Number"),
      whatsAppNumber: getVal("WhatsApp Number"),
      imoNumber: getVal("IMO Number"),
      email: getVal("Email"),
      customerCategory: getVal("Customer Category"),
      address: getVal("Address"),
      gender: getVal("Gender"),
      destinationCountry: getVal("Destination Country"),
      source: getVal("Source"),
      remarks: getVal("Remarks"),
      createdAt: getVal("Created At"),
      archivedAt: getVal("Archived At"),
      archivedBy: getVal("Archived By"),
      archiveReason: getVal("Archive Reason"),
      isArchived: true,
      status: "Archived"
    };
  });
}

// Fetch all tickets as JSON objects using dynamic header mapping
function getTickets(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0].map(h => String(h).trim());
  const rows = data.slice(1);
  return rows.map(row => {
    const getVal = (colName, defaultVal = '') => {
      const idx = headers.indexOf(colName);
      return idx !== -1 && idx < row.length ? String(row[idx]) : defaultVal;
    };
    return {
      id: getVal("Ticket ID"),
      customerId: getVal("Customer ID"),
      name: getVal("Customer Name"),
      mobileNumber: getVal("Mobile Number"),
      conversationDescription: getVal("Conversation Description"),
      status: getVal("Status"),
      createdAt: getVal("Created At")
    };
  });
}

// Fetch all followups as JSON objects using dynamic header mapping
function getFollowUps(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0].map(h => String(h).trim());
  const rows = data.slice(1);
  return rows.map(row => {
    const getVal = (colName, defaultVal = '') => {
      const idx = headers.indexOf(colName);
      return idx !== -1 && idx < row.length ? String(row[idx]) : defaultVal;
    };
    return {
      id: getVal("Follow-up ID"),
      customerId: getVal("Customer ID"),
      name: getVal("Customer Name"),
      mobileNumber: getVal("Mobile Number"),
      followUpDate: getVal("Follow-up Date"),
      followUpTime: getVal("Follow-up Time"),
      notes: getVal("Notes"),
      status: getVal("Status"),
      createdAt: getVal("Created At")
    };
  });
}

// Generic row deletion helper by header name
function deleteRowById(sheet, id, idColName) {
  const data = sheet.getDataRange().getValues();
  if (data.length === 0) return false;
  const headers = data[0].map(h => String(h).trim());
  const idColIndex = headers.indexOf(idColName);
  if (idColIndex === -1) return false;
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idColIndex]) === id) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

// Generic row update helper by header name
function updateRowById(sheet, id, idColName, newValuesMap) {
  const data = sheet.getDataRange().getValues();
  if (data.length === 0) return false;
  const headers = data[0].map(h => String(h).trim());
  const idColIndex = headers.indexOf(idColName);
  if (idColIndex === -1) return false;
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idColIndex]) === id) {
      for (let colName in newValuesMap) {
        const colIndex = headers.indexOf(colName);
        if (colIndex !== -1) {
          sheet.getRange(i + 1, colIndex + 1).setValue(newValuesMap[colName]);
        }
      }
      return true;
    }
  }
  return false;
}

// Generic dynamic row append helper that maps payload object to the exact column positions based on headers
function appendRowByHeader(sheet, valueMap) {
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return;
  
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
    return String(h).trim();
  });
  
  const rowValues = [];
  for (let i = 0; i < headers.length; i++) {
    const headerName = headers[i];
    if (headerName in valueMap) {
      rowValues.push(valueMap[headerName]);
    } else {
      rowValues.push('');
    }
  }
  
  sheet.appendRow(rowValues);
}

// Cascade update denormalized customer names and mobile numbers across sheets
function updateDenormalizedCustomerData(sheets, customerId, newName, newMobile) {
  // Update Tickets
  const ticketData = sheets.ticketsSheet.getDataRange().getValues();
  if (ticketData.length > 0) {
    const headers = ticketData[0].map(h => String(h).trim());
    const custIdIdx = headers.indexOf("Customer ID");
    const custNameIdx = headers.indexOf("Customer Name");
    const mobileIdx = headers.indexOf("Mobile Number");
    
    if (custIdIdx !== -1) {
      for (let i = 1; i < ticketData.length; i++) {
        if (String(ticketData[i][custIdIdx]) === customerId) {
          if (custNameIdx !== -1) {
            sheets.ticketsSheet.getRange(i + 1, custNameIdx + 1).setValue(newName);
          }
          if (mobileIdx !== -1) {
            sheets.ticketsSheet.getRange(i + 1, mobileIdx + 1).setValue(newMobile);
          }
        }
      }
    }
  }
  
  // Update Followups
  const followUpData = sheets.followUpsSheet.getDataRange().getValues();
  if (followUpData.length > 0) {
    const headers = followUpData[0].map(h => String(h).trim());
    const custIdIdx = headers.indexOf("Customer ID");
    const custNameIdx = headers.indexOf("Customer Name");
    const mobileIdx = headers.indexOf("Mobile Number");
    
    if (custIdIdx !== -1) {
      for (let i = 1; i < followUpData.length; i++) {
        if (String(followUpData[i][custIdIdx]) === customerId) {
          if (custNameIdx !== -1) {
            sheets.followUpsSheet.getRange(i + 1, custNameIdx + 1).setValue(newName);
          }
          if (mobileIdx !== -1) {
            sheets.followUpsSheet.getRange(i + 1, mobileIdx + 1).setValue(newMobile);
          }
        }
      }
    }
  }
}

// Cascade deletes
function deleteCascadeByCustomerId(sheets, customerId) {
  // Delete from tickets
  const ticketData = sheets.ticketsSheet.getDataRange().getValues();
  if (ticketData.length > 0) {
    const headers = ticketData[0].map(h => String(h).trim());
    const custIdIdx = headers.indexOf("Customer ID");
    if (custIdIdx !== -1) {
      for (let i = ticketData.length - 1; i >= 1; i--) {
        if (String(ticketData[i][custIdIdx]) === customerId) {
          sheets.ticketsSheet.deleteRow(i + 1);
        }
      }
    }
  }
  
  // Delete from followups
  const followUpData = sheets.followUpsSheet.getDataRange().getValues();
  if (followUpData.length > 0) {
    const headers = followUpData[0].map(h => String(h).trim());
    const custIdIdx = headers.indexOf("Customer ID");
    if (custIdIdx !== -1) {
      for (let i = followUpData.length - 1; i >= 1; i--) {
        if (String(followUpData[i][custIdIdx]) === customerId) {
          sheets.followUpsSheet.deleteRow(i + 1);
        }
      }
    }
  }
}

// Helper to return JSON Response with CORS headers
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Pure JS SHA256 implementation for secure password hashing
function hashPassword(password) {
  function rotateRight(n, x) {
    return (x >>> n) | (x << (32 - n));
  }
  var words = [];
  var str = unescape(encodeURIComponent(password));
  for (var i = 0; i < str.length; i++) {
    words[i >> 2] |= (str.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
  }
  var bits = str.length * 8;
  words[bits >> 5] |= 0x80 << (24 - (bits % 32));
  var maxIdx = (((bits + 64) >>> 9) << 4) + 15;
  while (words.length <= maxIdx) {
    words.push(0);
  }
  words[maxIdx] = bits;

  var h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  var h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  var k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  for (var i = 0; i < words.length; i += 16) {
    var w = words.slice(i, i + 16);
    while (w.length < 64) {
      w.push(0);
    }
    for (var j = 16; j < 64; j++) {
      var s0 = rotateRight(7, w[j - 15]) ^ rotateRight(18, w[j - 15]) ^ (w[j - 15] >>> 3);
      var s1 = rotateRight(17, w[j - 2]) ^ rotateRight(19, w[j - 2]) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
    }
    var a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (var j = 0; j < 64; j++) {
      var s1 = rotateRight(6, e) ^ rotateRight(11, e) ^ rotateRight(25, e);
      var ch = (e & f) ^ (~e & g);
      var temp1 = (h + s1 + ch + k[j] + (w[j] || 0)) | 0;
      var s0 = rotateRight(2, a) ^ rotateRight(13, a) ^ rotateRight(22, a);
      var maj = (a & b) ^ (a & c) ^ (b & c);
      var temp2 = (s0 + maj) | 0;

      h = g; g = f; f = e; e = (d + temp1) | 0;
      d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }
  var hex = [h0, h1, h2, h3, h4, h5, h6, h7].map(function(v) {
    var val = v >>> 0;
    return val.toString(16).padStart(8, '0');
  }).join('');
  return hex;
}
`;

