const pool = require('./src/config/db');

async function seedAllenEnquiries() {
    console.log('🌱 Starting Seeding of Enquiries and Enquiry Follow-ups for Allen Career Institute (Tenant ID: 2)...');

    const tenantId = 2; // Allen Career Institute

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Clean existing enquiries and child tables for tenant 2 (if any)
        console.log('🧹 Cleaning existing enquiries and follow-ups for tenant_id = 2...');
        await connection.query('DELETE FROM enquiry_followups WHERE tenant_id = ?', [tenantId]);
        await connection.query('DELETE FROM enquiries WHERE tenant_id = ?', [tenantId]);

        // 2. Define 18 realistic enquiries
        const enquiriesData = [
            {
                preferred_branch_id: 1,
                assigned_branch_id: 1,
                source: 0, // Walk-in
                student_name: 'Aarav Sharma',
                student_mobile: '9820123401',
                student_email: 'aarav.sharma@gmail.com',
                parent_name: 'Rajesh Sharma',
                parent_mobile: '9820123402',
                parent_email: 'rajesh.sharma@gmail.com',
                interested_course_id: 1, // JEE Prep Course
                interested_program_id: 1, // 2 Year
                package_type: 1, // Program Wise
                package_details: JSON.stringify({ program_id: 1 }),
                interested_academic_year_id: 2, // 2026-27 (Mumbai West)
                interested_level_id: 1, // Class XI
                counsellor_id: 601, // Priya Kulkarni
                status: 4, // Interested
                lost_reason: null,
                demo_scheduled_at: null,
                next_followup_at: '2026-09-20 11:00:00',
                admission_confirmed_at: null,
                converted_student_id: null,
                converted_at: null,
                actual_price: 150000.00,
                concession_amount: 10000.00,
                final_price: 140000.00,
                down_payment: 30000.00,
                installment_months: 10,
                counselling_notes: 'Student scored 94% in 10th ICSE board. Interested in JEE Advanced 2-Year Classroom Batch with morning schedule.',
                remarks: 'Father visited branch office personally.',
                created_by: 601,
                updated_by: 601,
                created_at: '2026-09-10 10:30:00'
            },
            {
                preferred_branch_id: 1,
                assigned_branch_id: 1,
                source: 2, // Website
                student_name: 'Ishita Patel',
                student_mobile: '9820123403',
                student_email: 'ishita.patel@gmail.com',
                parent_name: 'Bhavesh Patel',
                parent_mobile: '9820123404',
                parent_email: 'bhavesh.patel@gmail.com',
                interested_course_id: 2, // NEET Batch Premium
                interested_program_id: 4, // 1 Year
                package_type: 2, // Bundle Wise
                package_details: JSON.stringify({ bundle_id: 21 }), // PCB Bundle
                interested_academic_year_id: 2, // 2026-27 (Mumbai West)
                interested_level_id: 4, // Class XII
                counsellor_id: 603, // Sonal Gaikwad
                status: 5, // Demo Scheduled
                lost_reason: null,
                demo_scheduled_at: '2026-09-21 10:00:00',
                next_followup_at: '2026-09-22 14:00:00',
                admission_confirmed_at: null,
                converted_student_id: null,
                converted_at: null,
                actual_price: 120000.00,
                concession_amount: 5000.00,
                final_price: 115000.00,
                down_payment: 25000.00,
                installment_months: 9,
                counselling_notes: 'Attending Class 12th in Mithibai College. Requested demo class for Biology & Chemistry before final registration.',
                remarks: 'Web lead generated via Landing Page Form.',
                created_by: 603,
                updated_by: 603,
                created_at: '2026-09-11 11:15:00'
            },
            {
                preferred_branch_id: 2,
                assigned_branch_id: 2,
                source: 5, // Referral
                student_name: 'Aditya Kulkarni',
                student_mobile: '9820123405',
                student_email: 'aditya.kulkarni@gmail.com',
                parent_name: 'Mandar Kulkarni',
                parent_mobile: '9820123406',
                parent_email: 'mandar.kulkarni@gmail.com',
                interested_course_id: 1, // JEE Prep Course
                interested_program_id: 2, // 1 Year (Dropper)
                package_type: 1, // Program Wise
                package_details: JSON.stringify({ program_id: 2 }),
                interested_academic_year_id: 5, // 2026-27 (Pune Camp)
                interested_level_id: 3, // Class XII (Dropper)
                counsellor_id: 603, // Sonal Gaikwad
                status: 6, // Fee Discussion
                lost_reason: null,
                demo_scheduled_at: null,
                next_followup_at: '2026-09-19 16:00:00',
                admission_confirmed_at: null,
                converted_student_id: null,
                converted_at: null,
                actual_price: 110000.00,
                concession_amount: 15000.00,
                final_price: 95000.00,
                down_payment: 25000.00,
                installment_months: 7,
                counselling_notes: 'Dropper candidate targeting 99+ percentile in JEE Jan session. Discussing 4 equal installment breakdown.',
                remarks: 'Referred by enrolled student Rohan Deshpande.',
                created_by: 603,
                updated_by: 603,
                created_at: '2026-09-12 14:00:00'
            },
            {
                preferred_branch_id: 2,
                assigned_branch_id: 2,
                source: 4, // WhatsApp
                student_name: 'Ananya Deshmukh',
                student_mobile: '9820123407',
                student_email: 'ananya.deshmukh@gmail.com',
                parent_name: 'Santosh Deshmukh',
                parent_mobile: '9820123408',
                parent_email: 'santosh.deshmukh@gmail.com',
                interested_course_id: 3, // Class 10 Foundation
                interested_program_id: 6, // 2 Year
                package_type: 2, // Bundle Wise
                package_details: JSON.stringify({ bundle_id: 31 }), // Foundation Core
                interested_academic_year_id: 5, // 2026-27 (Pune Camp)
                interested_level_id: 6, // Class VIII
                counsellor_id: 601, // Priya Kulkarni
                status: 3, // Follow-up
                lost_reason: null,
                demo_scheduled_at: null,
                next_followup_at: '2026-09-20 17:30:00',
                admission_confirmed_at: null,
                converted_student_id: null,
                converted_at: null,
                actual_price: 90000.00,
                concession_amount: 8000.00,
                final_price: 82000.00,
                down_payment: 20000.00,
                installment_months: 6,
                counselling_notes: 'Mother enquired about NTSE / Olympiad foundation coaching along with 9th & 10th school syllabus.',
                remarks: 'WhatsApp inquiry initiated via website chatbot.',
                created_by: 601,
                updated_by: 601,
                created_at: '2026-09-12 16:30:00'
            },
            {
                preferred_branch_id: 1,
                assigned_branch_id: 1,
                source: 1, // Phone Call
                student_name: 'Rohan Mehta',
                student_mobile: '9820123409',
                student_email: 'rohan.mehta@gmail.com',
                parent_name: 'Kirit Mehta',
                parent_mobile: '9820123410',
                parent_email: 'kirit.mehta@gmail.com',
                interested_course_id: 4, // 8th Standard
                interested_program_id: 8, // 8th std ICSE
                package_type: 2, // Bundle Wise
                package_details: JSON.stringify({ bundle_id: 33 }), // Foundation Core
                interested_academic_year_id: 2, // 2026-27 (Mumbai West)
                interested_level_id: 8, // Class VIII
                counsellor_id: 601, // Priya Kulkarni
                status: 2, // Contacted
                lost_reason: null,
                demo_scheduled_at: null,
                next_followup_at: '2026-09-23 15:00:00',
                admission_confirmed_at: null,
                converted_student_id: null,
                converted_at: null,
                actual_price: 30000.00,
                concession_amount: 2000.00,
                final_price: 28000.00,
                down_payment: 5000.00,
                installment_months: 6,
                counselling_notes: 'ICSE student from Jamnabai Narsee School. Needs special coaching in Mathematics & Physics.',
                remarks: 'Inbound phone enquiry transferred to counsellor.',
                created_by: 601,
                updated_by: 601,
                created_at: '2026-09-13 09:45:00'
            },
            {
                preferred_branch_id: 1,
                assigned_branch_id: 1,
                source: 7, // Google Ads
                student_name: 'Tanvi Joshi',
                student_mobile: '9820123411',
                student_email: 'tanvi.joshi@gmail.com',
                parent_name: 'Hemant Joshi',
                parent_mobile: '9820123412',
                parent_email: 'hemant.joshi@gmail.com',
                interested_course_id: 4, // 8th Standard
                interested_program_id: 9, // 8th std CBSE
                package_type: 2, // Bundle Wise
                package_details: JSON.stringify({ bundle_id: 11 }), // All Subjects
                interested_academic_year_id: 2, // 2026-27 (Mumbai West)
                interested_level_id: 9, // Class VIII
                counsellor_id: 603, // Sonal Gaikwad
                status: 1, // Assigned
                lost_reason: null,
                demo_scheduled_at: null,
                next_followup_at: '2026-09-18 11:30:00',
                admission_confirmed_at: null,
                converted_student_id: null,
                converted_at: null,
                actual_price: 28000.00,
                concession_amount: 0.00,
                final_price: 28000.00,
                down_payment: 5000.00,
                installment_months: 6,
                counselling_notes: 'Newly assigned lead from Google Search ad campaign.',
                remarks: 'Lead captured via Google Ads Form.',
                created_by: 603,
                updated_by: 603,
                created_at: '2026-09-13 15:20:00'
            },
            {
                preferred_branch_id: 2,
                assigned_branch_id: 2,
                source: 6, // Campaign/Event
                student_name: 'Gautam Kumar',
                student_mobile: '9831291375',
                student_email: 'gautam.kumar148@gmail.com',
                parent_name: 'Farhan Kumar',
                parent_mobile: '9724302840',
                parent_email: 'parent.9724302840@vidyasetu.com',
                interested_course_id: 2, // NEET Batch Premium
                interested_program_id: 5, // Repeater
                package_type: 1, // Program Wise
                package_details: JSON.stringify({ program_id: 5 }),
                interested_academic_year_id: 5, // 2026-27 (Pune Camp)
                interested_level_id: 5, // Repeater Batch
                counsellor_id: 601, // Priya Kulkarni
                status: 7, // Converted
                lost_reason: null,
                demo_scheduled_at: null,
                next_followup_at: null,
                admission_confirmed_at: '2026-09-15 12:30:00',
                converted_student_id: 5, // Maps to Gautam Kumar (students.id = 5)
                converted_at: '2026-09-15 12:30:00',
                actual_price: 100000.00,
                concession_amount: 10000.00,
                final_price: 90000.00,
                down_payment: 20000.00,
                installment_months: 8,
                counselling_notes: 'Qualified for merit scholarship based on TALLENTEX 2026 score. Admission completed successfully.',
                remarks: 'Attended Allen Open Seminar at Pune Convention Centre.',
                created_by: 601,
                updated_by: 601,
                created_at: '2026-09-08 11:00:00'
            },
            {
                preferred_branch_id: 1,
                assigned_branch_id: 1,
                source: 3, // Social Media
                student_name: 'Meera Iyer',
                student_mobile: '9820123415',
                student_email: 'meera.iyer@gmail.com',
                parent_name: 'Subramanian Iyer',
                parent_mobile: '9820123416',
                parent_email: 'subramanian.iyer@gmail.com',
                interested_course_id: 1, // JEE Prep Course
                interested_program_id: 1, // 2 Year
                package_type: 2, // Bundle Wise
                package_details: JSON.stringify({ bundle_id: 18 }), // PCM Bundle
                interested_academic_year_id: 2, // 2026-27 (Mumbai West)
                interested_level_id: 1, // Class XI
                counsellor_id: null,
                status: 0, // New Enquiry
                lost_reason: null,
                demo_scheduled_at: null,
                next_followup_at: null,
                admission_confirmed_at: null,
                converted_student_id: null,
                converted_at: null,
                actual_price: 150000.00,
                concession_amount: 0.00,
                final_price: 150000.00,
                down_payment: 30000.00,
                installment_months: 12,
                counselling_notes: null,
                remarks: 'Instagram Ad enquiry for Class 11 JEE 2028 batch.',
                created_by: 2,
                updated_by: 2,
                created_at: '2026-09-17 08:30:00'
            },
            {
                preferred_branch_id: 2,
                assigned_branch_id: 2,
                source: 0, // Walk-in
                student_name: 'Kabir Bansal',
                student_mobile: '9820123417',
                student_email: 'kabir.bansal@gmail.com',
                parent_name: 'Vivek Bansal',
                parent_mobile: '9820123418',
                parent_email: 'vivek.bansal@gmail.com',
                interested_course_id: 1, // JEE Prep Course
                interested_program_id: 1, // 2 Year
                package_type: 1, // Program Wise
                package_details: JSON.stringify({ program_id: 1 }),
                interested_academic_year_id: 5, // 2026-27 (Pune Camp)
                interested_level_id: 1, // Class XI
                counsellor_id: 603, // Sonal Gaikwad
                status: -1, // Not Interested / Lost
                lost_reason: 'Opted for local coaching centre closer to residential society due to commute time.',
                demo_scheduled_at: null,
                next_followup_at: null,
                admission_confirmed_at: null,
                converted_student_id: null,
                converted_at: null,
                actual_price: 150000.00,
                concession_amount: 0.00,
                final_price: 150000.00,
                down_payment: 30000.00,
                installment_months: 12,
                counselling_notes: 'Parent preferred an institute within 2km radius. Offered transport support but parent declined.',
                remarks: 'Closed as lost lead after 3 follow-ups.',
                created_by: 603,
                updated_by: 603,
                created_at: '2026-09-09 14:20:00'
            },
            {
                preferred_branch_id: 1,
                assigned_branch_id: 1,
                source: 4, // WhatsApp
                student_name: 'Diya Verma',
                student_mobile: '9820123419',
                student_email: 'diya.verma@gmail.com',
                parent_name: 'Rajesh Verma',
                parent_mobile: '9820123420',
                parent_email: 'rajesh.verma@gmail.com',
                interested_course_id: 2, // NEET Batch Premium
                interested_program_id: 4, // 1 Year
                package_type: 2, // Bundle Wise
                package_details: JSON.stringify({ bundle_id: 21 }), // PCB Bundle
                interested_academic_year_id: 2, // 2026-27 (Mumbai West)
                interested_level_id: 4, // Class XII
                counsellor_id: 601, // Priya Kulkarni
                status: 4, // Interested
                lost_reason: null,
                demo_scheduled_at: null,
                next_followup_at: '2026-09-21 16:30:00',
                admission_confirmed_at: null,
                converted_student_id: null,
                converted_at: null,
                actual_price: 120000.00,
                concession_amount: 12000.00,
                final_price: 108000.00,
                down_payment: 25000.00,
                installment_months: 10,
                counselling_notes: 'Strong interest in NEET classroom batch + national test series package. Requested weekend batch schedule.',
                remarks: 'Followed up via WhatsApp audio consultation.',
                created_by: 601,
                updated_by: 601,
                created_at: '2026-09-14 11:00:00'
            },
            {
                preferred_branch_id: 2,
                assigned_branch_id: 2,
                source: 5, // Referral
                student_name: 'Pranav Nair',
                student_mobile: '9820123421',
                student_email: 'pranav.nair@gmail.com',
                parent_name: 'Unnikrishnan Nair',
                parent_mobile: '9820123422',
                parent_email: 'unnikrishnan.nair@gmail.com',
                interested_course_id: 3, // Class 10 Foundation
                interested_program_id: 6, // 2 Year
                package_type: 2, // Bundle Wise
                package_details: JSON.stringify({ bundle_id: 32 }), // Foundation Core
                interested_academic_year_id: 5, // 2026-27 (Pune Camp)
                interested_level_id: 7, // Class IX
                counsellor_id: 601, // Priya Kulkarni
                status: 5, // Demo Scheduled
                lost_reason: null,
                demo_scheduled_at: '2026-09-22 16:00:00',
                next_followup_at: '2026-09-23 11:00:00',
                admission_confirmed_at: null,
                converted_student_id: null,
                converted_at: null,
                actual_price: 90000.00,
                concession_amount: 5000.00,
                final_price: 85000.00,
                down_payment: 20000.00,
                installment_months: 10,
                counselling_notes: 'Student currently in Class 9, looking for early JEE foundation preparation.',
                remarks: 'Demo session scheduled for Saturday 4 PM at Pune Camp branch.',
                created_by: 601,
                updated_by: 601,
                created_at: '2026-09-14 15:30:00'
            },
            {
                preferred_branch_id: 1,
                assigned_branch_id: 1,
                source: 2, // Website
                student_name: 'Gauri Shinde',
                student_mobile: '9820123423',
                student_email: 'gauri.shinde@gmail.com',
                parent_name: 'Vijay Shinde',
                parent_mobile: '9820123424',
                parent_email: 'vijay.shinde@gmail.com',
                interested_course_id: 4, // 8th Standard
                interested_program_id: 8, // 8th std ICSE
                package_type: 2, // Bundle Wise
                package_details: JSON.stringify({ bundle_id: 41 }), // Computer Science
                interested_academic_year_id: 2, // 2026-27 (Mumbai West)
                interested_level_id: 8, // Class VIII
                counsellor_id: 603, // Sonal Gaikwad
                status: 6, // Fee Discussion
                lost_reason: null,
                demo_scheduled_at: null,
                next_followup_at: '2026-09-19 12:00:00',
                admission_confirmed_at: null,
                converted_student_id: null,
                converted_at: null,
                actual_price: 30000.00,
                concession_amount: 3000.00,
                final_price: 27000.00,
                down_payment: 5000.00,
                installment_months: 4,
                counselling_notes: 'Selected Computer Science and Science bundles. Parent discussing split into 3 monthly installments.',
                remarks: 'Finalizing admission registration formalities.',
                created_by: 603,
                updated_by: 603,
                created_at: '2026-09-15 10:15:00'
            },
            {
                preferred_branch_id: 1,
                assigned_branch_id: 1,
                source: 0, // Walk-in
                student_name: 'Dhruv More',
                student_mobile: '9859598278',
                student_email: 'dhruv.more155@gmail.com',
                parent_name: 'Utkarsh More',
                parent_mobile: '9717374627',
                parent_email: 'parent.9717374627@vidyasetu.com',
                interested_course_id: 1, // JEE Prep Course
                interested_program_id: 2, // 1 Year (Dropper)
                package_type: 1, // Program Wise
                package_details: JSON.stringify({ program_id: 2 }),
                interested_academic_year_id: 2, // 2026-27 (Mumbai West)
                interested_level_id: 3, // Class XII (Dropper)
                counsellor_id: 601, // Priya Kulkarni
                status: 7, // Converted
                lost_reason: null,
                demo_scheduled_at: null,
                next_followup_at: null,
                admission_confirmed_at: '2026-09-16 11:15:00',
                converted_student_id: 6, // Maps to Dhruv More (students.id = 6)
                converted_at: '2026-09-16 11:15:00',
                actual_price: 110000.00,
                concession_amount: 10000.00,
                final_price: 100000.00,
                down_payment: 25000.00,
                installment_months: 10,
                counselling_notes: 'Full registration and batch allocation completed for JEE Dropper batch.',
                remarks: 'Converted directly from walk-in consultation.',
                created_by: 601,
                updated_by: 601,
                created_at: '2026-09-10 16:00:00'
            },
            {
                preferred_branch_id: 2,
                assigned_branch_id: 2,
                source: 1, // Phone Call
                student_name: 'Kavita Reddy',
                student_mobile: '9820123427',
                student_email: 'kavita.reddy@gmail.com',
                parent_name: 'Venkat Reddy',
                parent_mobile: '9820123428',
                parent_email: 'venkat.reddy@gmail.com',
                interested_course_id: 2, // NEET Batch Premium
                interested_program_id: 4, // 1 Year
                package_type: 2, // Bundle Wise
                package_details: JSON.stringify({ bundle_id: 21 }), // PCB Bundle
                interested_academic_year_id: 5, // 2026-27 (Pune Camp)
                interested_level_id: 4, // Class XII
                counsellor_id: 603, // Sonal Gaikwad
                status: 2, // Contacted
                lost_reason: null,
                demo_scheduled_at: null,
                next_followup_at: '2026-09-22 17:00:00',
                admission_confirmed_at: null,
                converted_student_id: null,
                converted_at: null,
                actual_price: 120000.00,
                concession_amount: 0.00,
                final_price: 120000.00,
                down_payment: 25000.00,
                installment_months: 10,
                counselling_notes: 'Called for NEET biology batch schedule and faculty profile details.',
                remarks: 'Course brochure and fee structure emailed to parent.',
                created_by: 603,
                updated_by: 603,
                created_at: '2026-09-15 14:40:00'
            },
            {
                preferred_branch_id: 2,
                assigned_branch_id: 2,
                source: 8, // Other
                student_name: 'Yash Gaikwad',
                student_mobile: '9820123429',
                student_email: 'yash.gaikwad@gmail.com',
                parent_name: 'Prakash Gaikwad',
                parent_mobile: '9820123430',
                parent_email: 'prakash.gaikwad@gmail.com',
                interested_course_id: 4, // 8th Standard
                interested_program_id: 9, // 8th std CBSE
                package_type: 2, // Bundle Wise
                package_details: JSON.stringify({ bundle_id: 34 }), // Foundation Core
                interested_academic_year_id: 5, // 2026-27 (Pune Camp)
                interested_level_id: 9, // Class VIII
                counsellor_id: 601, // Priya Kulkarni
                status: 3, // Follow-up
                lost_reason: null,
                demo_scheduled_at: null,
                next_followup_at: '2026-09-21 15:00:00',
                admission_confirmed_at: null,
                converted_student_id: null,
                converted_at: null,
                actual_price: 28000.00,
                concession_amount: 2500.00,
                final_price: 25500.00,
                down_payment: 5000.00,
                installment_months: 6,
                counselling_notes: 'CBSE 8th standard student. Interested in English, Maths and Science batch.',
                remarks: 'Sibling studies in 10th foundation batch.',
                created_by: 601,
                updated_by: 601,
                created_at: '2026-09-15 16:30:00'
            },
            {
                preferred_branch_id: 1,
                assigned_branch_id: 1,
                source: 3, // Social Media
                student_name: 'Nikhil Sengupta',
                student_mobile: '9820123431',
                student_email: 'nikhil.sengupta@gmail.com',
                parent_name: 'Soumitra Sengupta',
                parent_mobile: '9820123432',
                parent_email: 'soumitra.sengupta@gmail.com',
                interested_course_id: 1, // JEE Prep Course
                interested_program_id: 1, // 2 Year
                package_type: 1, // Program Wise
                package_details: JSON.stringify({ program_id: 1 }),
                interested_academic_year_id: 2, // 2026-27 (Mumbai West)
                interested_level_id: 1, // Class XI
                counsellor_id: 603, // Sonal Gaikwad
                status: 1, // Assigned
                lost_reason: null,
                demo_scheduled_at: null,
                next_followup_at: '2026-09-18 17:00:00',
                admission_confirmed_at: null,
                converted_student_id: null,
                converted_at: null,
                actual_price: 150000.00,
                concession_amount: 0.00,
                final_price: 150000.00,
                down_payment: 30000.00,
                installment_months: 12,
                counselling_notes: 'Lead assigned for initial tele-counselling call.',
                remarks: 'Lead generated from Facebook Ad campaign.',
                created_by: 603,
                updated_by: 603,
                created_at: '2026-09-16 10:00:00'
            },
            {
                preferred_branch_id: 2,
                assigned_branch_id: 2,
                source: 7, // Google Ads
                student_name: 'Shreya Bhatia',
                student_mobile: '9820123433',
                student_email: 'shreya.bhatia@gmail.com',
                parent_name: 'Naresh Bhatia',
                parent_mobile: '9820123434',
                parent_email: 'naresh.bhatia@gmail.com',
                interested_course_id: 2, // NEET Batch Premium
                interested_program_id: 4, // 1 Year
                package_type: 2, // Bundle Wise
                package_details: JSON.stringify({ bundle_id: 21 }), // PCB Bundle
                interested_academic_year_id: 5, // 2026-27 (Pune Camp)
                interested_level_id: 4, // Class XII
                counsellor_id: 601, // Priya Kulkarni
                status: 4, // Interested
                lost_reason: null,
                demo_scheduled_at: null,
                next_followup_at: '2026-09-20 18:00:00',
                admission_confirmed_at: null,
                converted_student_id: null,
                converted_at: null,
                actual_price: 120000.00,
                concession_amount: 6000.00,
                final_price: 114000.00,
                down_payment: 25000.00,
                installment_months: 8,
                counselling_notes: 'Student aiming for AIIMS. Highly impressed by Allen NEET past ranks.',
                remarks: 'Requested counseling meeting with senior faculty.',
                created_by: 601,
                updated_by: 601,
                created_at: '2026-09-16 11:30:00'
            },
            {
                preferred_branch_id: 1,
                assigned_branch_id: 1,
                source: 0, // Walk-in
                student_name: 'Aakash Tiwari',
                student_mobile: '9820123435',
                student_email: 'aakash.tiwari@gmail.com',
                parent_name: 'Jagdish Tiwari',
                parent_mobile: '9820123436',
                parent_email: 'jagdish.tiwari@gmail.com',
                interested_course_id: 3, // Class 10 Foundation
                interested_program_id: 6, // 2 Year
                package_type: 2, // Bundle Wise
                package_details: JSON.stringify({ bundle_id: 24 }), // Science & Maths
                interested_academic_year_id: 2, // 2026-27 (Mumbai West)
                interested_level_id: 6, // Class VIII
                counsellor_id: null,
                status: 0, // New Enquiry
                lost_reason: null,
                demo_scheduled_at: null,
                next_followup_at: null,
                admission_confirmed_at: null,
                converted_student_id: null,
                converted_at: null,
                actual_price: 90000.00,
                concession_amount: 0.00,
                final_price: 90000.00,
                down_payment: 20000.00,
                installment_months: 12,
                counselling_notes: null,
                remarks: 'Fresh walk-in today at Mumbai West centre for Foundation 2-Year program.',
                created_by: 2,
                updated_by: 2,
                created_at: '2026-09-17 11:00:00'
            }
        ];

        const insertedEnquiryIds = [];

        for (const enq of enquiriesData) {
            const [res] = await connection.query(`
                INSERT INTO enquiries (
                    tenant_id, preferred_branch_id, assigned_branch_id, source,
                    student_name, student_mobile, student_email,
                    parent_name, parent_mobile, parent_email,
                    interested_course_id, interested_program_id, package_type, package_details,
                    interested_academic_year_id, interested_level_id,
                    counsellor_id, status, lost_reason, demo_scheduled_at, next_followup_at,
                    admission_confirmed_at, converted_student_id, converted_at, remarks,
                    actual_price, concession_amount, final_price, down_payment, installment_months,
                    counselling_notes, created_by, updated_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                tenantId,
                enq.preferred_branch_id,
                enq.assigned_branch_id,
                enq.source,
                enq.student_name,
                enq.student_mobile,
                enq.student_email,
                enq.parent_name,
                enq.parent_mobile,
                enq.parent_email,
                enq.interested_course_id,
                enq.interested_program_id,
                enq.package_type,
                enq.package_details,
                enq.interested_academic_year_id,
                enq.interested_level_id,
                enq.counsellor_id,
                enq.status,
                enq.lost_reason,
                enq.demo_scheduled_at,
                enq.next_followup_at,
                enq.admission_confirmed_at,
                enq.converted_student_id,
                enq.converted_at,
                enq.remarks,
                enq.actual_price,
                enq.concession_amount,
                enq.final_price,
                enq.down_payment,
                enq.installment_months,
                enq.counselling_notes,
                enq.created_by,
                enq.updated_by,
                enq.created_at,
                enq.created_at
            ]);

            const enquiryId = res.insertId;
            insertedEnquiryIds.push({ id: enquiryId, ...enq });
            console.log(`  ➕ Inserted Enquiry ID ${enquiryId} for "${enq.student_name}" (Status: ${enq.status})`);
        }

        console.log(`\n✅ Successfully seeded ${insertedEnquiryIds.length} enquiries!`);

        // 3. Define 20 realistic follow-up records linked to the seeded enquiries
        console.log('\n🌱 Seeding Follow-ups into enquiry_followups table...');

        const followupsData = [
            {
                enquiry_index: 0, // Aarav Sharma
                notes: 'Conducted detailed 20-minute counseling call with parent. Explained JEE Advanced syllabus roadmap and batch timings.',
                next_followup_date: '2026-09-14 11:00:00',
                created_by: 601,
                created_at: '2026-09-11 11:00:00'
            },
            {
                enquiry_index: 0, // Aarav Sharma
                notes: 'Followed up after sending fee breakdown and scholarship criteria. Parent confirmed high interest for Class XI morning batch.',
                next_followup_date: '2026-09-20 11:00:00',
                created_by: 601,
                created_at: '2026-09-14 11:30:00'
            },
            {
                enquiry_index: 1, // Ishita Patel
                notes: 'Connected with student regarding NEET 1-Year curriculum. Student requested demo class for Organic Chemistry.',
                next_followup_date: '2026-09-16 14:00:00',
                created_by: 603,
                created_at: '2026-09-12 12:00:00'
            },
            {
                enquiry_index: 1, // Ishita Patel
                notes: 'Confirmed demo class slot with faculty for Monday 10:00 AM. Sent entry pass and lecture link to student email.',
                next_followup_date: '2026-09-22 14:00:00',
                created_by: 603,
                created_at: '2026-09-16 15:00:00'
            },
            {
                enquiry_index: 2, // Aditya Kulkarni
                notes: 'Telephonic counseling regarding Dropper batch study material, test series frequency, and doubt clearance sessions.',
                next_followup_date: '2026-09-15 16:00:00',
                created_by: 603,
                created_at: '2026-09-13 14:30:00'
            },
            {
                enquiry_index: 2, // Aditya Kulkarni
                notes: 'Parent negotiated on concession. Agreed upon special 15,000 INR scholarship based on past JEE Mains score. Awaiting final payment.',
                next_followup_date: '2026-09-19 16:00:00',
                created_by: 603,
                created_at: '2026-09-16 16:30:00'
            },
            {
                enquiry_index: 3, // Ananya Deshmukh
                notes: 'WhatsApp consultation with mother. Explained Foundation 2-Year program covering Olympiads and ICSE/CBSE school syllabus.',
                next_followup_date: '2026-09-16 17:30:00',
                created_by: 601,
                created_at: '2026-09-13 17:00:00'
            },
            {
                enquiry_index: 3, // Ananya Deshmukh
                notes: 'Sent sample study modules on WhatsApp. Parent requested follow-up over weekend after discussing with father.',
                next_followup_date: '2026-09-20 17:30:00',
                created_by: 601,
                created_at: '2026-09-16 18:00:00'
            },
            {
                enquiry_index: 4, // Rohan Mehta
                notes: 'Outbound call made to parent Mr. Kirit Mehta. Discussed 8th standard ICSE timetable and weekday batch timings.',
                next_followup_date: '2026-09-23 15:00:00',
                created_by: 601,
                created_at: '2026-09-14 10:15:00'
            },
            {
                enquiry_index: 5, // Tanvi Joshi
                notes: 'First contact call placed. Parent was in a meeting; requested callback on Friday morning.',
                next_followup_date: '2026-09-18 11:30:00',
                created_by: 603,
                created_at: '2026-09-14 16:00:00'
            },
            {
                enquiry_index: 6, // Siddharth Roy
                notes: 'Met parent at TALLENTEX seminar desk. Detailed discussion regarding NEET repeater batch focus modules.',
                next_followup_date: '2026-09-12 11:00:00',
                created_by: 601,
                created_at: '2026-09-09 11:30:00'
            },
            {
                enquiry_index: 6, // Siddharth Roy
                notes: 'Parent visited Pune Camp centre. Verified marksheets, applied merit discount, and finalized enrollment.',
                next_followup_date: null,
                created_by: 601,
                created_at: '2026-09-15 12:00:00'
            },
            {
                enquiry_index: 8, // Kabir Bansal
                notes: 'First round counselling call. Parent enquired about batch bus route from Kothrud area.',
                next_followup_date: '2026-09-11 15:00:00',
                created_by: 603,
                created_at: '2026-09-10 14:30:00'
            },
            {
                enquiry_index: 8, // Kabir Bansal
                notes: 'Second follow-up. Parent mentioned that 45 mins travel time is too much for daily classes and they prefer a local tuition.',
                next_followup_date: '2026-09-14 16:00:00',
                created_by: 603,
                created_at: '2026-09-12 11:00:00'
            },
            {
                enquiry_index: 8, // Kabir Bansal
                notes: 'Final call. Parent confirmed admission in nearby local coaching institute. Marked enquiry as lost.',
                next_followup_date: null,
                created_by: 603,
                created_at: '2026-09-14 16:45:00'
            },
            {
                enquiry_index: 9, // Diya Verma
                notes: 'In-depth discussion on WhatsApp voice call. Explained physics faculty credentials and regular mock test analytics portal.',
                next_followup_date: '2026-09-21 16:30:00',
                created_by: 601,
                created_at: '2026-09-15 12:00:00'
            },
            {
                enquiry_index: 10, // Pranav Nair
                notes: 'Discussed foundation batch syllabus. Scheduled offline demo lecture for student on Saturday afternoon at Pune Camp.',
                next_followup_date: '2026-09-23 11:00:00',
                created_by: 601,
                created_at: '2026-09-15 16:00:00'
            },
            {
                enquiry_index: 11, // Gauri Shinde
                notes: 'Parent discussed ICSE subject options. Decided on Computer Science + Foundation Core bundles. Finalizing installment schedule.',
                next_followup_date: '2026-09-19 12:00:00',
                created_by: 603,
                created_at: '2026-09-16 11:00:00'
            },
            {
                enquiry_index: 13, // Kavita Reddy
                notes: 'Introduced NEET batch highlights and previous year AIIMS selections. Emailed complete prospectus and admission form.',
                next_followup_date: '2026-09-22 17:00:00',
                created_by: 603,
                created_at: '2026-09-16 15:30:00'
            },
            {
                enquiry_index: 14, // Yash Gaikwad
                notes: 'Followed up with parent. Sibling is already enrolled in 10th foundation. Offered existing student sibling concession.',
                next_followup_date: '2026-09-21 15:00:00',
                created_by: 601,
                created_at: '2026-09-16 17:00:00'
            }
        ];

        for (const fu of followupsData) {
            const targetEnquiry = insertedEnquiryIds[fu.enquiry_index];
            const [fuRes] = await connection.query(`
                INSERT INTO enquiry_followups (
                    tenant_id, enquiry_id, notes, next_followup_date, created_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                tenantId,
                targetEnquiry.id,
                fu.notes,
                fu.next_followup_date,
                fu.created_by,
                fu.created_at
            ]);
            console.log(`  💬 Inserted Follow-up ID ${fuRes.insertId} for Enquiry ID ${targetEnquiry.id} (${targetEnquiry.student_name})`);
        }

        console.log(`\n✅ Successfully seeded ${followupsData.length} enquiry follow-ups!`);

        await connection.commit();
        connection.release();

        console.log('\n🎉 ALL ENQUIRIES AND FOLLOW-UPS DATA SEEDED SUCCESSFULLY FOR ALLEN CAREER INSTITUTE!');
        process.exit(0);

    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('❌ Error during seeding:', error);
        process.exit(1);
    }
}

seedAllenEnquiries();
