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
    const action = e.parameter.action;
    const sheets = setupSheets();
    
    if (action === 'get_data') {
      const customers = getCustomers(sheets.customersSheet);
      const tickets = getTickets(sheets.ticketsSheet);
      const followUps = getFollowUps(sheets.followUpsSheet);
      const users = getUsers(sheets.usersSheet);
      
      return jsonResponse({
        success: true,
        customers: customers,
        tickets: tickets,
        followUps: followUps,
        users: users
      });
    }
    
    if (action === 'get_users') {
      const users = getUsers(sheets.usersSheet);
      return jsonResponse({
        success: true,
        users: users
      });
    }

    if (action === 'getCustomers' || action === 'get_customers') {
      const customers = getCustomers(sheets.customersSheet);
      return jsonResponse({
        success: true,
        customers: customers
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
  try {
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
          sheets.usersSheet.appendRow([
            userId,
            adminFullName,
            adminLoginId,
            adminPasswordHash,
            "Admin",
            "Active",
            createdAt
          ]);
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
        sheets.usersSheet.appendRow([
          userId,
          "Admin",
          "admin",
          defaultHash,
          "Admin",
          "Active",
          createdAt
        ]);
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
      
      sheets.usersSheet.appendRow([
        userId,
        fullName,
        loginId,
        passwordHash,
        role,
        status,
        createdAt
      ]);
      
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
      
      const updated = updateRowById(sheets.usersSheet, id, 0, updateData);
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
      
      const deleted = deleteRowById(sheets.usersSheet, id, 0);
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
      
      sheets.customersSheet.appendRow([
        customerId, 
        name, 
        mobileNumber, 
        whatsAppNumber, 
        destinationCountry, 
        source, 
        remarks, 
        createdAt
      ]);
      
      const newCustomer = {
        id: customerId,
        name: name,
        mobileNumber: mobileNumber,
        whatsAppNumber: whatsAppNumber,
        destinationCountry: destinationCountry,
        source: source,
        remarks: remarks,
        createdAt: createdAt
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
      
      if (!id || !name || !mobileNumber) {
        return jsonResponse({ success: false, error: "ID, Customer Name and Mobile Number are required." });
      }

      const customers = getCustomers(sheets.customersSheet);
      const exists = customers.some(c => c.id !== id && c.mobileNumber === mobileNumber);
      if (exists) {
        return jsonResponse({ success: false, error: "Another customer with this mobile number already exists." });
      }

      const updated = updateRowById(sheets.customersSheet, id, 0, {
        "Full Name": name,
        "Mobile Number": mobileNumber,
        "WhatsApp Number": whatsAppNumber,
        "Destination Country": destinationCountry,
        "Source": source,
        "Remarks": remarks
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

      const deleted = deleteRowById(sheets.customersSheet, id, 0);
      if (deleted) {
        deleteCascadeByCustomerId(sheets, id);
        return jsonResponse({ success: true, message: "Customer and associated records deleted." });
      } else {
        return jsonResponse({ success: false, error: "Customer not found." });
      }
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
      
      sheets.ticketsSheet.appendRow([
        ticketId,
        customerId,
        name,
        mobileNumber,
        conversationDescription,
        status,
        createdAt
      ]);
      
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

      const updated = updateRowById(sheets.ticketsSheet, id, 0, {
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

      const deleted = deleteRowById(sheets.ticketsSheet, id, 0);
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

      sheets.followUpsSheet.appendRow([
        followUpId,
        customerId,
        name,
        mobileNumber,
        followUpDate,
        followUpTime,
        notes,
        status,
        createdAt
      ]);

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

      const updated = updateRowById(sheets.followUpsSheet, id, 0, {
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

      const updated = updateRowById(sheets.followUpsSheet, id, 0, {
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

      const deleted = deleteRowById(sheets.followUpsSheet, id, 0);
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
  }
}

// Set up the spreadsheet structures
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  let usersSheet = ss.getSheetByName("Users");
  if (!usersSheet) {
    usersSheet = ss.insertSheet("Users");
    // Append Headers: User ID, Full Name, Login ID, Password, Role, Status, Created At
    usersSheet.appendRow([
      "User ID", 
      "Full Name", 
      "Login ID", 
      "Password", 
      "Role", 
      "Status", 
      "Created At"
    ]);
    usersSheet.getRange("A1:G1").setFontWeight("bold");
  }

  let customersSheet = ss.getSheetByName("Customers");
  if (!customersSheet) {
    customersSheet = ss.insertSheet("Customers");
    customersSheet.appendRow([
      "Customer ID", 
      "Full Name", 
      "Mobile Number", 
      "WhatsApp Number", 
      "Destination Country", 
      "Source", 
      "Remarks", 
      "Created At"
    ]);
    customersSheet.getRange("A1:H1").setFontWeight("bold");
  }
  
  let ticketsSheet = ss.getSheetByName("Tickets");
  if (!ticketsSheet) {
    ticketsSheet = ss.insertSheet("Tickets");
    ticketsSheet.appendRow([
      "Ticket ID", 
      "Customer ID", 
      "Customer Name", 
      "Mobile Number", 
      "Conversation Description", 
      "Status", 
      "Created At"
    ]);
    ticketsSheet.getRange("A1:G1").setFontWeight("bold");
  }

  let followUpsSheet = ss.getSheetByName("FollowUps");
  if (!followUpsSheet) {
    followUpsSheet = ss.insertSheet("FollowUps");
    followUpsSheet.appendRow([
      "Follow-up ID", 
      "Customer ID", 
      "Customer Name", 
      "Mobile Number", 
      "Follow-up Date", 
      "Follow-up Time", 
      "Notes", 
      "Status", 
      "Created At"
    ]);
    followUpsSheet.getRange("A1:I1").setFontWeight("bold");
  }
  
  return {
    usersSheet: usersSheet,
    customersSheet: customersSheet,
    ticketsSheet: ticketsSheet,
    followUpsSheet: followUpsSheet
  };
}

// Fetch all users as JSON objects
function getUsers(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const rows = data.slice(1);
  return rows.map(row => ({
    id: String(row[0]),
    fullName: String(row[1]),
    loginId: String(row[2]),
    passwordHash: String(row[3]),
    role: String(row[4]),
    status: String(row[5]),
    createdAt: String(row[6])
  }));
}

// Fetch all customers as JSON objects
function getCustomers(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const rows = data.slice(1);
  return rows.map(row => ({
    id: String(row[0]),
    name: String(row[1]),
    mobileNumber: String(row[2]),
    whatsAppNumber: String(row[3] || ''),
    destinationCountry: String(row[4] || ''),
    source: String(row[5] || 'Other'),
    remarks: String(row[6] || ''),
    createdAt: String(row[7])
  }));
}

// Fetch all tickets as JSON objects
function getTickets(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const rows = data.slice(1);
  return rows.map(row => ({
    id: String(row[0]),
    customerId: String(row[1]),
    name: String(row[2]),
    mobileNumber: String(row[3]),
    conversationDescription: String(row[4]),
    status: String(row[5]),
    createdAt: String(row[6])
  }));
}

// Fetch all followups as JSON objects
function getFollowUps(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const rows = data.slice(1);
  return rows.map(row => ({
    id: String(row[0]),
    customerId: String(row[1]),
    name: String(row[2]),
    mobileNumber: String(row[3]),
    followUpDate: String(row[4]),
    followUpTime: String(row[5]),
    notes: String(row[6]),
    status: String(row[7]),
    createdAt: String(row[8])
  }));
}

// Generic row deletion helper
function deleteRowById(sheet, id, idColIndex) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idColIndex]) === id) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

// Generic row update helper
function updateRowById(sheet, id, idColIndex, newValuesMap) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
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

// Cascade update denormalized customer names and mobile numbers across sheets
function updateDenormalizedCustomerData(sheets, customerId, newName, newMobile) {
  // Update Tickets
  const ticketData = sheets.ticketsSheet.getDataRange().getValues();
  for (let i = 1; i < ticketData.length; i++) {
    if (String(ticketData[i][1]) === customerId) { // Customer ID is col 1 (B)
      sheets.ticketsSheet.getRange(i + 1, 3).setValue(newName);       // Customer Name is col 2 (C, 1-indexed is 3)
      sheets.ticketsSheet.getRange(i + 1, 4).setValue(newMobile);    // Mobile Number is col 3 (D, 1-indexed is 4)
    }
  }
  
  // Update Followups
  const followUpData = sheets.followUpsSheet.getDataRange().getValues();
  for (let i = 1; i < followUpData.length; i++) {
    if (String(followUpData[i][1]) === customerId) { // Customer ID is col 1 (B)
      sheets.followUpsSheet.getRange(i + 1, 3).setValue(newName);     // Customer Name is col 2 (C, 1-indexed is 3)
      sheets.followUpsSheet.getRange(i + 1, 4).setValue(newMobile);  // Mobile Number is col 3 (D, 1-indexed is 4)
    }
  }
}

// Cascade deletes
function deleteCascadeByCustomerId(sheets, customerId) {
  // Delete from tickets
  const ticketData = sheets.ticketsSheet.getDataRange().getValues();
  for (let i = ticketData.length - 1; i >= 1; i--) {
    if (String(ticketData[i][1]) === customerId) {
      sheets.ticketsSheet.deleteRow(i + 1);
    }
  }
  
  // Delete from followups
  const followUpData = sheets.followUpsSheet.getDataRange().getValues();
  for (let i = followUpData.length - 1; i >= 1; i--) {
    if (String(followUpData[i][1]) === customerId) {
      sheets.followUpsSheet.deleteRow(i + 1);
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

