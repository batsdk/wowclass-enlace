import 'dotenv/config';

import { db } from './db'; // Adjust import path as needed
import { 
  users, 
  institutes, 
  classes, 
  students, 
  studentClasses,
  paperTypes,
  papers,
  paperClasses,
  studentAttentions,
  studentAttendance,
  studentMarks,
  recordings
} from '../db/schema'; // Adjust import path as needed

// Fixed teacher ID
const TEACHER_ID = 'e4aba660-0df8-4c29-8f55-89986c5b869f';

async function seedDatabase() {
  console.log('Starting database seeding...');

  try {
    // 1. Create the teacher user (if not exists)
    console.log('Creating teacher user...');
    // await db.insert(users).values({
    //   id: TEACHER_ID,
    //   role: 'teacher',
    //   name: 'John Smith',
    //   email: 'john.smith@example.com',
    //   username: 'johnsmith',
    //   password: '$2b$10$hashedpassword123', // Placeholder hashed password
    // }).onConflictDoNothing();

    // 2. Create additional users for variety
    console.log('Creating additional users...');
    // const additionalUsers = await db.insert(users).values([
      // {
      //   role: 'teacher',
      //   name: 'Sarah Johnson',
      //   email: 'sarah.johnson@example.com',
      //   username: 'sarahjohnson',
      //   password: '$2b$10$hashedpassword456',
      // },
      // {
      //   role: 'student',
      //   name: 'Mike Wilson',
      //   email: 'mike.wilson@example.com',
      //   username: 'mikewilson',
      //   password: '$2b$10$hashedpassword789',
      // }
    // ]).returning();

    // 3. Create InOne institute
    console.log('Creating InOne institute...');
    const [institute] = await db.insert(institutes).values({
      name: 'InOne',
      imageUrl: 'https://example.com/images/inone-logo.jpg',
      address: '123 Education Street, Learning City, LC 12345',
      createdBy: TEACHER_ID,
    }).returning();

    // 4. Create ClaOne class
    console.log('Creating ClaOne class...');
    const [classRecord] = await db.insert(classes).values({
      instituteId: institute.id,
      name: 'ClaOne',
      description: 'Primary Mathematics and Science Class',
      createdBy: TEACHER_ID,
    }).returning();

    // 5. Create students
    console.log('Creating students...');
    const studentData = [
      {
        username: 'alice001',
        firstName: 'Alice',
        lastName: 'Cooper',
        school: 'Central Elementary School',
        password: '$2b$10$studenthash001',
        imageUrl: 'https://example.com/images/alice.jpg',
        createdBy: TEACHER_ID,
      },
      {
        username: 'bob002',
        firstName: 'Bob',
        lastName: 'Johnson',
        school: 'Central Elementary School',
        password: '$2b$10$studenthash002',
        imageUrl: 'https://example.com/images/bob.jpg',
        createdBy: TEACHER_ID,
      },
      {
        username: 'charlie003',
        firstName: 'Charlie',
        lastName: 'Davis',
        school: 'Westside Primary School',
        password: '$2b$10$studenthash003',
        imageUrl: 'https://example.com/images/charlie.jpg',
        createdBy: TEACHER_ID,
      },
      {
        username: 'diana004',
        firstName: 'Diana',
        lastName: 'Miller',
        school: 'Eastpoint Elementary',
        password: '$2b$10$studenthash004',
        imageUrl: 'https://example.com/images/diana.jpg',
        createdBy: TEACHER_ID,
      },
      {
        username: 'ethan005',
        firstName: 'Ethan',
        lastName: 'Brown',
        school: 'Central Elementary School',
        password: '$2b$10$studenthash005',
        createdBy: TEACHER_ID,
      }
    ];

    const createdStudents = await db.insert(students).values(studentData).returning();

    // 6. Assign students to ClaOne class
    console.log('Assigning students to ClaOne class...');
    const studentClassAssignments = createdStudents.map(student => ({
      studentId: student.id,
      classId: classRecord.id,
    }));
    
    await db.insert(studentClasses).values(studentClassAssignments);

    // 7. Create paper types
    console.log('Creating paper types...');
    const paperTypeData = [
      {
        name: 'M', // Monthly test
        isGlobal: true,
        createdBy: TEACHER_ID,
      },
      {
        name: 'P', // Practice paper
        isGlobal: true,
        createdBy: TEACHER_ID,
      },
      {
        name: 'Final Exam',
        isGlobal: false,
        classId: classRecord.id,
        createdBy: TEACHER_ID,
      },
      {
        name: 'Quiz',
        isGlobal: false,
        classId: classRecord.id,
        createdBy: TEACHER_ID,
      }
    ];

    const createdPaperTypes = await db.insert(paperTypes).values(paperTypeData).returning();

    // 8. Create papers
    console.log('Creating papers...');
    const paperData = [
      {
        name: 'Mathematics Monthly Test - Term 1',
        date: new Date('2024-02-15'),
        term: '1' as const,
        typeId: createdPaperTypes.find(pt => pt.name === 'M')!.id,
        createdBy: TEACHER_ID,
      },
      {
        name: 'Science Practice Paper - Term 1',
        date: new Date('2024-03-01'),
        term: '1' as const,
        typeId: createdPaperTypes.find(pt => pt.name === 'P')!.id,
        createdBy: TEACHER_ID,
      },
      {
        name: 'Mathematics Quiz - Term 2',
        date: new Date('2024-05-10'),
        term: '2' as const,
        typeId: createdPaperTypes.find(pt => pt.name === 'Quiz')!.id,
        createdBy: TEACHER_ID,
      },
      {
        name: 'Final Mathematics Exam - Term 2',
        date: new Date('2024-06-20'),
        term: '2' as const,
        typeId: createdPaperTypes.find(pt => pt.name === 'Final Exam')!.id,
        createdBy: TEACHER_ID,
      },
      {
        name: 'Science Monthly Test - Term 3',
        date: new Date('2024-09-15'),
        term: '3' as const,
        typeId: createdPaperTypes.find(pt => pt.name === 'M')!.id,
        createdBy: TEACHER_ID,
      }
    ];

    const createdPapers = await db.insert(papers).values(paperData).returning();

    // 9. Assign papers to ClaOne class
    console.log('Assigning papers to ClaOne class...');
    const paperClassAssignments = createdPapers.map(paper => ({
      paperId: paper.id,
      classId: classRecord.id,
    }));
    
    await db.insert(paperClasses).values(paperClassAssignments);

    // 10. Create student attention records
    console.log('Creating student attention records...');
    const currentYear = new Date().getFullYear().toString();
    const attentionData = createdStudents.map(student => ({
      studentId: student.id,
      year: currentYear,
      term1Attention: Math.floor(Math.random() * 21) + 80, // 80-100
      term2Attention: Math.floor(Math.random() * 21) + 75, // 75-95
      term3Attention: Math.floor(Math.random() * 21) + 70, // 70-90
      note: `${student.firstName} shows good progress throughout the year`,
      createdBy: TEACHER_ID,
    }));

    await db.insert(studentAttentions).values(attentionData);

    // 11. Create student attendance records
    console.log('Creating student attendance records...');
    const attendanceData = [];
    const startDate = new Date('2024-01-15');
    const endDate = new Date('2024-12-15');
    
    // Generate attendance for each student for multiple days
    for (const student of createdStudents) {
      const currentDate = new Date(startDate);
      
      // Generate attendance for roughly 3 days per month
      while (currentDate <= endDate) {
        // Skip weekends
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
          // 90% attendance rate
          const attended = Math.random() > 0.1;
          
          attendanceData.push({
            studentId: student.id,
            classId: classRecord.id,
            date: new Date(currentDate),
            attended,
            createdBy: TEACHER_ID,
          });
        }
        
        // Move to next week (roughly)
        currentDate.setDate(currentDate.getDate() + 7);
      }
    }

    await db.insert(studentAttendance).values(attendanceData);

    // 12. Create student marks
    console.log('Creating student marks...');
    const marksData = [];
    
    for (const student of createdStudents) {
      for (const paper of createdPapers) {
        // Generate realistic marks based on paper type
        let marks;
        if (paper.name.includes('Quiz')) {
          marks = Math.floor(Math.random() * 21) + 70; // 70-90 for quizzes
        } else if (paper.name.includes('Practice')) {
          marks = Math.floor(Math.random() * 31) + 60; // 60-90 for practice
        } else if (paper.name.includes('Final')) {
          marks = Math.floor(Math.random() * 26) + 65; // 65-90 for finals
        } else {
          marks = Math.floor(Math.random() * 31) + 70; // 70-100 for monthly tests
        }
        
        marksData.push({
          paperId: paper.id,
          studentId: student.id,
          marks,
          createdBy: TEACHER_ID,
        });
      }
    }

    await db.insert(studentMarks).values(marksData);

    // 13. Create class recordings
    console.log('Creating class recordings...');
    const recordingData = [
      {
        classId: classRecord.id,
        name: 'Introduction to Algebra - Session 1',
        link: 'https://zoom.us/rec/share/abc123def456',
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        createdBy: TEACHER_ID,
      },
      {
        classId: classRecord.id,
        name: 'Geometry Basics - Session 2',
        link: 'https://zoom.us/rec/share/xyz789uvw012',
        expiryDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days from now
        createdBy: TEACHER_ID,
      },
      {
        classId: classRecord.id,
        name: 'Science Experiment Demo',
        link: 'https://youtube.com/watch?v=demoexperiment',
        expiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
        createdBy: TEACHER_ID,
      },
      {
        classId: classRecord.id,
        name: 'Problem Solving Techniques',
        link: 'https://zoom.us/rec/share/problem123solve',
        expiryDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
        createdBy: TEACHER_ID,
      }
    ];

    await db.insert(recordings).values(recordingData);

    console.log('✅ Database seeding completed successfully!');
    console.log('\nSeeded data summary:');
    console.log(`- 1 Institute: InOne`);
    console.log(`- 1 Class: ClaOne`);
    console.log(`- ${createdStudents.length} Students`);
    console.log(`- ${createdPaperTypes.length} Paper Types`);
    console.log(`- ${createdPapers.length} Papers`);
    console.log(`- ${attendanceData.length} Attendance Records`);
    console.log(`- ${marksData.length} Student Marks`);
    console.log(`- ${recordingData.length} Class Recordings`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Helper function to clear existing data (optional - use with caution!)
async function clearDatabase() {
  console.log('Clearing existing data...');
  
  try {
    // Delete in reverse order of dependencies
    await db.delete(recordings);
    await db.delete(studentMarks);
    await db.delete(studentAttendance);
    await db.delete(studentAttentions);
    await db.delete(paperClasses);
    await db.delete(papers);
    await db.delete(paperTypes);
    await db.delete(studentClasses);
    await db.delete(students);
    await db.delete(classes);
    await db.delete(institutes);
    // Note: Not deleting users table to preserve the teacher
    
    console.log('✅ Database cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    throw error;
  }
}

// Main execution function
async function main() {
  try {
    // Uncomment the next line if you want to clear existing data first
    // await clearDatabase();
    
    await seedDatabase();
    
    console.log('\n🎉 Seeding process completed!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Seeding process failed:', error);
    process.exit(1);
  }
}

// Execute if running directly
if (require.main === module) {
  main();
}

export { seedDatabase, clearDatabase };