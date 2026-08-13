import fs from 'fs';
import path from 'path';
import { 
  INITIAL_LECTURES, 
  INITIAL_ROOMS, 
  INITIAL_BATCHES, 
  INITIAL_STAFF, 
  INITIAL_COURSES,
  INITIAL_BRANCHES
} from '../src/data/mockData';

const db = {
  lectures: INITIAL_LECTURES,
  rooms: INITIAL_ROOMS,
  batches: INITIAL_BATCHES,
  teachers: INITIAL_STAFF.filter(s => s.roles?.includes('Teacher') || s.role === 'Teacher'),
  courses: INITIAL_COURSES,
  branches: INITIAL_BRANCHES,
  defaultTimetables: []
};

const dbPath = path.resolve(process.cwd(), 'server/db.json');
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log('db.json seeded successfully at', dbPath);
