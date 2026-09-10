// ===== Categories (for courses filtering) =====
export const categories = ["All", "Compliance", "Leadership", "Technical"];

// ===== Hero Section =====
export const heroData = {
  announcement: {
    text: "New: Q1 Compliance Training Now Available",
    href: "/courses",
    cta: "Start learning",
  },
  headline: "Grow your skills. Advance your career.",
  subheadline:
    "Access courses designed to help you succeed — from onboarding essentials to advanced leadership training. Your learning journey starts here.",
  heroImage: "/images/hero.jpg",
  primaryCta: {
    text: "Explore Courses",
    href: "/courses",
  },
  secondaryCta: {
    text: "View on GitHub",
    href: "https://github.com/visheshgubrani/docento",
  },
};

// ===== Features Section =====
export const featuresData = {
  eyebrow: "Why Acme Learning",
  headline: "Everything you need to grow",
  description: "Your learning experience, designed for busy professionals.",
  features: [
    {
      title: "Learn at Your Pace",
      description:
        "Self-paced courses that fit your schedule. Start, pause, and resume whenever works for you.",
    },
    {
      title: "Track Your Progress",
      description:
        "See your completed courses, earned certificates, and learning streaks all in one dashboard.",
    },
    {
      title: "Expert-Led Content",
      description:
        "Courses developed with subject matter experts and updated regularly to stay current.",
    },
  ],
};

