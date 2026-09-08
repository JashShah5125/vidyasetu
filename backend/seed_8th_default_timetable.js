const timetableModel = require('./src/models/timetableModel');
const pool = require('./src/config/db');

async function seed8thDefaultTimetables() {
    console.log('🌱 Seeding Default Timetable for all 8th Standard Batches...');

    const tenantId = 2; // Allen Career Institute

    const batchesToSeed = [
        // 1. Batch 18: 8th CBSE Morning (Branch 1, Room 2, 07:00 - 10:00)
        {
            batchId: 18,
            branchId: 1,
            academicYearId: 2,
            batchName: '8th CBSE Morning',
            slots: [
                // Day 1 (Monday)
                { day_of_week: 1, start_time: '07:00:00', end_time: '08:25:00', subject_id: 2, teacher_user_id: 202, classroom_id: 2, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 1, start_time: '08:35:00', end_time: '10:00:00', subject_id: 7, teacher_user_id: 207, classroom_id: 2, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' },
                // Day 2 (Tuesday)
                { day_of_week: 2, start_time: '07:00:00', end_time: '08:25:00', subject_id: 9, teacher_user_id: 205, classroom_id: 2, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 2, start_time: '08:35:00', end_time: '10:00:00', subject_id: 8, teacher_user_id: 208, classroom_id: 2, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' },
                // Day 3 (Wednesday)
                { day_of_week: 3, start_time: '07:00:00', end_time: '08:25:00', subject_id: 2, teacher_user_id: 202, classroom_id: 2, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 3, start_time: '08:35:00', end_time: '10:00:00', subject_id: 7, teacher_user_id: 207, classroom_id: 2, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' },
                // Day 4 (Thursday)
                { day_of_week: 4, start_time: '07:00:00', end_time: '08:25:00', subject_id: 10, teacher_user_id: 209, classroom_id: 2, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 4, start_time: '08:35:00', end_time: '10:00:00', subject_id: 11, teacher_user_id: 206, classroom_id: 2, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' },
                // Day 5 (Friday)
                { day_of_week: 5, start_time: '07:00:00', end_time: '08:25:00', subject_id: 2, teacher_user_id: 202, classroom_id: 2, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 5, start_time: '08:35:00', end_time: '10:00:00', subject_id: 7, teacher_user_id: 207, classroom_id: 2, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' },
                // Day 6 (Saturday)
                { day_of_week: 6, start_time: '07:00:00', end_time: '08:25:00', subject_id: 14, teacher_user_id: 204, classroom_id: 2, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 6, start_time: '08:35:00', end_time: '10:00:00', subject_id: 9, teacher_user_id: 205, classroom_id: 2, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' }
            ]
        },

        // 2. Batch 19: 8th CBSE 2025-26 (Branch 1, Room 2, 10:00 - 13:00)
        {
            batchId: 19,
            branchId: 1,
            academicYearId: 1,
            batchName: '8th CBSE 2025-26',
            slots: [
                // Day 1 (Monday)
                { day_of_week: 1, start_time: '10:00:00', end_time: '11:25:00', subject_id: 7, teacher_user_id: 207, classroom_id: 2, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 1, start_time: '11:35:00', end_time: '13:00:00', subject_id: 2, teacher_user_id: 202, classroom_id: 2, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' },
                // Day 2 (Tuesday)
                { day_of_week: 2, start_time: '10:00:00', end_time: '11:25:00', subject_id: 8, teacher_user_id: 208, classroom_id: 2, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 2, start_time: '11:35:00', end_time: '13:00:00', subject_id: 9, teacher_user_id: 205, classroom_id: 2, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' },
                // Day 3 (Wednesday)
                { day_of_week: 3, start_time: '10:00:00', end_time: '11:25:00', subject_id: 7, teacher_user_id: 207, classroom_id: 2, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 3, start_time: '11:35:00', end_time: '13:00:00', subject_id: 2, teacher_user_id: 202, classroom_id: 2, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' },
                // Day 4 (Thursday)
                { day_of_week: 4, start_time: '10:00:00', end_time: '11:25:00', subject_id: 11, teacher_user_id: 206, classroom_id: 2, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 4, start_time: '11:35:00', end_time: '13:00:00', subject_id: 10, teacher_user_id: 209, classroom_id: 2, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' },
                // Day 5 (Friday)
                { day_of_week: 5, start_time: '10:00:00', end_time: '11:25:00', subject_id: 7, teacher_user_id: 207, classroom_id: 2, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 5, start_time: '11:35:00', end_time: '13:00:00', subject_id: 2, teacher_user_id: 202, classroom_id: 2, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' },
                // Day 6 (Saturday)
                { day_of_week: 6, start_time: '10:00:00', end_time: '11:25:00', subject_id: 9, teacher_user_id: 205, classroom_id: 2, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 6, start_time: '11:35:00', end_time: '13:00:00', subject_id: 14, teacher_user_id: 204, classroom_id: 2, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' }
            ]
        },

        // 3. Batch 16: 8th ICSE Morning (Branch 1, Room 1, 07:00 - 10:00)
        {
            batchId: 16,
            branchId: 1,
            academicYearId: 2,
            batchName: '8th ICSE Morning',
            slots: [
                // Day 1 (Monday)
                { day_of_week: 1, start_time: '07:00:00', end_time: '08:25:00', subject_id: 7, teacher_user_id: 203, classroom_id: 1, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 1, start_time: '08:35:00', end_time: '10:00:00', subject_id: 2, teacher_user_id: 225, classroom_id: 1, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' },
                // Day 2 (Tuesday)
                { day_of_week: 2, start_time: '07:00:00', end_time: '08:25:00', subject_id: 8, teacher_user_id: 210, classroom_id: 1, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 2, start_time: '08:35:00', end_time: '10:00:00', subject_id: 9, teacher_user_id: 227, classroom_id: 1, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' },
                // Day 3 (Wednesday)
                { day_of_week: 3, start_time: '07:00:00', end_time: '08:25:00', subject_id: 7, teacher_user_id: 203, classroom_id: 1, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 3, start_time: '08:35:00', end_time: '10:00:00', subject_id: 2, teacher_user_id: 225, classroom_id: 1, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' },
                // Day 4 (Thursday)
                { day_of_week: 4, start_time: '07:00:00', end_time: '08:25:00', subject_id: 11, teacher_user_id: 226, classroom_id: 1, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 4, start_time: '08:35:00', end_time: '10:00:00', subject_id: 10, teacher_user_id: 211, classroom_id: 1, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' },
                // Day 5 (Friday)
                { day_of_week: 5, start_time: '07:00:00', end_time: '08:25:00', subject_id: 7, teacher_user_id: 203, classroom_id: 1, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 5, start_time: '08:35:00', end_time: '10:00:00', subject_id: 2, teacher_user_id: 225, classroom_id: 1, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' },
                // Day 6 (Saturday)
                { day_of_week: 6, start_time: '07:00:00', end_time: '08:25:00', subject_id: 14, teacher_user_id: 212, classroom_id: 1, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 6, start_time: '08:35:00', end_time: '10:00:00', subject_id: 9, teacher_user_id: 227, classroom_id: 1, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' }
            ]
        },

        // 4. Batch 17: 8th ICSE 2025-26 (Branch 1, Room 1, 10:00 - 13:00)
        {
            batchId: 17,
            branchId: 1,
            academicYearId: 1,
            batchName: '8th ICSE 2025-26',
            slots: [
                // Day 1 (Monday)
                { day_of_week: 1, start_time: '10:00:00', end_time: '11:25:00', subject_id: 2, teacher_user_id: 225, classroom_id: 1, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 1, start_time: '11:35:00', end_time: '13:00:00', subject_id: 7, teacher_user_id: 203, classroom_id: 1, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' },
                // Day 2 (Tuesday)
                { day_of_week: 2, start_time: '10:00:00', end_time: '11:25:00', subject_id: 9, teacher_user_id: 227, classroom_id: 1, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 2, start_time: '11:35:00', end_time: '13:00:00', subject_id: 8, teacher_user_id: 210, classroom_id: 1, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' },
                // Day 3 (Wednesday)
                { day_of_week: 3, start_time: '10:00:00', end_time: '11:25:00', subject_id: 2, teacher_user_id: 225, classroom_id: 1, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 3, start_time: '11:35:00', end_time: '13:00:00', subject_id: 7, teacher_user_id: 203, classroom_id: 1, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' },
                // Day 4 (Thursday)
                { day_of_week: 4, start_time: '10:00:00', end_time: '11:25:00', subject_id: 10, teacher_user_id: 211, classroom_id: 1, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 4, start_time: '11:35:00', end_time: '13:00:00', subject_id: 11, teacher_user_id: 226, classroom_id: 1, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' },
                // Day 5 (Friday)
                { day_of_week: 5, start_time: '10:00:00', end_time: '11:25:00', subject_id: 2, teacher_user_id: 225, classroom_id: 1, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 5, start_time: '11:35:00', end_time: '13:00:00', subject_id: 7, teacher_user_id: 203, classroom_id: 1, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' },
                // Day 6 (Saturday)
                { day_of_week: 6, start_time: '10:00:00', end_time: '11:25:00', subject_id: 14, teacher_user_id: 212, classroom_id: 1, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 6, start_time: '11:35:00', end_time: '13:00:00', subject_id: 9, teacher_user_id: 227, classroom_id: 1, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' }
            ]
        },

        // 5. Batch 5: Foundation VIII (Branch 2, Room 3, 08:00 - 11:00)
        {
            batchId: 5,
            branchId: 2,
            academicYearId: 5,
            batchName: 'Foundation VIII',
            slots: [
                // Day 1 (Monday)
                { day_of_week: 1, start_time: '08:00:00', end_time: '09:25:00', subject_id: 2, teacher_user_id: 213, classroom_id: 3, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 1, start_time: '09:35:00', end_time: '11:00:00', subject_id: 7, teacher_user_id: 214, classroom_id: 3, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' },
                // Day 2 (Tuesday)
                { day_of_week: 2, start_time: '08:00:00', end_time: '09:25:00', subject_id: 9, teacher_user_id: 215, classroom_id: 3, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 2, start_time: '09:35:00', end_time: '11:00:00', subject_id: 14, teacher_user_id: 216, classroom_id: 3, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' },
                // Day 3 (Wednesday)
                { day_of_week: 3, start_time: '08:00:00', end_time: '09:25:00', subject_id: 2, teacher_user_id: 213, classroom_id: 3, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 3, start_time: '09:35:00', end_time: '11:00:00', subject_id: 7, teacher_user_id: 214, classroom_id: 3, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' },
                // Day 4 (Thursday)
                { day_of_week: 4, start_time: '08:00:00', end_time: '09:25:00', subject_id: 11, teacher_user_id: 217, classroom_id: 3, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 4, start_time: '09:35:00', end_time: '11:00:00', subject_id: 8, teacher_user_id: 218, classroom_id: 3, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' },
                // Day 5 (Friday)
                { day_of_week: 5, start_time: '08:00:00', end_time: '09:25:00', subject_id: 2, teacher_user_id: 213, classroom_id: 3, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 5, start_time: '09:35:00', end_time: '11:00:00', subject_id: 7, teacher_user_id: 214, classroom_id: 3, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' },
                // Day 6 (Saturday)
                { day_of_week: 6, start_time: '08:00:00', end_time: '09:25:00', subject_id: 14, teacher_user_id: 216, classroom_id: 3, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 6, start_time: '09:35:00', end_time: '11:00:00', subject_id: 9, teacher_user_id: 215, classroom_id: 3, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' }
            ]
        },

        // 6. Batch 13: Foundation VIII Evening (Branch 2, Room 3, 16:00 - 18:30)
        {
            batchId: 13,
            branchId: 2,
            academicYearId: 5,
            batchName: 'Foundation VIII Evening',
            slots: [
                // Day 1 (Monday)
                { day_of_week: 1, start_time: '16:00:00', end_time: '17:15:00', subject_id: 7, teacher_user_id: 214, classroom_id: 3, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 1, start_time: '17:20:00', end_time: '18:30:00', subject_id: 2, teacher_user_id: 213, classroom_id: 3, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' },
                // Day 2 (Tuesday)
                { day_of_week: 2, start_time: '16:00:00', end_time: '17:15:00', subject_id: 14, teacher_user_id: 216, classroom_id: 3, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 2, start_time: '17:20:00', end_time: '18:30:00', subject_id: 9, teacher_user_id: 215, classroom_id: 3, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' },
                // Day 3 (Wednesday)
                { day_of_week: 3, start_time: '16:00:00', end_time: '17:15:00', subject_id: 7, teacher_user_id: 214, classroom_id: 3, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 3, start_time: '17:20:00', end_time: '18:30:00', subject_id: 2, teacher_user_id: 213, classroom_id: 3, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' },
                // Day 4 (Thursday)
                { day_of_week: 4, start_time: '16:00:00', end_time: '17:15:00', subject_id: 8, teacher_user_id: 218, classroom_id: 3, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 4, start_time: '17:20:00', end_time: '18:30:00', subject_id: 11, teacher_user_id: 217, classroom_id: 3, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' },
                // Day 5 (Friday)
                { day_of_week: 5, start_time: '16:00:00', end_time: '17:15:00', subject_id: 7, teacher_user_id: 214, classroom_id: 3, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 5, start_time: '17:20:00', end_time: '18:30:00', subject_id: 2, teacher_user_id: 213, classroom_id: 3, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' },
                // Day 6 (Saturday)
                { day_of_week: 6, start_time: '16:00:00', end_time: '17:15:00', subject_id: 9, teacher_user_id: 215, classroom_id: 3, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 1' },
                { day_of_week: 6, start_time: '17:20:00', end_time: '18:30:00', subject_id: 14, teacher_user_id: 216, classroom_id: 3, lecture_type: 'Regular', activity_type: 'Lecture', slot_label: 'Slot 2' }
            ]
        }
    ];

    let totalSaved = 0;
    for (const b of batchesToSeed) {
        const result = await timetableModel.saveDefaultTimetable(
            tenantId,
            b.batchId,
            b.slots,
            b.branchId,
            b.academicYearId
        );
        console.log(`✅ Saved ${result.count} default slots for Batch "${b.batchName}" (ID: ${b.batchId})`);
        totalSaved += result.count;
    }

    console.log(`\n🎉 Successfully seeded ${totalSaved} default timetable slots across all ${batchesToSeed.length} 8th Standard batches!`);
    process.exit(0);
}

seed8thDefaultTimetables().catch(err => {
    console.error('❌ Error seeding default timetables:', err);
    process.exit(1);
});
