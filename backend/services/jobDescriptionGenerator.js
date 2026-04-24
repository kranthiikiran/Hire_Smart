/**
 * Job Description Generator Service
 * Automatically generates job descriptions based on job titles when not provided
 */

const jobDescriptionTemplates = {
  // Technology & Engineering
  'AI/ML Engineer': `We are seeking an experienced AI/ML Engineer to design, develop, and deploy machine learning models and AI solutions. The ideal candidate will have strong expertise in Python, TensorFlow/PyTorch, and experience with neural networks, deep learning, and natural language processing. You'll work on cutting-edge AI projects, optimize model performance, and collaborate with cross-functional teams to integrate AI capabilities into our products.

Required Skills: Python, Machine Learning, Deep Learning, TensorFlow/PyTorch, Data Science, Model Deployment, Statistical Analysis
Experience: 3-5 years in ML/AI development`,

  'Full Stack Developer': `We're looking for a talented Full Stack Developer to build and maintain web applications from front to back. You'll work with modern JavaScript frameworks (React, Node.js), design RESTful APIs, manage databases, and ensure seamless user experiences. The ideal candidate has strong problem-solving skills and experience with both frontend and backend technologies.

Required Skills: JavaScript, React, Node.js, Express, MongoDB/PostgreSQL, REST APIs, Git, Agile Development
Experience: 2-4 years in full stack development`,

  'Frontend Developer': `Join our team as a Frontend Developer to create beautiful, responsive, and performant user interfaces. You'll work with React, TypeScript, and modern CSS frameworks to deliver exceptional user experiences. Experience with state management, testing, and performance optimization is essential.

Required Skills: React, JavaScript/TypeScript, HTML5, CSS3, Responsive Design, Redux/Context API, Webpack, Testing (Jest)
Experience: 2-4 years in frontend development`,

  'Backend Developer': `We're hiring a Backend Developer to build robust, scalable server-side applications. You'll design and implement APIs, optimize database queries, ensure security best practices, and work on microservices architecture. Strong knowledge of Node.js or Python and database management is required.

Required Skills: Node.js/Python, REST APIs, Database Design, SQL/NoSQL, Authentication & Security, Cloud Services, Microservices
Experience: 3-5 years in backend development`,

  'DevOps Engineer': `Seeking a skilled DevOps Engineer to streamline our development and deployment processes. You'll manage CI/CD pipelines, containerization with Docker/Kubernetes, cloud infrastructure (AWS/Azure/GCP), and ensure system reliability and scalability. Strong automation and scripting skills are essential.

Required Skills: Docker, Kubernetes, CI/CD, AWS/Azure/GCP, Terraform, Jenkins, Linux, Shell Scripting, Monitoring Tools
Experience: 3-5 years in DevOps/Infrastructure`,

  'Data Scientist': `We're looking for a Data Scientist to extract insights from complex datasets and build predictive models. You'll work with large-scale data, perform statistical analysis, create visualizations, and communicate findings to stakeholders. Proficiency in Python, SQL, and machine learning frameworks is required.

Required Skills: Python, SQL, Statistics, Machine Learning, Data Visualization, Pandas, NumPy, Scikit-learn, Jupyter
Experience: 2-4 years in data science`,

  'Data Engineer': `Join us as a Data Engineer to build and maintain data pipelines and infrastructure. You'll design ETL processes, optimize data warehouses, work with big data technologies, and ensure data quality and accessibility. Experience with SQL, Python, and cloud data platforms is essential.

Required Skills: SQL, Python, ETL, Data Warehousing, Apache Spark, Airflow, AWS/Azure Data Services, Big Data Technologies
Experience: 3-5 years in data engineering`,

  'Cloud Solutions Architect': `We're seeking a Cloud Solutions Architect to design and implement scalable cloud infrastructure. You'll architect solutions on AWS/Azure/GCP, ensure security and compliance, optimize costs, and guide migration strategies. Strong knowledge of cloud services and architectural patterns is required.

Required Skills: AWS/Azure/GCP, Cloud Architecture, Security, Networking, Infrastructure as Code, Serverless, Cost Optimization
Experience: 5+ years in cloud architecture`,

  'Cloud Engineer': `Hiring a Cloud Engineer to manage and optimize our cloud infrastructure. You'll deploy applications, automate infrastructure provisioning, monitor system performance, and implement security measures. Hands-on experience with major cloud platforms is essential.

Required Skills: AWS/Azure/GCP, Terraform, CloudFormation, Networking, Security, Monitoring, Linux, Automation
Experience: 2-4 years in cloud engineering`,

  'Cybersecurity Analyst': `We're looking for a Cybersecurity Analyst to protect our systems and data from security threats. You'll monitor security events, conduct vulnerability assessments, implement security measures, and respond to incidents. Knowledge of security frameworks and tools is essential.

Required Skills: Security Analysis, Threat Detection, SIEM Tools, Network Security, Penetration Testing, Compliance, Risk Management
Experience: 2-4 years in cybersecurity`,

  'Security Engineer': `Seeking a Security Engineer to build secure systems and applications. You'll implement security controls, conduct code reviews, perform security testing, and ensure compliance with security standards. Strong knowledge of application security and secure coding practices is required.

Required Skills: Application Security, Secure Coding, Penetration Testing, Encryption, Authentication, Security Frameworks, DevSecOps
Experience: 3-5 years in security engineering`,

  'Product Manager': `We're hiring a Product Manager to drive product strategy and execution. You'll define product roadmaps, gather requirements, prioritize features, work with engineering teams, and ensure successful product launches. Strong analytical and communication skills are essential.

Required Skills: Product Strategy, Roadmap Planning, User Research, Agile/Scrum, Data Analysis, Stakeholder Management, Market Research
Experience: 3-5 years in product management`,

  'Technical Product Manager': `Seeking a Technical Product Manager with strong technical background to bridge product and engineering teams. You'll define technical requirements, make architecture decisions, and ensure technical excellence in product delivery.

Required Skills: Technical Architecture, API Design, Product Management, Engineering Background, Agile, Technical Documentation
Experience: 4-6 years in technical product management`,

  'UX/UI Designer': `Join our team as a UX/UI Designer to create intuitive and beautiful user experiences. You'll conduct user research, create wireframes and prototypes, design user interfaces, and ensure design consistency across products. Proficiency in design tools and user-centered design principles is required.

Required Skills: UI/UX Design, Figma/Sketch, User Research, Prototyping, Design Systems, Responsive Design, Usability Testing
Experience: 2-4 years in UX/UI design`,

  'Site Reliability Engineer (SRE)': `We're looking for a Site Reliability Engineer to ensure high availability and performance of our systems. You'll monitor infrastructure, automate operations, troubleshoot issues, implement disaster recovery, and improve system reliability. Strong Linux and automation skills are essential.

Required Skills: Linux, Monitoring, Automation, Incident Response, Performance Optimization, Docker/Kubernetes, Python/Go
Experience: 3-5 years in SRE/Infrastructure`,

  'Mobile App Developer (iOS/Android)': `Seeking a Mobile App Developer to build native or cross-platform mobile applications. You'll design user interfaces, implement features, optimize performance, and ensure excellent user experience on mobile devices. Experience with iOS/Android development or React Native/Flutter is required.

Required Skills: iOS (Swift) or Android (Kotlin) or React Native/Flutter, Mobile UI/UX, REST APIs, App Store Publishing, Testing
Experience: 2-4 years in mobile development`,

  'Blockchain Developer': `We're hiring a Blockchain Developer to build decentralized applications and smart contracts. You'll work with blockchain platforms, develop smart contracts, ensure security, and integrate blockchain solutions. Knowledge of Solidity, Web3, and blockchain fundamentals is essential.

Required Skills: Solidity, Ethereum, Web3.js, Smart Contracts, Blockchain Architecture, Cryptography, DApp Development
Experience: 2-4 years in blockchain development`,

  'Business Intelligence Analyst': `Join us as a Business Intelligence Analyst to transform data into actionable insights. You'll create dashboards, perform business analysis, identify trends, and support data-driven decision making. Proficiency in SQL and BI tools is required.

Required Skills: SQL, Tableau/Power BI, Data Analysis, Business Intelligence, Excel, Data Visualization, Reporting
Experience: 2-4 years in business intelligence`,

  'Digital Marketing Manager': `We're seeking a Digital Marketing Manager to lead our online marketing efforts. You'll develop marketing strategies, manage campaigns, optimize conversion rates, analyze performance metrics, and drive customer acquisition. Experience with digital marketing tools and platforms is essential.

Required Skills: Digital Marketing, SEO/SEM, Google Analytics, Social Media Marketing, Content Strategy, Email Marketing, PPC
Experience: 3-5 years in digital marketing`,

  'Sales Development Representative': `Hiring a Sales Development Representative to generate qualified leads and drive sales pipeline. You'll prospect potential customers, conduct outreach, qualify leads, and schedule meetings for the sales team. Strong communication and persuasion skills are essential.

Required Skills: Lead Generation, Sales Prospecting, Cold Calling, Email Outreach, CRM (Salesforce), Communication Skills
Experience: 1-3 years in sales or SDR role`,

  'Customer Success Manager': `We're looking for a Customer Success Manager to ensure customer satisfaction and retention. You'll onboard new customers, provide ongoing support, identify upsell opportunities, and drive product adoption. Strong relationship-building and problem-solving skills are required.

Required Skills: Customer Success, Account Management, Product Knowledge, Communication, Problem Solving, CRM, Customer Onboarding
Experience: 2-4 years in customer success`,

  'Software Architect': `Seeking a Software Architect to design large-scale software systems and guide technical direction. You'll define architecture patterns, make technology decisions, ensure scalability and performance, and mentor engineering teams.

Required Skills: System Design, Architecture Patterns, Microservices, Cloud Architecture, Technical Leadership, Code Review
Experience: 7+ years with 3+ years in architecture`,

  'QA Engineer / Test Automation Engineer': `Join our team as a QA Engineer to ensure software quality through testing and automation. You'll design test strategies, write automated tests, perform manual testing, and work with development teams to prevent defects.

Required Skills: Test Automation, Selenium/Cypress, API Testing, Manual Testing, Test Planning, Bug Tracking, CI/CD Integration
Experience: 2-4 years in QA/testing`,

  'Data Analyst': `We're hiring a Data Analyst to analyze business data and provide insights. You'll create reports, perform statistical analysis, visualize data, and support business decisions with data-driven recommendations.

Required Skills: SQL, Excel, Data Visualization (Tableau/Power BI), Statistics, Python/R, Data Analysis, Reporting
Experience: 1-3 years in data analysis`,

  'Project Manager': `Seeking a Project Manager to plan, execute, and deliver projects successfully. You'll manage timelines, resources, budgets, communicate with stakeholders, and ensure project objectives are met. PMP or similar certification is a plus.

Required Skills: Project Management, Agile/Scrum, Planning, Risk Management, Stakeholder Communication, MS Project, Budgeting
Experience: 3-5 years in project management`,

  'Scrum Master': `We're looking for a Scrum Master to facilitate Agile processes and empower teams. You'll lead sprints, remove blockers, coach team members, and ensure Agile best practices. CSM certification and experience with Agile frameworks is required.

Required Skills: Scrum, Agile Methodologies, Facilitation, Team Coaching, Sprint Planning, Jira/Confluence, Stakeholder Management
Experience: 2-4 years as Scrum Master`,

  'Account Executive': `Hiring an Account Executive to close sales deals and grow revenue. You'll manage sales pipeline, conduct demos, negotiate contracts, and build relationships with prospects. Strong sales acumen and communication skills are essential.

Required Skills: B2B Sales, Negotiation, Pipeline Management, CRM (Salesforce), Product Demos, Closing Deals, Relationship Building
Experience: 2-4 years in sales/account executive role`,

  'Content Marketing Manager': `We're seeking a Content Marketing Manager to develop and execute content strategy. You'll create compelling content, manage editorial calendars, optimize for SEO, and measure content performance. Strong writing and strategy skills are required.

Required Skills: Content Strategy, SEO, Content Creation, Editorial Planning, Analytics, Social Media, Copywriting
Experience: 3-5 years in content marketing`,

  'HR Manager': `Join us as an HR Manager to lead human resources operations. You'll manage recruitment, employee relations, performance management, compliance, and HR policies. Strong knowledge of HR best practices and labor laws is essential.

Required Skills: HR Management, Recruitment, Employee Relations, Performance Management, Compliance, HRIS, Conflict Resolution
Experience: 4-6 years in HR management`
};

