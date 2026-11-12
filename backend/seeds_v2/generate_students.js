const path = require('path');
require('../backend/node_modules/dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = require('../backend/src/config/db');
const bcrypt = require('../backend/node_modules/bcryptjs');
const fs = require('fs');

const firstNamesMale = [
    'Aarav', 'Vihaan', 'Aditya', 'Sai', 'Reyansh', 'Muhammad', 'Arjun', 'Kabir', 'Rudra', 'Ayan',
    'Ishaan', 'Shaurya', 'Atharva', 'Advik', 'Pranav', 'Dev', 'Dhruv', 'Kush', 'Luv', 'Samarth',
    'Shivansh', 'Siddharth', 'Tanmay', 'Utkarsh', 'Yash', 'Zayan', 'Ahaan', 'Bhavin', 'Chaitanya', 'Darsh',
    'Eshaan', 'Farhan', 'Gautam', 'Hrithik', 'Imran', 'Jai', 'Ketan', 'Lakshya', 'Manan', 'Nakul'
];

const firstNamesFemale = [
    'Aadhya', 'Ananya', 'Pari', 'Anika', 'Diya', 'Avani', 'Myra', 'Ira', 'Riya', 'Aarohi',
    'Siya', 'Kavya', 'Ahana', 'Nisha', 'Tanvi', 'Vanya', 'Prisha', 'Saumya', 'Navya', 'Isha',
    'Sneha', 'Anushka', 'Tara', 'Jiya', 'Shreya', 'Meera', 'Riddhi', 'Siddhi', 'Bhavya', 'Charvi',
    'Drishti', 'Ekta', 'Falguni', 'Gauri', 'Hansi', 'Ishita', 'Juhi', 'Khushi', 'Leela', 'Mahi'
];

const lastNames = [
    'Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Joshi', 'Desai', 'Shah', 'Mehta',
    'Bhatia', 'Chauhan', 'Tiwari', 'Pandey', 'Yadav', 'Mishra', 'Reddy', 'Rao', 'Nair', 'Pillai',
    'Iyer', 'Menon', 'Das', 'Roy', 'Sen', 'Deshmukh', 'Kulkarni', 'Patil', 'Pawar', 'Shinde',
    'Jadhav', 'Kadam', 'Chavan', 'Gayakwad', 'Mane', 'More', 'Salunkhe', 'Bhosale', 'Sawant', 'Gore'
];

const cities = ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Aurangabad', 'Solapur', 'Kolhapur', 'Amravati', 'Nanded'];
const schools = [
    'St. Xavier\'s High School', 'Delhi Public School', 'Podar International School',
    'Kendriya Vidyalaya', 'Ryan International School', 'Orchid International School',
    'DAV Public School', 'Loyola High School', 'Singhania School', 'Hutchings High School'
];

const targetExams = ['JEE Main', 'JEE Advanced', 'NEET UG', 'MHT-CET', 'School Boards', 'Foundation NTSE'];
const categories = ['General', 'OBC', 'SC', 'ST', 'EWS'];
const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

const seedStudents = async () => {
    try {
        console.log('Fetching active batches...');
        const [batches] = await pool.query(`
            SELECT id, tenant_id, branch_id, level_id, name, code, academic_year_id 
            FROM batches 
            WHERE status = 'active' AND deleted_at IS NULL
        `);

        console.log(`Found ${batches.length} active batches.`);

        const passwordHashStudent = await bcrypt.hash('student123', 10);
        const passwordHashParent = await bcrypt.hash('parent123', 10);

        let totalStudentsSeeded = 0;
        const sqlStatements = [];

        for (const batch of batches) {
            // Check existing active count for this batch
            const [existingCountRows] = await pool.query(`
                SELECT COUNT(*) as count 
                FROM student_enrollments 
                WHERE batch_id = ? AND tenant_id = ? AND status = 'active' AND deleted_at IS NULL
            `, [batch.id, batch.tenant_id]);

            const currentCount = existingCountRows[0].count;
            const targetCount = 10;
            const needed = Math.max(0, targetCount - currentCount);

            console.log(`Batch [ID ${batch.id}] "${batch.name}" has ${currentCount} students. Generating ${needed} new students...`);

            for (let i = 0; i < needed; i++) {
                const isMale = Math.random() > 0.5;
                const fn = isMale
                    ? firstNamesMale[Math.floor(Math.random() * firstNamesMale.length)]
                    : firstNamesFemale[Math.floor(Math.random() * firstNamesFemale.length)];
                const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
                const fullName = `${fn} ${ln}`;
                const gender = isMale ? 'Male' : 'Female';

                const birthYear = 2007 + Math.floor(Math.random() * 4); // 2007 - 2010
                const birthMonth = (1 + Math.floor(Math.random() * 12)).toString().padStart(2, '0');
                const birthDay = (1 + Math.floor(Math.random() * 28)).toString().padStart(2, '0');
                const dob = `${birthYear}-${birthMonth}-${birthDay}`;

                const mobile = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
                const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${Math.floor(100 + Math.random() * 900)}@gmail.com`;

                const city = cities[Math.floor(Math.random() * cities.length)];
                const school = schools[Math.floor(Math.random() * schools.length)];
                const category = categories[Math.floor(Math.random() * categories.length)];
                const targetExam = targetExams[Math.floor(Math.random() * targetExams.length)];
                const bg = bloodGroups[Math.floor(Math.random() * bloodGroups.length)];

                // Parent info
                const parentFn = isMale
                    ? firstNamesMale[Math.floor(Math.random() * firstNamesMale.length)]
                    : firstNamesMale[Math.floor(Math.random() * firstNamesMale.length)];
                const parentFullName = `Mr. ${parentFn} ${ln}`;
                const parentMobile = `97${Math.floor(10000000 + Math.random() * 90000000)}`;
                const parentEmail = `parent.${parentMobile}@vidyasetu.com`;

                // 1. Insert Student User Account
                const [studentUserRes] = await pool.query(`
                    INSERT INTO users (tenant_id, name, email, mobile, password_hash, user_type, status)
                    VALUES (?, ?, ?, ?, ?, 'student', 'active')
                `, [batch.tenant_id, fullName, email, mobile, passwordHashStudent]);

                const studentUserId = studentUserRes.insertId;

                // Assign Student Role (role_id = 8)
                await pool.query(`
                    INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by)
                    VALUES (?, 8, 1)
                `, [studentUserId]);

                // 2. Insert Student record
                const studentCode = `STU-${batch.tenant_id}-${batch.branch_id}-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;

                const [studentRes] = await pool.query(`
                    INSERT INTO students (
                        tenant_id, user_id, primary_branch_id, student_code, full_name, dob, gender, mobile, email,
                        street, city, state, pincode, category, school_name, current_class,
                        target_exam, year_of_attempt, blood_group, status, created_by, updated_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Maharashtra', '400001', ?, ?, 'Class 11', ?, '2028', ?, 'active', 1, 1)
                `, [
                    batch.tenant_id, studentUserId, batch.branch_id, studentCode, fullName, dob, gender, mobile, email,
                    'MG Road', city, category, school, targetExam, bg
                ]);

                const studentId = studentRes.insertId;

                // 3. Insert Parent User Account
                const [parentUserRes] = await pool.query(`
                    INSERT INTO users (tenant_id, name, email, mobile, password_hash, user_type, status)
                    VALUES (?, ?, ?, ?, ?, 'parent', 'active')
                `, [batch.tenant_id, parentFullName, parentEmail, parentMobile, passwordHashParent]);

                const parentUserId = parentUserRes.insertId;

                // Assign Parent Role (role_id = 7)
                await pool.query(`
                    INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by)
                    VALUES (?, 7, 1)
                `, [parentUserId]);

                // 4. Insert Guardian record
                const [guardianRes] = await pool.query(`
                    INSERT INTO guardians (tenant_id, user_id, full_name, relation, mobile, email, occupation, created_by, updated_by)
                    VALUES (?, ?, ?, 'Father', ?, ?, 'Business', 1, 1)
                `, [batch.tenant_id, parentUserId, parentFullName, parentMobile, parentEmail]);

                const guardianId = guardianRes.insertId;

                await pool.query(`
                    INSERT INTO student_guardians (tenant_id, student_id, guardian_id, is_primary)
                    VALUES (?, ?, ?, 1)
                `, [batch.tenant_id, studentId, guardianId]);

                // 5. Insert Enrollment
                await pool.query(`
                    INSERT INTO student_enrollments (tenant_id, branch_id, student_id, batch_id, academic_year_id, enrolled_date, status, created_by, updated_by)
                    VALUES (?, ?, ?, ?, ?, CURDATE(), 'active', 1, 1)
                `, [batch.tenant_id, batch.branch_id, studentId, batch.id, batch.academic_year_id]);

                totalStudentsSeeded++;
            }

            // Update batch strength
            const [finalCountRows] = await pool.query(`
                SELECT COUNT(*) as count 
                FROM student_enrollments 
                WHERE batch_id = ? AND tenant_id = ? AND status = 'active' AND deleted_at IS NULL
            `, [batch.id, batch.tenant_id]);

            const finalStrength = finalCountRows[0].count;

            await pool.query(`
                UPDATE batches SET current_strength = ? WHERE id = ? AND tenant_id = ?
            `, [finalStrength, batch.id, batch.tenant_id]);

            console.log(`Updated Batch [ID ${batch.id}] "${batch.name}" current_strength = ${finalStrength}.`);
        }

        console.log(`\n🎉 Successfully seeded ${totalStudentsSeeded} new students across ${batches.length} batches! Every batch now has at least 10 active students with user accounts and assigned roles.`);
        process.exit(0);

    } catch (error) {
        console.error('Error during student seeding:', error);
        process.exit(1);
    }
};

seedStudents();