// ===== Courses Section =====
export const coursesData = {
  eyebrow: "Course Library",
  headline: "Courses to build your skills",
  description:
    "Browse our collection of on-demand courses covering compliance, leadership, technical skills, and more.",
  courses: [
    {
      id: "1",
      title: "New Employee Onboarding",
      description:
        "Everything you need to know to get started at Acme. Covers company policies, tools, culture, and the resources you'll use every day. By the end of this course, you'll feel confident navigating internal systems and connecting with your team.",
      thumbnail: "/images/course01.jpg",
      instructor: "HR Team",
      lessonsCount: 12,
      studentsCount: 1850,
      price: 0,
      category: "Compliance",
      tags: ["Compliance", "Onboarding", "HR"],
      createdAt: "2025-09-15",
      instructors: [
        {
          name: "Sarah Mitchell",
          role: "Head of People Operations",
          avatar: "/images/testimonial01.jpg",
        },
        {
          name: "James Rivera",
          role: "HR Business Partner",
          avatar: "/images/testimonial02.jpg",
        },
      ],
      includes: {
        videoHours: 6,
        quizzes: 2,
        articles: 4,
        downloads: 10,
        mobileAccess: true,
        captions: true,
        certificate: true,
      },
      modules: [
        {
          title: "Welcome to Acme",
          lessons: [
            {
              title: "About Acme — Our Mission & Values",
              duration: "8:30",
              isFreePreview: true,
              status: "free",
              type: "video",
              description:
                "Learn about our company mission, core values, and what makes Acme unique.",
            },
            {
              title: "Meet the Leadership Team",
              duration: "12:15",
              isFreePreview: true,
              status: "free",
              type: "video",
              description:
                "Get introduced to our executive team and understand their roles and vision.",
            },
            {
              title: "Your First Day Checklist",
              duration: "6:45",
              isFreePreview: false,
              status: "locked",
              type: "text",
              description:
                "A comprehensive guide to ensure your first day is smooth and successful.",
            },
          ],
        },
        {
          title: "Tools & Systems",
          lessons: [
            {
              title: "Setting Up Your Workspace",
              duration: "10:00",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description:
                "Configure your physical and digital workspace for maximum productivity.",
            },
            {
              title: "Internal Communication Tools",
              duration: "14:20",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description:
                "Master the tools we use for team collaboration and daily communication.",
            },
            {
              title: "Time Tracking & Attendance",
              duration: "8:50",
              isFreePreview: false,
              status: "locked",
              type: "quiz",
              description: "Learn how to log your hours and manage your attendance effectively.",
            },
          ],
        },
        {
          title: "Company Policies",
          lessons: [
            {
              title: "Code of Conduct",
              duration: "11:30",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description:
                "Understand our ethical standards and professional behavior expectations.",
            },
            {
              title: "Leave Policies & Benefits",
              duration: "9:15",
              isFreePreview: false,
              status: "locked",
              type: "text",
              description: "Explore your benefits package and learn how to request time off.",
            },
            {
              title: "Health & Safety Guidelines",
              duration: "7:40",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description:
                "Essential safety protocols and wellness resources for a healthy workplace.",
            },
          ],
        },
        {
          title: "Getting Connected",
          lessons: [
            {
              title: "Finding Your Buddy & Mentor",
              duration: "6:20",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description:
                "Connect with your assigned buddy and mentor for ongoing support and guidance.",
            },
            {
              title: "Team Introductions & Social Channels",
              duration: "8:00",
              isFreePreview: false,
              status: "locked",
              type: "text",
              description: "Meet your immediate team and join our internal social communities.",
            },
            {
              title: "Your 30-60-90 Day Plan",
              duration: "15:10",
              isFreePreview: false,
              status: "locked",
              type: "resources",
              description: "Set clear goals and milestones for your first three months at Acme.",
            },
          ],
        },
      ],
    },
    {
      id: "2",
      title: "Data Privacy & Security Fundamentals",
      description:
        "Learn how to protect sensitive information and maintain compliance with data privacy regulations. This course covers GDPR, internal data handling best practices, phishing awareness, and secure communication protocols.",
      thumbnail: "/images/course02.jpg",
      instructor: "Security Team",
      lessonsCount: 8,
      studentsCount: 2340,
      price: 0,
      category: "Compliance",
      tags: ["Compliance", "Security", "Data Privacy"],
      createdAt: "2025-08-01",
      instructors: [
        {
          name: "Raj Gupta",
          role: "Chief Information Security Officer",
          avatar: "/images/testimonial03.jpg",
        },
      ],
      includes: {
        videoHours: 4,
        quizzes: 3,
        articles: 6,
        downloads: 5,
        mobileAccess: true,
        captions: true,
        certificate: true,
      },
      modules: [
        {
          title: "Introduction to Data Privacy",
          lessons: [
            {
              title: "Why Data Privacy Matters",
              duration: "10:00",
              isFreePreview: true,
              status: "free",
              type: "video",
              description:
                "Understand the importance of protecting personal and organizational data.",
            },
            {
              title: "Key Regulations (GDPR, CCPA)",
              duration: "14:30",
              isFreePreview: true,
              status: "free",
              type: "video",
              description: "Learn the major data privacy laws and how they impact our business.",
            },
          ],
        },
        {
          title: "Handling Sensitive Data",
          lessons: [
            {
              title: "Classifying Data Types",
              duration: "9:20",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description:
                "Learn to identify and categorize data based on sensitivity and handling requirements.",
            },
            {
              title: "Secure Storage & Transmission",
              duration: "12:45",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description:
                "Master techniques for safely storing and sharing sensitive information.",
            },
            {
              title: "Access Control Best Practices",
              duration: "11:00",
              isFreePreview: false,
              status: "locked",
              type: "text",
              description: "Understand how to manage who can access what data and why it matters.",
            },
          ],
        },
        {
          title: "Threat Awareness",
          lessons: [
            {
              title: "Recognizing Phishing Attacks",
              duration: "8:30",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description:
                "Identify suspicious emails and messages designed to steal your credentials.",
            },
            {
              title: "Social Engineering Tactics",
              duration: "10:15",
              isFreePreview: false,
              status: "locked",
              type: "quiz",
              description:
                "Understand manipulation techniques attackers use to gain unauthorized access.",
            },
            {
              title: "Incident Reporting Procedures",
              duration: "7:50",
              isFreePreview: false,
              status: "locked",
              type: "resources",
              description:
                "Know exactly what to do and who to contact when a security incident occurs.",
            },
          ],
        },
      ],
    },
    {
      id: "3",
      title: "Effective Communication Skills",
      description:
        "Improve your written and verbal communication for better collaboration with teammates and stakeholders. Learn frameworks for clear emails, persuasive presentations, and productive meetings.",
      thumbnail: "/images/course03.jpg",
      instructor: "Maya Patel",
      lessonsCount: 15,
      studentsCount: 1420,
      price: 1499,
      category: "Leadership",
      tags: ["Leadership", "Communication", "Soft Skills"],
      createdAt: "2025-10-20",
      instructors: [
        {
          name: "Maya Patel",
          role: "Communications Director",
          avatar: "/images/testimonial04.jpg",
        },
      ],
      includes: {
        videoHours: 8,
        quizzes: 4,
        articles: 7,
        downloads: 12,
        mobileAccess: true,
        captions: true,
        certificate: true,
      },
      modules: [
        {
          title: "Foundations of Communication",
          lessons: [
            {
              title: "The Communication Framework",
              duration: "9:00",
              isFreePreview: true,
              status: "free",
              type: "video",
              description:
                "Master the fundamentals of clear and effective communication in any context.",
            },
            {
              title: "Active Listening Techniques",
              duration: "11:30",
              isFreePreview: true,
              status: "free",
              type: "video",
              description: "Develop skills to truly hear and understand what others are saying.",
            },
            {
              title: "Understanding Your Audience",
              duration: "8:45",
              isFreePreview: false,
              status: "locked",
              type: "text",
              description: "Tailor your message by analyzing who you're communicating with.",
            },
          ],
        },
        {
          title: "Written Communication",
          lessons: [
            {
              title: "Writing Clear & Concise Emails",
              duration: "12:00",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description:
                "Craft professional emails that get your point across quickly and effectively.",
            },
            {
              title: "Structuring Reports & Documents",
              duration: "14:20",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description: "Organize complex information into readable and actionable documents.",
            },
            {
              title: "Slack & Chat Etiquette",
              duration: "7:30",
              isFreePreview: false,
              status: "locked",
              type: "text",
              description: "Navigate digital communication tools with professionalism and clarity.",
            },
          ],
        },
        {
          title: "Verbal Communication",
          lessons: [
            {
              title: "Presenting with Confidence",
              duration: "15:00",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description:
                "Deliver compelling presentations that engage and persuade your audience.",
            },
            {
              title: "Running Effective Meetings",
              duration: "10:45",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description:
                "Lead productive meetings that respect everyone's time and achieve outcomes.",
            },
            {
              title: "Giving & Receiving Feedback",
              duration: "13:20",
              isFreePreview: false,
              status: "locked",
              type: "quiz",
              description: "Master the art of constructive feedback to improve team performance.",
            },
          ],
        },
        {
          title: "Advanced Topics",
          lessons: [
            {
              title: "Cross-Cultural Communication",
              duration: "11:00",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description:
                "Communicate effectively across diverse cultural backgrounds and contexts.",
            },
            {
              title: "Negotiation Basics",
              duration: "14:50",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description:
                "Learn fundamental techniques for reaching mutually beneficial agreements.",
            },
            {
              title: "Handling Difficult Conversations",
              duration: "12:30",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description: "Navigate challenging discussions with confidence and professionalism.",
            },
            {
              title: "Storytelling for Business",
              duration: "9:40",
              isFreePreview: false,
              status: "locked",
              type: "text",
              description:
                "Use narrative techniques to make your business communications memorable.",
            },
            {
              title: "Building Your Personal Brand",
              duration: "10:15",
              isFreePreview: false,
              status: "locked",
              type: "quiz",
              description: "Develop and promote your unique professional identity and reputation.",
            },
          ],
        },
      ],
    },
    {
      id: "4",
      title: "Project Management Essentials",
      description:
        "Master the fundamentals of planning, executing, and delivering projects on time and within budget. Covers Agile and Waterfall methodologies, stakeholder management, risk assessment, and team coordination.",
      thumbnail: "/images/course04.jpg",
      instructor: "David Chen",
      lessonsCount: 20,
      studentsCount: 980,
      price: 1999,
      category: "Leadership",
      tags: ["Leadership", "Project Management", "Agile"],
      createdAt: "2025-11-05",
      instructors: [
        {
          name: "David Chen",
          role: "Senior Program Manager",
          avatar: "/images/testimonial05.jpg",
        },
        {
          name: "Anita Rao",
          role: "Agile Coach",
          avatar: "/images/testimonial06.jpg",
        },
      ],
      includes: {
        videoHours: 12,
        quizzes: 5,
        articles: 8,
        downloads: 15,
        mobileAccess: true,
        captions: true,
        certificate: true,
      },
      modules: [
        {
          title: "Project Management Foundations",
          lessons: [
            {
              title: "What is Project Management?",
              duration: "8:00",
              isFreePreview: true,
              status: "free",
              type: "video",
              description:
                "Understand the core concepts and responsibilities of project management.",
            },
            {
              title: "Project Life Cycle Overview",
              duration: "11:30",
              isFreePreview: true,
              status: "free",
              type: "video",
              description:
                "Learn the phases every project goes through from initiation to closure.",
            },
            {
              title: "Defining Scope & Objectives",
              duration: "10:20",
              isFreePreview: false,
              status: "locked",
              type: "text",
              description: "Set clear boundaries and goals to keep your project on track.",
            },
          ],
        },
        {
          title: "Planning & Scheduling",
          lessons: [
            {
              title: "Work Breakdown Structures",
              duration: "13:00",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description: "Decompose complex projects into manageable tasks and deliverables.",
            },
            {
              title: "Creating Project Timelines",
              duration: "14:45",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description:
                "Build realistic schedules that account for dependencies and constraints.",
            },
            {
              title: "Resource Allocation",
              duration: "9:30",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description:
                "Assign the right people and tools to the right tasks at the right time.",
            },
            {
              title: "Budgeting & Cost Estimation",
              duration: "12:15",
              isFreePreview: false,
              status: "locked",
              type: "quiz",
              description: "Forecast expenses accurately and manage project finances effectively.",
            },
          ],
        },
        {
          title: "Agile & Scrum",
          lessons: [
            {
              title: "Introduction to Agile",
              duration: "10:00",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description: "Discover the principles and values behind Agile project management.",
            },
            {
              title: "Scrum Framework Deep Dive",
              duration: "16:30",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description: "Master the roles, ceremonies, and artifacts of the Scrum methodology.",
            },
            {
              title: "Sprint Planning & Retrospectives",
              duration: "12:00",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description: "Run effective sprint ceremonies that drive continuous improvement.",
            },
            {
              title: "Kanban Basics",
              duration: "8:45",
              isFreePreview: false,
              status: "locked",
              type: "text",
              description: "Visualize workflow and limit work in progress using Kanban boards.",
            },
          ],
        },
        {
          title: "Execution & Monitoring",
          lessons: [
            {
              title: "Stakeholder Communication",
              duration: "11:20",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description:
                "Keep all project stakeholders informed and engaged throughout the lifecycle.",
            },
            {
              title: "Risk Management",
              duration: "13:45",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description: "Identify, assess, and mitigate potential threats to project success.",
            },
            {
              title: "Quality Assurance",
              duration: "9:50",
              isFreePreview: false,
              status: "locked",
              type: "quiz",
              description: "Ensure deliverables meet requirements and maintain high standards.",
            },
            {
              title: "Change Management",
              duration: "10:30",
              isFreePreview: false,
              status: "locked",
              type: "text",
              description: "Handle scope changes and pivots while minimizing project disruption.",
            },
          ],
        },
        {
          title: "Closing & Review",
          lessons: [
            {
              title: "Project Closeout Checklist",
              duration: "7:40",
              isFreePreview: false,
              status: "locked",
              type: "resources",
              description:
                "Complete all necessary steps to officially close your project successfully.",
            },
            {
              title: "Lessons Learned & Documentation",
              duration: "9:00",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description:
                "Capture valuable insights and create documentation for future projects.",
            },
            {
              title: "Building a PM Career Path",
              duration: "11:15",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description: "Explore career progression opportunities in project management.",
            },
            {
              title: "Certification Prep Overview",
              duration: "8:30",
              isFreePreview: false,
              status: "locked",
              type: "quiz",
              description: "Prepare for industry-recognized project management certifications.",
            },
          ],
        },
      ],
    },
    {
      id: "5",
      title: "Introduction to Python",
      description:
        "Get started with Python programming. No prior coding experience required. You'll learn variables, data types, control flow, functions, and build small projects to solidify your understanding.",
      thumbnail: "/images/course05.png",
      instructor: "Alex Kumar",
      lessonsCount: 24,
      studentsCount: 760,
      price: 2499,
      category: "Technical",
      tags: ["Technical", "Python", "Programming"],
      createdAt: "2025-12-01",
      instructors: [
        {
          name: "Alex Kumar",
          role: "Staff Software Engineer",
          avatar: "/images/testimonial01.jpg",
        },
      ],
      includes: {
        videoHours: 16,
        quizzes: 6,
        articles: 10,
        downloads: 20,
        mobileAccess: true,
        captions: true,
        certificate: true,
      },
      modules: [
        {
          title: "Getting Started",
          lessons: [
            {
              title: "Why Learn Python?",
              duration: "6:30",
              isFreePreview: true,
              status: "free",
              type: "video",
              description:
                "Discover why Python is one of the most popular programming languages today.",
            },
            {
              title: "Installing Python & Setting Up",
              duration: "10:00",
              isFreePreview: true,
              status: "free",
              type: "video",
              description: "Get your development environment ready with step-by-step installation.",
            },
            {
              title: "Your First Python Script",
              duration: "8:15",
              isFreePreview: true,
              status: "free",
              type: "video",
              description: "Write and run your very first Python program from scratch.",
            },
          ],
        },
        {
          title: "Core Concepts",
          lessons: [
            {
              title: "Variables & Data Types",
              duration: "14:00",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description: "Learn how to store and manipulate different kinds of data in Python.",
            },
            {
              title: "Strings & String Methods",
              duration: "12:30",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description: "Master text manipulation with Python's powerful string operations.",
            },
            {
              title: "Numbers & Math Operations",
              duration: "9:45",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description: "Perform calculations and work with numeric data types in Python.",
            },
            {
              title: "Booleans & Comparisons",
              duration: "8:20",
              isFreePreview: false,
              status: "locked",
              type: "quiz",
              description:
                "Understand true/false values and comparison operators for decision making.",
            },
          ],
        },
        {
          title: "Control Flow",
          lessons: [
            {
              title: "If / Else Statements",
              duration: "11:00",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description: "Make decisions in your code using conditional logic and branching.",
            },
            {
              title: "For Loops",
              duration: "13:15",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description:
                "Iterate through collections and repeat actions efficiently with for loops.",
            },
            {
              title: "While Loops",
              duration: "9:30",
              isFreePreview: false,
              status: "locked",
              type: "text",
              description: "Execute code repeatedly while conditions are met using while loops.",
            },
            {
              title: "List Comprehensions",
              duration: "10:45",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description: "Write concise and elegant code to create lists in a single line.",
            },
          ],
        },
        {
          title: "Functions & Modules",
          lessons: [
            {
              title: "Defining Functions",
              duration: "12:00",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description: "Create reusable blocks of code to organize and simplify your programs.",
            },
            {
              title: "Parameters & Return Values",
              duration: "10:30",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description: "Pass data into functions and get results back using return statements.",
            },
            {
              title: "Importing Modules",
              duration: "8:00",
              isFreePreview: false,
              status: "locked",
              type: "text",
              description:
                "Leverage pre-built libraries and tools to extend Python's capabilities.",
            },
            {
              title: "Error Handling with Try/Except",
              duration: "11:45",
              isFreePreview: false,
              status: "locked",
              type: "quiz",
              description: "Gracefully handle errors and exceptions to make your code more robust.",
            },
          ],
        },
        {
          title: "Data Structures",
          lessons: [
            {
              title: "Lists & Tuples",
              duration: "14:20",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description: "Store and organize collections of data using Python's sequence types.",
            },
            {
              title: "Dictionaries",
              duration: "13:00",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description: "Map keys to values for fast lookups and structured data storage.",
            },
            {
              title: "Sets",
              duration: "7:30",
              isFreePreview: false,
              status: "locked",
              type: "text",
              description: "Work with unique collections and perform set operations efficiently.",
            },
            {
              title: "Working with Files",
              duration: "12:15",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description: "Read from and write to files to persist data beyond program execution.",
            },
          ],
        },
        {
          title: "Mini Projects",
          lessons: [
            {
              title: "Build a Calculator",
              duration: "18:00",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description:
                "Apply your skills to create a functional command-line calculator application.",
            },
            {
              title: "Create a To-Do App",
              duration: "22:30",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description: "Build a task management application to organize your daily activities.",
            },
            {
              title: "Data Analysis Script",
              duration: "20:00",
              isFreePreview: false,
              status: "locked",
              type: "resources",
              description:
                "Process and analyze datasets using Python's data manipulation capabilities.",
            },
            {
              title: "Final Project & Next Steps",
              duration: "15:00",
              isFreePreview: false,
              status: "locked",
              type: "quiz",
              description:
                "Complete your learning journey and discover paths for continued growth.",
            },
          ],
        },
      ],
    },
    {
      id: "6",
      title: "Excel for Business",
      description:
        "Learn advanced Excel features including formulas, pivot tables, and data visualization. Perfect for analysts, managers, and anyone who works with data regularly.",
      thumbnail: "/images/course06.jpg",
      instructor: "Lisa Wong",
      lessonsCount: 18,
      studentsCount: 1650,
      price: 999,
      category: "Technical",
      tags: ["Technical", "Excel", "Data Analysis"],
      createdAt: "2025-07-10",
      instructors: [
        {
          name: "Lisa Wong",
          role: "Data Analytics Lead",
          avatar: "/images/testimonial03.jpg",
        },
      ],
      includes: {
        videoHours: 10,
        quizzes: 3,
        articles: 5,
        downloads: 18,
        mobileAccess: true,
        captions: true,
        certificate: true,
      },
      modules: [
        {
          title: "Excel Essentials Refresher",
          lessons: [
            {
              title: "Navigating Excel Like a Pro",
              duration: "7:00",
              isFreePreview: true,
              status: "free",
              type: "video",
              description: "Move through spreadsheets efficiently and locate data quickly.",
            },
            {
              title: "Essential Keyboard Shortcuts",
              duration: "9:30",
              isFreePreview: true,
              status: "free",
              type: "video",
              description: "Speed up your workflow with time-saving keyboard combinations.",
            },
            {
              title: "Formatting & Cell References",
              duration: "10:15",
              isFreePreview: false,
              status: "locked",
              type: "text",
              description:
                "Make your data readable and reference cells correctly across worksheets.",
            },
          ],
        },
        {
          title: "Formulas & Functions",
          lessons: [
            {
              title: "SUM, AVERAGE, COUNT & More",
              duration: "12:00",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description: "Calculate totals, averages, and counts with essential Excel functions.",
            },
            {
              title: "VLOOKUP & HLOOKUP",
              duration: "14:30",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description: "Search and retrieve data from tables using lookup functions.",
            },
            {
              title: "INDEX & MATCH",
              duration: "11:45",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description: "Perform flexible lookups with more power than VLOOKUP alone.",
            },
            {
              title: "IF, AND, OR Logic",
              duration: "10:00",
              isFreePreview: false,
              status: "locked",
              type: "quiz",
              description: "Make decisions in your spreadsheets using logical functions.",
            },
          ],
        },
        {
          title: "Pivot Tables & Charts",
          lessons: [
            {
              title: "Creating Your First Pivot Table",
              duration: "13:20",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description: "Summarize and analyze large datasets quickly with pivot tables.",
            },
            {
              title: "Advanced Pivot Table Techniques",
              duration: "15:00",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description:
                "Unlock the full potential of pivot tables with grouping and calculations.",
            },
            {
              title: "Building Dynamic Charts",
              duration: "12:30",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description: "Create visual representations of your data that update automatically.",
            },
            {
              title: "Dashboard Design Principles",
              duration: "11:00",
              isFreePreview: false,
              status: "locked",
              type: "text",
              description: "Design professional dashboards that communicate insights effectively.",
            },
          ],
        },
        {
          title: "Advanced Features",
          lessons: [
            {
              title: "Conditional Formatting",
              duration: "8:45",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description:
                "Highlight important data automatically based on custom rules and criteria.",
            },
            {
              title: "Data Validation & Protection",
              duration: "9:30",
              isFreePreview: false,
              status: "locked",
              type: "text",
              description: "Prevent errors and secure your spreadsheets from unwanted changes.",
            },
            {
              title: "Power Query Introduction",
              duration: "16:00",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description: "Import, transform, and clean data from multiple sources with ease.",
            },
            {
              title: "Macros & VBA Basics",
              duration: "18:30",
              isFreePreview: false,
              status: "locked",
              type: "video",
              description: "Automate repetitive tasks using Excel's programming capabilities.",
            },
            {
              title: "Real-World Business Scenarios",
              duration: "14:00",
              isFreePreview: false,
              status: "locked",
              type: "resources",
              description: "Apply your Excel skills to solve actual business problems and cases.",
            },
          ],
        },
      ],
    },
  ],
};

