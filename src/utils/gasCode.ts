export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * Google Apps Script - MoveAbroad CRM Backend REST API
 * 
 * Instructions:
 * 1. Open a new Google Sheet.
 * 2. Click on "Extensions" -> "Apps Script".
 * 3. Delete any default code in Code.gs and paste this script.
 * 4. Click the Save icon (floppy disk).
 * 5. Click "Deploy" (top right) -> "New deployment".
 * 6. Select type: "Web app".
 * 7. Set:
 *    - Description: "MoveAbroad CRM REST API"
 *    - Execute as: "Me" (your-email)
 *    - Who has access: "Anyone" (This is crucial to allow the CRM UI to access it)
 * 8. Click "Deploy".
 * 9. Authorize the application if prompted.
 * 10. Copy the "Web app URL" and paste it into the Settings of your MoveAbroad CRM App!
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
      const adminPassword = (payload.adminPassword || '').trim();
      
      if (adminLoginId && adminPassword) {
        const users = getUsers(sheets.usersSheet);
        const exists = users.some(u => u.loginId.toLowerCase() === adminLoginId.toLowerCase());
        if (!exists) {
          const userId = "USR-000001";
          const createdAt = new Date().toISOString();
          sheets.usersSheet.appendRow([
            userId,
            adminFullName,
            adminLoginId,
            adminPassword,
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
      const passwordRaw = payload.password;
      
      const loginId = typeof loginIdRaw === 'string' ? loginIdRaw.trim() : '';
      const password = typeof passwordRaw === 'string' ? passwordRaw.trim() : '';
      
      console.log("Authentication logs:");
      console.log("- Login ID received: '" + loginId + "'");
      console.log("- Password received: '" + (password ? "******" : "empty") + "'");
      
      if (!sheets.usersSheet) {
        console.log("- Result: Users sheet missing");
        return jsonResponse({ success: false, error: "Users sheet missing" });
      }
      
      if (!loginId || !password) {
        console.log("- Result: Missing Login ID or Password");
        return jsonResponse({ success: false, error: "Login ID and Password are required." });
      }
      
      let users = getUsers(sheets.usersSheet);
      
      // Automatically create a default admin if no users exist
      if (users.length === 0) {
        console.log("- No users exist. Auto-creating default admin.");
        const userId = "USR-000001";
        const createdAt = new Date().toISOString();
        sheets.usersSheet.appendRow([
          userId,
          "Admin",
          "admin",
          "2026",
          "Admin",
          "Active",
          createdAt
        ]);
        SpreadsheetApp.flush();
        users = getUsers(sheets.usersSheet);
      }
      
      const user = users.find(u => u.loginId.toLowerCase().trim() === loginId.toLowerCase() && u.password.trim() === password);
      
      if (!user) {
        const userExists = users.some(u => u.loginId.toLowerCase().trim() === loginId.toLowerCase());
        console.log("- User found in sheet: " + (userExists ? "Yes" : "No"));
        console.log("- Password matched: No");
        console.log("- Final authentication result: Failed");
        if (userExists) {
          return jsonResponse({ success: false, error: "Password incorrect" });
        } else {
          return jsonResponse({ success: false, error: "User not found" });
        }
      }
      
      console.log("- User found in sheet: Yes");
      console.log("- Password matched: Yes");
      
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
      const password = (payload.password || '').trim();
      const role = (payload.role || 'Staff').trim();
      const status = (payload.status || 'Active').trim();
      
      if (!fullName || !loginId || !password) {
        return jsonResponse({ success: false, error: "Full Name, Login ID, and Password are required." });
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
        password,
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
      const password = (payload.password || '').trim();
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
      
      if (password) {
        updateData["Password"] = password;
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
    password: String(row[3]),
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
`;

