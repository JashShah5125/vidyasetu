const fs = require('fs');
const path = require('path');

const firstNames = ['Amit', 'Rahul', 'Neha', 'Priya', 'Vikram', 'Anjali', 'Karan', 'Sneha', 'Rohan', 'Pooja', 'Suresh', 'Ramesh', 'Rakesh', 'Sanjay', 'Sunil', 'Rajesh', 'Vinod', 'Anil', 'Dinesh', 'Deepak', 'Manish', 'Sandeep', 'Pankaj', 'Vijay', 'Ashok'];
const lastNames = ['Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Joshi', 'Desai', 'Shah', 'Mehta', 'Bhatia', 'Chauhan', 'Tiwari', 'Pandey', 'Yadav', 'Mishra', 'Reddy', 'Rao', 'Nair', 'Pillai', 'Iyer', 'Menon', 'Das', 'Roy', 'Sen'];

let usersSql = "INSERT IGNORE INTO users (id, tenant_id, name, email, mobile, password_hash, user_type) VALUES\n";
let profilesSql = "INSERT IGNORE INTO staff_profiles (tenant_id, branch_id, user_id, employee_id, contact_number, first_name, last_name, gender, employee_type, designation, department, employment_type, status, max_lectures_per_day) VALUES\n";
let accessSql = "INSERT IGNORE INTO user_branch_access (tenant_id, user_id, branch_id) VALUES\n";
let subjectsSql = "INSERT IGNORE INTO teacher_subjects (tenant_id, teacher_user_id, subject_id) VALUES\n";

// Existing 2 users
let users = [
    `(201, 2, 'Arvind Kelkar', 'arvind@vidyasetu.com', '9876543210', 'hash', 'staff')`,
    `(202, 2, 'Sunita Sharma', 'sunita@vidyasetu.com', '9876543211', 'hash', 'staff')`
];

let profiles = [
    `(2, 1, 201, 'EMP-1001', '9876543210', 'Arvind', 'Kelkar', 'Male', 'Teaching', 'Senior Physics Faculty', 'Academics', 'Full-Time', 'active', 4)`,
    `(2, 1, 202, 'EMP-1002', '9876543211', 'Sunita', 'Sharma', 'Female', 'Teaching', 'Mathematics Faculty', 'Academics', 'Full-Time', 'active', 4)`
];

let accesses = [
    `(2, 201, 1)`,
    `(2, 201, 2)`,
    `(2, 202, 1)`
];

let subs = [
    `(2, 201, 1)`,
    `(2, 202, 2)`
];

// Add 25 more
for (let i = 1; i <= 25; i++) {
    const id = 202 + i;
    const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
    const gender = ['Amit', 'Rahul', 'Vikram', 'Karan', 'Rohan', 'Suresh', 'Ramesh', 'Rakesh', 'Sanjay', 'Sunil', 'Rajesh', 'Vinod', 'Anil', 'Dinesh', 'Deepak', 'Manish', 'Sandeep', 'Pankaj', 'Vijay', 'Ashok'].includes(fn) ? 'Male' : 'Female';
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${id}@vidyasetu.com`;
    const mobile = `987654${(3000 + i).toString().padStart(4, '0')}`;
    const empId = `EMP-${1002 + i}`;
    
    // Assign a random subject between 1 and 15
    const subjectId = Math.floor(Math.random() * 15) + 1;
    const branchId = Math.floor(Math.random() * 2) + 1; // 1 or 2

    users.push(`(${id}, 2, '${fn} ${ln}', '${email}', '${mobile}', 'hash', 'staff')`);
    profiles.push(`(2, ${branchId}, ${id}, '${empId}', '${mobile}', '${fn}', '${ln}', '${gender}', 'Teaching', 'Faculty', 'Academics', 'Full-Time', 'active', 4)`);
    accesses.push(`(2, ${id}, ${branchId})`);
    subs.push(`(2, ${id}, ${subjectId})`);
}

usersSql += users.join(",\n") + ";\n\n";
profilesSql += profiles.join(",\n") + ";\n\n";
accessSql += accesses.join(",\n") + ";\n\n";
subjectsSql += subs.join(",\n") + ";\n\n";

const finalSql = `-- 027_seed_staff.sql
-- Insert mock staff for testing

${usersSql}${profilesSql}${accessSql}${subjectsSql}`;

fs.writeFileSync(path.join(__dirname, '027_seed_staff.sql'), finalSql);
console.log('Done!');
