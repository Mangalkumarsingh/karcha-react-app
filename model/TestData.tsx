// Interface define kar rahe hain taki data ka type strict rahe
export interface TestData {
  id: number;
  name: string;
  subtitle: string;
  department: string;
  isActive: boolean;
}

// 10 users ka data array
export const usersList: TestData[] = [
  { 
    id: 1, 
    name: "Aarav Sharma", 
    subtitle: "Senior Developer", 
    department: "Engineering", 
    isActive: true 
  },
  { 
    id: 2, 
    name: "Priya Singh", 
    subtitle: "UI/UX Designer", 
    department: "Design", 
    isActive: true 
  },
  { 
    id: 3, 
    name: "Rahul Verma", 
    subtitle: "Project Manager", 
    department: "Management", 
    isActive: false 
  },
  { 
    id: 4, 
    name: "Neha Gupta", 
    subtitle: "QA Engineer", 
    department: "Testing", 
    isActive: true 
  },
  { 
    id: 5, 
    name: "Kabir Khan", 
    subtitle: "Marketing Lead", 
    department: "Marketing", 
    isActive: true 
  },
  { 
    id: 6, 
    name: "Sneha Reddy", 
    subtitle: "HR Executive", 
    department: "Human Resources", 
    isActive: true 
  },
  { 
    id: 7, 
    name: "Vikram Malhotra", 
    subtitle: "Backend Specialist", 
    department: "Engineering", 
    isActive: false 
  },
  { 
    id: 8, 
    name: "Ananya Patel", 
    subtitle: "Content Writer", 
    department: "Marketing", 
    isActive: true 
  },
  { 
    id: 9, 
    name: "Rohan Desai", 
    subtitle: "DevOps Engineer", 
    department: "Engineering", 
    isActive: true 
  },
  { 
    id: 10, 
    name: "Meera Joshi", 
    subtitle: "Data Analyst", 
    department: "Data Science", 
    isActive: true 
  }
];

// Console pe check karne ke liye
console.log(usersList);