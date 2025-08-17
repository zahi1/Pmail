# Pmail - Professional Email System for Job Applications

Pmail is a comprehensive email system designed specifically for job applications and employer-employee communication. It features spam detection using machine learning, job application tracking, and a user-friendly interface for both employees and employers.

## 4.1. Installation Guide

The following instructions will guide you through running and configuring the Pmail system.

### Hardware Requirements

- **CPU**: Intel Core i5+ (or AMD equivalent)
- **RAM**: Minimum 8 GB
- **Disk**: ≥ 2 GB free space
- **Network**: Internet access needed for downloads

### Software Requirements

- **OS**: macOS 10.15+, Windows 10+, or Ubuntu 20.04+
- **Python**: 3.8+
- **Package Manager**: pip (or conda)

### Installation Steps

1. **Install XAMPP**
   - Download and install XAMPP from [https://www.apachefriends.org/](https://www.apachefriends.org/)

2. **Start Database Services**
   - Open XAMPP Control Panel
   - Start **Apache** and **MySQL** modules

3. **Extract and Enter Project**
   ```bash
   cd /path/to/Pmail
   ```

4. **Install Python Environment**
   
   **For Windows:**
   ```bash
   winget install Python.Python.3
   ```
   
   **For macOS:**
   ```bash
   brew install python3
   ```
   
   **For Linux (Ubuntu):**
   ```bash
   sudo apt update
   sudo apt install python3 python3-pip
   ```

5. **Install Dependencies**
   ```bash
   pip install pandas numpy scikit-learn matplotlib seaborn flask
   ```

6. **Configure the Web Application**
   - Ensure all configuration files are properly set up
   - Verify database connection settings

7. **Initialize the Database**
   - The database will be automatically created when you first run the application

8. **Run the Server**
   ```bash
   python -m backend.app
   ```

9. **Access the Application**
   - **Main Application**: Visit `http://localhost:5000/frontend/login.html` in your browser
   - **Database Management**: Visit `http://localhost/phpmyadmin/` for phpMyAdmin access

### Getting Started

Once the installation is complete:

1. Register as a new user (Employee or Employer)
2. Log in to access your dashboard
3. Employees can browse jobs and send applications
4. Employers can post jobs and manage applications
5. The system automatically detects and filters spam messages

### Features

- **Spam Detection**: Machine learning-powered spam filtering using RandomForest and TF-IDF
- **Job Management**: Post, browse, and apply for jobs
- **Message System**: Complete email-like messaging between users
- **User Roles**: Separate interfaces for employees and employers
- **Application Tracking**: Monitor job application status in real-time

### Troubleshooting

- Ensure XAMPP services are running before starting the application
- Check that Python 3.8+ is installed and accessible
- Verify all dependencies are installed correctly
- Make sure port 5000 is not being used by another application

### Support

For issues or questions, please refer to the project documentation or contact the development team.
