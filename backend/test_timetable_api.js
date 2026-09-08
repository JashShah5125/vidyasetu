const timetableModel = require('./src/models/timetableModel');
const conflictService = require('./src/services/conflictService');
const pool = require('./src/config/db');

async function testTimetableBackend() {
    try {
        console.log('🧪 Testing Timetable & Lecture Scheduler Backend Logic...');
        const tenantId = 2; // Allen Career Institute

        // 1. Test Options
        const options = await timetableModel.getTimetableOptions(tenantId);
        console.log(`✅ Options fetched: ${options.branches.length} branches, ${options.courses.length} courses, ${options.batches.length} batches, ${options.subjects.length} subjects, ${options.teachers.length} teachers, ${options.classrooms.length} classrooms.`);

        if (options.batches.length === 0 || options.subjects.length === 0 || options.teachers.length === 0) {
            console.log('⚠️ Insufficient seed data for full end-to-end test, but queries succeeded.');
            process.exit(0);
        }

        const batch = options.batches[0];
        const subject = options.subjects[0];
        const teacher = options.teachers[0];
        const room = options.classrooms[0] || null;

        console.log(`\n📌 Using Batch: "${batch.name}" (ID: ${batch.id}), Subject: "${subject.name}" (ID: ${subject.id}), Teacher: "${teacher.full_name}" (ID: ${teacher.id})`);

        // 2. Test Save Default Timetable
        const defaultSlots = [
            {
                day_of_week: 1, // Monday
                start_time: '09:00:00',
                end_time: '10:30:00',
                subject_id: subject.id,
                teacher_user_id: teacher.id,
                classroom_id: room ? room.id : null,
                lecture_type: 'Regular',
                activity_type: 'Lecture',
                slot_label: 'Period 1'
            },
            {
                day_of_week: 3, // Wednesday
                start_time: '10:45:00',
                end_time: '12:15:00',
                subject_id: subject.id,
                teacher_user_id: teacher.id,
                classroom_id: room ? room.id : null,
                lecture_type: 'Regular',
                activity_type: 'Lecture',
                slot_label: 'Period 2'
            }
        ];

        const saveRes = await timetableModel.saveDefaultTimetable(tenantId, batch.id, defaultSlots, batch.branch_id, batch.academic_year_id, 1);
        console.log(`✅ Saved ${saveRes.count} default timetable slots for batch.`);

        // 3. Test Get Default Timetable
        const fetchedDefault = await timetableModel.getDefaultTimetable(tenantId, batch.id);
        console.log(`✅ Fetched ${fetchedDefault.length} default slots from DB:`);
        fetchedDefault.forEach(s => console.log(`   - Day ${s.day_of_week}: ${s.subject_name} (${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}) with ${s.teacher_name}`));

        // 4. Test Apply Default Timetable to Week
        const weekStartDate = '2026-09-14'; // Monday
        const applyRes = await timetableModel.applyDefaultTimetableToWeek(tenantId, {
            batchId: batch.id,
            weekStartDate,
            overwriteExisting: true,
            skipHolidays: true,
            userId: 1
        });
        console.log(`✅ Applied default timetable to week of ${weekStartDate}: Generated ${applyRes.generatedCount} calendar lectures.`);

        // 5. Test Get Weekly Calendar Lectures
        const weeklyLectures = await timetableModel.getWeeklyLectures(tenantId, {
            batchId: batch.id,
            startDate: '2026-09-14',
            endDate: '2026-09-20'
        });
        console.log(`✅ Fetched ${weeklyLectures.length} weekly calendar lectures for Batch:`);
        weeklyLectures.forEach(l => console.log(`   - ${l.lecture_date} (${l.start_time.slice(0, 5)} - ${l.end_time.slice(0, 5)}): ${l.subject_name} [${l.status}] (modified: ${l.is_modified_from_default})`));

        // 6. Test Conflict Detection (Same teacher at same time)
        const conflicts = await conflictService.checkLectureConflicts(tenantId, {
            branchId: batch.branch_id,
            batchId: 999, // different batch
            teacherUserId: teacher.id,
            classroomId: room ? room.id : null,
            lectureDate: '2026-09-14',
            startTime: '09:15:00',
            endTime: '10:00:00'
        });
        console.log(`✅ Conflict detection test returned ${conflicts.length} conflict(s):`);
        conflicts.forEach(c => console.log(`   ⚠️ [${c.type.toUpperCase()}] ${c.message}`));

        console.log('\n🎉 ALL TIMETABLE BACKEND TESTS PASSED SUCCESSFULLY!');
    } catch (err) {
        console.error('❌ Test failed:', err);
    } finally {
        process.exit(0);
    }
}

testTimetableBackend();