// ===== Stats Section =====
export const statsData = {
  eyebrow: "By the Numbers",
  headline: "A growing community of learners.",
  description:
    "Acme Learning supports employees at every stage of their career with courses, resources, and tools to help them succeed.",
  stats: [
    {
      value: "15,000+",
      text: "Course completions this year across all programs.",
    },
    { value: "4.6/5", text: "Average learner satisfaction rating." },
  ],
};

// ===== Testimonials Section =====
export const testimonialsData = {
  eyebrow: "Learner Stories",
  headline: "What employees are saying",
  subheadline: "Hear from colleagues who have grown their skills with Acme Learning.",
  testimonials: [
    {
      quote:
        "The onboarding course made my first week so much smoother. I knew exactly where to find resources and who to ask for help.",
      name: "Rahul Sharma",
      role: "Software Engineer",
      avatar: "/images/testimonial01.jpg",
    },
    {
      quote:
        "I completed the project management course and got certified. It helped me lead my first cross-functional initiative.",
      name: "Priya Patel",
      role: "Product Manager",
      avatar: "/images/testimonial02.jpg",
    },
    {
      quote:
        "The compliance training was actually engaging — not just a checkbox exercise. I learned things I use every day.",
      name: "Amit Kumar",
      role: "Data Analyst",
      avatar: "/images/testimonial03.jpg",
    },
    {
      quote:
        "Being able to learn at my own pace while balancing work responsibilities has been invaluable.",
      name: "Sneha Reddy",
      role: "Marketing Specialist",
      avatar: "/images/testimonial04.jpg",
    },
    {
      quote:
        "The Excel course saved me hours every week. I automated reports that used to take me half a day.",
      name: "Vikram Mehta",
      role: "Finance Associate",
      avatar: "/images/testimonial05.jpg",
    },
    {
      quote:
        "I appreciate that courses are updated regularly. The content always feels current and relevant.",
      name: "Ananya Gupta",
      role: "Operations Manager",
      avatar: "/images/testimonial06.jpg",
    },
  ],
};

