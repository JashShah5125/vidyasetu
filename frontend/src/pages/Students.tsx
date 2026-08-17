import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ArrowLeft, FileText, CheckCircle, Clock, Zap } from 'lucide-react';
import type { Student } from '../data/mockData';

export const Students: React.FC = () => {
  const { students: allStudents, parents, enrollments, feeRecords, documents, addToast, currentUser } = useApp();
  const students = useMemo(() => {
    return currentUser?.role === 'branch-admin'
      ? allStudents.filter(s => s.branch === currentUser.branch)
      : allStudents;
  }, [allStudents, currentUser]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('All');
  const [filterBatch, setFilterBatch] = useState('All');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [profileTab, setProfileTab] = useState<'overview' | 'parents' | 'fees' | 'results' | 'documents'>('overview');

  const studentParent = useMemo(() => {
    if (!selectedStudent) return null;
    return parents.find(p => p.id === selectedStudent.parentId || p.childrenIds?.includes(selectedStudent.id));
  }, [selectedStudent, parents]);

  const studentEnrollment = useMemo(() => {
    if (!selectedStudent) return null;
    return enrollments.find(e => e.studentId === selectedStudent.id || selectedStudent.enrollmentIds?.includes(e.id));
  }, [selectedStudent, enrollments]);

  const studentFeeRecord = useMemo(() => {
    if (!studentEnrollment) return null;
    return feeRecords.find(f => f.enrollmentId === studentEnrollment.id);
  }, [studentEnrollment, feeRecords]);

  const studentDocuments = useMemo(() => {
    if (!selectedStudent) return [];
    return documents.filter(d => d.studentId === selectedStudent.id);
  }, [selectedStudent, documents]);

  // Unique lists for filtering options
  const uniqueCourses = Array.from(new Set(students.map(s => s.course)));
  const uniqueBatches = Array.from(new Set(students.map(s => s.batch)));

  const filteredAndSortedStudents = students
    .filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.studentId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCourse = filterCourse === 'All' || s.course === filterCourse;
      const matchBatch = filterBatch === 'All' || s.batch === filterBatch;
      return matchSearch && matchCourse && matchBatch;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleExportCSV = () => {
    const dataToExport = filteredAndSortedStudents.map(s => ({
      'Student ID': s.studentId,
      'Name': s.name,
      'Course': s.course,
      'Batch': s.batch,
      'Mobile': s.mobile,
      'Parent Contact': s.parentMobile,
      'Total Fees': s.feePlan.total,
      'Paid Fees': s.feePlan.paid,
      'Pending Fees': s.feePlan.pending
    }));
    
    if (dataToExport.length === 0) return;
    const csvRows = [];
    const headers = Object.keys(dataToExport[0]);
    csvRows.push(headers.join(','));
    
    for (const row of dataToExport) {
      const values = headers.map(header => {
        const val = row[header as keyof typeof row] || '';
        const escaped = ('' + val).replace(/"/g, '\\"');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "students_directory.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Student profile records exported to CSV successfully.');
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;
  const paginatedStudents = filteredAndSortedStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredAndSortedStudents.length / itemsPerPage);

  if (selectedStudent) {
    return (
      <div className="space-y-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedStudent(null)}
            className="flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={26} />
          </button>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900">
              Student Profile: {selectedStudent.name}
            </h2>
            <p className="text-sm text-slate-500">Configure academic details, documents, and parent contacts.</p>
          </div>
        </div>

        <div className="space-y-6 flex flex-col h-full bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <div className="flex border-b border-slate-200 bg-slate-50 p-2 rounded-xl">
            {['overview', 'parents', 'fees', 'results', 'documents'].map((tab) => (
              <button
                key={tab}
                onClick={() => setProfileTab(tab as any)}
                className={`flex-1 text-center py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer rounded-lg ${
                  profileTab === tab 
                    ? 'bg-white text-blue-600 shadow-sm border-blue-600 font-extrabold' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/50'
                }`}
              >
                {tab === 'overview' ? 'Personal & Academic' : 
                 tab === 'parents' ? 'Parent / Address' : 
                 tab === 'fees' ? 'Fee Structure' : 
                 tab === 'results' ? 'Grades & Marks' : 
                 'Admission Documents'}
              </button>
            ))}
          </div>

          <div className="py-2">
            {profileTab === 'overview' && (
              <div className="space-y-6">
                <div className="flex items-center gap-5 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl">
                  <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md">
                    {selectedStudent.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-display font-extrabold text-slate-900 text-lg">{selectedStudent.name}</h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs font-medium text-slate-500">
                      <span>Student ID: <strong className="font-mono text-slate-700">{selectedStudent.studentId}</strong></span>
                      <span>&bull;</span>
                      <span>Registered Branch: <strong className="text-slate-700">{selectedStudent.branch || 'Mumbai West'}</strong></span>
                      <span>&bull;</span>
                      <span>Admission Date: <strong className="text-slate-700">{selectedStudent.admissionDate}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-5 border border-slate-200/80 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                      1. Personal Details
                    </h3>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Date of Birth</span>
                        <strong className="text-slate-700">{selectedStudent.dob || '15-08-2008'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Gender</span>
                        <strong className="text-slate-700">{selectedStudent.gender || 'Male'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Social Category</span>
                        <strong className="text-slate-700">{selectedStudent.category || 'General'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Email Address</span>
                        <strong className="text-slate-700 font-mono text-xs">{selectedStudent.email || `${selectedStudent.name.toLowerCase().replace(/\s+/g, '')}@example.com`}</strong>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Mobile Contact Number</span>
                        <strong className="text-slate-700 font-mono">{selectedStudent.mobile}</strong>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5 border border-slate-200/80 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                      2. Prior Academic & School Profile
                    </h3>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                      <div className="col-span-2">
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Prior School Name</span>
                        <strong className="text-slate-700">{selectedStudent.schoolName || 'St. Xavier\'s High School'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Current/Standard Class</span>
                        <strong className="text-slate-700">Class {selectedStudent.currentClass || '10'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Affiliation Board</span>
                        <strong className="text-slate-700">{selectedStudent.board || 'CBSE Board'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Target Entrance Exam</span>
                        <strong className="text-slate-700">{selectedStudent.targetExam || 'JEE / IIT Prep'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Year of Entrance Attempt</span>
                        <strong className="text-slate-700">{selectedStudent.yearOfAttempt || '2028'}</strong>
                      </div>
                    </div>
                  </Card>
                </div>

                <Card className="p-5 border border-slate-200/80 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                    3. Registered Course & Batch Details
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                    <div>
                      <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Enrolled Course</span>
                      <strong className="text-blue-700">{selectedStudent.course || 'JEE Prep Course'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Program Track</span>
                      <strong className="text-slate-700">{studentEnrollment?.program || 'Standard Regular Track'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Academic Level</span>
                      <strong className="text-slate-700">{studentEnrollment?.level || 'Intermediate Level'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Assigned Batch</span>
                      <strong className="text-emerald-700 font-mono">{selectedStudent.batch}</strong>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {profileTab === 'parents' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-5 border border-slate-200/80 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                    Parent / Guardian Information
                  </h3>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                    <div>
                      <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Parent's Full Name</span>
                      <strong className="text-slate-800">{studentParent?.name || 'Mr. Rajesh Sharma'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Relation</span>
                      <strong className="text-slate-700">{studentParent?.relation || 'Father'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Parent Mobile</span>
                      <strong className="text-slate-700 font-mono">{selectedStudent.parentMobile}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Parent Email ID</span>
                      <strong className="text-slate-700 font-mono text-xs">{studentParent?.email || 'rajesh.sharma@example.com'}</strong>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Occupation</span>
                      <strong className="text-slate-700">{studentParent?.occupation || 'Senior Business Consultant'}</strong>
                    </div>
                  </div>
                </Card>

                <Card className="p-5 border border-slate-200/80 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                    Residential Address details
                  </h3>
                  <div className="space-y-4 text-sm">
                    <div>
                      <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Street Address</span>
                      <strong className="text-slate-755 block">{selectedStudent.address?.street || 'Flat 402, Nilgiri Heights, Lokhandwala Complex'}</strong>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">City</span>
                        <strong className="text-slate-700">{selectedStudent.address?.city || 'Mumbai'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">State</span>
                        <strong className="text-slate-700">{selectedStudent.address?.state || 'Maharashtra'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Pin Code</span>
                        <strong className="text-slate-700 font-mono">{selectedStudent.address?.pincode || '400053'}</strong>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {profileTab === 'fees' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="bg-slate-50 p-5 border border-slate-200 rounded-2xl">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Course Fee</span>
                    <div className="text-3xl font-display font-extrabold text-slate-800 mt-1">₹{(studentFeeRecord?.totalFee || selectedStudent.feePlan.total).toLocaleString()}</div>
                    <span className="text-[10px] text-slate-400 font-semibold block mt-1">Base Tuition + Registry Charges</span>
                  </div>
                  <div className="bg-emerald-50/50 p-5 border border-emerald-200 rounded-2xl">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Paid Received</span>
                    <div className="text-3xl font-display font-extrabold text-emerald-700 mt-1">₹{selectedStudent.feePlan.paid.toLocaleString()}</div>
                    <span className="text-[10px] text-slate-400 font-semibold block mt-1">Cleared Downpayment + Installments</span>
                  </div>
                  <div className="bg-rose-50/50 p-5 border border-rose-200 rounded-2xl">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Outstanding Balance Dues</span>
                    <div className="text-3xl font-display font-extrabold text-rose-700 mt-1">₹{selectedStudent.feePlan.pending.toLocaleString()}</div>
                    <span className="text-[10px] text-slate-400 font-semibold block mt-1">To Be Paid in Remaining Cycles</span>
                  </div>
                </div>

                <Card className="p-5 border border-slate-200/80 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                    Fee Installment Setup & Discounts
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                    <div>
                      <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Scholarship Discount</span>
                      <strong className="text-emerald-700">₹{(studentFeeRecord?.discount || 0).toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Net Payable Amount</span>
                      <strong className="text-slate-700">₹{(studentFeeRecord?.netFee || (selectedStudent.feePlan.total - (studentFeeRecord?.discount || 0))).toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Initial Downpayment</span>
                      <strong className="text-slate-700">₹{(studentFeeRecord?.downpayment || selectedStudent.feePlan.paid).toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs font-semibold uppercase block mb-0.5">Installment Split Plan</span>
                      <strong className="text-slate-700">
                        {studentFeeRecord?.installments || 12} Installments &bull; ₹{(studentFeeRecord?.installmentAmount || Math.round(selectedStudent.feePlan.pending / 12)).toLocaleString()}/mo
                      </strong>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {profileTab === 'results' && (
              <div className="space-y-4">
                <Card className="border border-slate-200 shadow-sm overflow-hidden">
                  <Table headers={['Evaluation / Assessment Name', 'Subject', 'Obtained Score', 'Percentile', 'Grade Result', 'Status']}>
                    <tr className="hover:bg-slate-50 border-b border-slate-100">
                      <td className="px-6 py-4 font-semibold text-slate-800">Periodic Chemistry Test #3</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-500 font-mono">CHEMISTRY</td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-700">85 / 100</td>
                      <td className="px-6 py-4 font-semibold text-slate-600">85.0%</td>
                      <td className="px-6 py-4 text-xs"><span className="inline-flex px-2 py-0.5 font-bold rounded bg-blue-50 text-blue-700 border border-blue-100">Grade A</span></td>
                      <td className="px-6 py-4 text-xs"><span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold border border-emerald-100">COMPLETED</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50 border-b border-slate-100">
                      <td className="px-6 py-4 font-semibold text-slate-800">Mechanics &amp; Motion Quiz #2</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-500 font-mono">PHYSICS</td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-700">92 / 100</td>
                      <td className="px-6 py-4 font-semibold text-slate-600">92.0%</td>
                      <td className="px-6 py-4 text-xs"><span className="inline-flex px-2 py-0.5 font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-100">Grade A+</span></td>
                      <td className="px-6 py-4 text-xs"><span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold border border-emerald-100">COMPLETED</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-semibold text-slate-800">Calculus &amp; Functions Exam #1</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-500 font-mono">MATHEMATICS</td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-700">78 / 100</td>
                      <td className="px-6 py-4 font-semibold text-slate-600">78.0%</td>
                      <td className="px-6 py-4 text-xs"><span className="inline-flex px-2 py-0.5 font-bold rounded bg-slate-100 text-slate-600 border border-slate-200">Grade B+</span></td>
                      <td className="px-6 py-4 text-xs"><span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold border border-emerald-100">COMPLETED</span></td>
                    </tr>
                  </Table>
                </Card>
              </div>
            )}

            {profileTab === 'documents' && (
              <div className="space-y-4">
                <Card className="border border-slate-200 shadow-sm overflow-hidden">
                  <Table headers={['Document Category / Type', 'Uploaded Filename', 'Size', 'Status Verify', 'Date Uploaded', 'Actions']}>
                    {studentDocuments.length > 0 ? (
                      studentDocuments.map((doc, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 border-b border-slate-100 last:border-0">
                          <td className="px-6 py-4 font-semibold text-slate-800">{doc.type || 'Identity Proof'}</td>
                          <td className="px-6 py-4 text-xs text-slate-600 font-mono">{doc.fileName || 'aadhar_card_verify.pdf'}</td>
                          <td className="px-6 py-4 text-xs text-slate-400 font-mono">{doc.fileSize || '1.2 MB'}</td>
                          <td className="px-6 py-4 text-xs">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                              Verified
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400 font-mono">11-08-2026</td>
                          <td className="px-6 py-4">
                            <button className="text-xs font-bold text-blue-500 hover:text-blue-700 transition">
                              Download File
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <>
                        <tr className="hover:bg-slate-50 border-b border-slate-100">
                          <td className="px-6 py-4 font-semibold text-slate-800">Aadhaar Card / Govt Identity</td>
                          <td className="px-6 py-4 text-xs text-slate-600 font-mono">national_id_card.pdf</td>
                          <td className="px-6 py-4 text-xs text-slate-400 font-mono">1.1 MB</td>
                          <td className="px-6 py-4 text-xs">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">
                              Verified
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400 font-mono">12-08-2026</td>
                          <td className="px-6 py-4">
                            <button className="text-xs font-bold text-blue-500 hover:text-blue-700 transition">
                              Download File
                            </button>
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50 border-b border-slate-100">
                          <td className="px-6 py-4 font-semibold text-slate-800">Prior Class Marksheet</td>
                          <td className="px-6 py-4 text-xs text-slate-600 font-mono">class_10th_marksheet.jpg</td>
                          <td className="px-6 py-4 text-xs text-slate-400 font-mono">2.4 MB</td>
                          <td className="px-6 py-4 text-xs">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">
                              Verified
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400 font-mono">12-08-2026</td>
                          <td className="px-6 py-4">
                            <button className="text-xs font-bold text-blue-500 hover:text-blue-700 transition">
                              Download File
                            </button>
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-semibold text-slate-800">School Leaving Certificate</td>
                          <td className="px-6 py-4 text-xs text-slate-600 font-mono">leaving_cert.pdf</td>
                          <td className="px-6 py-4 text-xs text-slate-400 font-mono">920 KB</td>
                          <td className="px-6 py-4 text-xs">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">
                              Verified
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400 font-mono">12-08-2026</td>
                          <td className="px-6 py-4">
                            <button className="text-xs font-bold text-blue-500 hover:text-blue-700 transition">
                              Download File
                            </button>
                          </td>
                        </tr>
                      </>
                    )}
                  </Table>
                </Card>
              </div>
            )}
          </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 mt-6">
              <Button type="button" variant="secondary" onClick={() => setSelectedStudent(null)}>
                Close Profile
              </Button>
            </div>
          </div>
        </div>
      );
    }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Student Profile Directory</h2>
          <p className="text-sm text-slate-500 mt-1">Review active student academic rosters, search details, and view payment ledgers.</p>
        </div>
        <Button variant="secondary" onClick={handleExportCSV}>
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm items-end">
        <Input label="Search" placeholder="Search students by name or ID..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          wrapperClassName="sm:col-span-2"
        />
        <Select
          label="Course"
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value)}
          options={[
            { value: 'All', label: 'All Courses' },
            ...uniqueCourses.map(c => ({ value: c || '', label: c || '' }))
          ]}
        />
        <Select
          label="Batch"
          value={filterBatch}
          onChange={(e) => setFilterBatch(e.target.value)}
          options={[
            { value: 'All', label: 'All Batches' },
            ...uniqueBatches.map(b => ({ value: b || '', label: b || '' }))
          ]}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enrolled Student Profiles</CardTitle>
        </CardHeader>
        <Table headers={['Student ID', 'Name', 'Course', 'Batch Name', 'Mobile', 'Pending Fees', 'Actions']}>
          {paginatedStudents.map((s, idx) => (
            <tr key={idx} className="hover:bg-slate-50">
              <td className="px-6 py-4 font-mono font-bold text-xs">{s.studentId}</td>
              <td className="px-6 py-4 font-semibold text-slate-800">{s.name}</td>
              <td className="px-6 py-4 text-xs">{s.course}</td>
              <td className="px-6 py-4">{s.batch}</td>
              <td className="px-6 py-4 font-mono text-xs">{s.mobile}</td>
              <td className="px-6 py-4 font-semibold text-red-500">Rs. {s.feePlan.pending}</td>
              <td className="px-6 py-4">
                <Button variant="secondary" size="sm" onClick={() => { setSelectedStudent(s); setProfileTab('overview'); }}>
                  View Profile
                </Button>
              </td>
            </tr>
          ))}
        </Table>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredAndSortedStudents.length}
          pageSize={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </Card>
    </div>
  );
};