/**
 * Generate a job description based on job title
 * @param {string} jobTitle - The job title
 * @returns {string} Generated job description
 */
function generateJobDescription(jobTitle) {
  if (!jobTitle) {
    return '';
  }

  // Check if we have a specific template for this job title
  if (jobDescriptionTemplates[jobTitle]) {
    return jobDescriptionTemplates[jobTitle];
  }

  // Generate a generic description based on job title keywords
  return generateGenericDescription(jobTitle);
}

/**
 * Generate a generic job description when no template exists
 * @param {string} jobTitle - The job title
 * @returns {string} Generic job description
 */
function generateGenericDescription(jobTitle) {
  const role = jobTitle.trim();
  
  return `We are seeking a talented ${role} to join our growing team. The ideal candidate will have relevant experience in this field and demonstrate strong technical and interpersonal skills.

Responsibilities:
• Lead and execute ${role} initiatives
• Collaborate with cross-functional teams to achieve business objectives
• Drive innovation and continuous improvement in your area of expertise
• Mentor and support team members
• Contribute to strategic planning and decision-making

Required Qualifications:
• Proven experience as a ${role} or similar role
• Strong technical skills relevant to this position
• Excellent problem-solving and analytical abilities
• Outstanding communication and collaboration skills
• Bachelor's degree in relevant field or equivalent experience

Preferred Qualifications:
• Advanced degree or professional certifications
• Experience in fast-paced, dynamic environments
• Track record of delivering results and driving impact

Experience: 2-5 years of relevant professional experience`;
}

/**
 * Check if job description should be auto-generated
 * @param {string} jobDescription - The provided job description
 * @returns {boolean} True if description is empty or too short
 */
function shouldGenerateDescription(jobDescription) {
  return !jobDescription || jobDescription.trim().length === 0;
}

module.exports = {
  generateJobDescription,
  shouldGenerateDescription
};