// ===== FAQ Section =====
export const faqData = {
  headline: "Frequently Asked Questions",
  faqs: [
    {
      id: "faq-1",
      question: "How do I access courses?",
      answer:
        "Log in with your company credentials and browse the course library. All courses are available on-demand, so you can start learning right away.",
    },
    {
      id: "faq-2",
      question: "Are courses mandatory?",
      answer:
        "Some courses, like compliance training, are required annually. Your manager will notify you of any mandatory courses. All other courses are optional and available for your professional development.",
    },
    {
      id: "faq-3",
      question: "Can I access courses on mobile?",
      answer:
        "Yes! Acme Learning works on any device. You can learn on your laptop, tablet, or phone — wherever and whenever it's convenient.",
    },
    {
      id: "faq-4",
      question: "How do I get a certificate?",
      answer:
        "Complete all lessons and pass any quizzes in a course to earn your certificate. Certificates are saved to your profile and can be downloaded or shared.",
    },
    {
      id: "faq-5",
      question: "Who creates the courses?",
      answer:
        "Courses are developed by our internal teams and subject matter experts. We also partner with industry leaders for specialized content.",
    },
    {
      id: "faq-6",
      question: "How do I suggest a new course?",
      answer:
        "We love feedback! Use the feedback form in the platform or reach out to your manager. We regularly review suggestions when planning new content.",
    },
  ],
};

// ===== CTA Section =====
export const ctaData = {
  headline: "Ready to start learning?",
  subheadline:
    "Explore our course library and find something that interests you. Your next skill is just a click away.",
  primaryCta: {
    text: "Browse Courses",
    href: "/courses",
  },
  secondaryCta: {
    text: "Learn More",
    href: "/about",
  },
};
