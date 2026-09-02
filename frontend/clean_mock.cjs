const fs = require('fs');
let txt = fs.readFileSync('src/data/mockData.ts', 'utf8');

txt = txt.replace(/export const (INITIAL_[A-Z_]+|TEACHER_INITIAL_ASSIGNMENTS):\s*([a-zA-Z<>\[\]\s,\w]+)\s*=\s*(?:\[[\s\S]*?\]|\{[\s\S]*?\});/g, (match, p1, p2) => {
    return 'export const ' + p1 + ': ' + p2 + ' = ' + (p2.includes('Record') ? '{}' : '[]') + ';';
});

// Fix any leftover leadsJson/studentsJson references that were casted
txt = txt.replace(/export const (INITIAL_[A-Z_]+):\s*([a-zA-Z<>\[\]\s,\w]+)\s*=\s*\w+ as [\w\[\]]+;/g, 'export const $1: $2 = [];');

fs.writeFileSync('src/data/mockData.ts', txt);
