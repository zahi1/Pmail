import unittest
import os
import sys
import json
from datetime import datetime, timedelta
from flask import Flask
from flask_testing import TestCase

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from backend.models.database import db
from backend.models.user import User
from backend.models.job import Job
from backend.models.message import Message
from backend.routes.dashboard import dashboard_bp

class DashboardAnalyticsIntegrationTest(TestCase):
    
    def create_app(self):
        app = Flask(__name__)
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        app.config['WTF_CSRF_ENABLED'] = False
        app.secret_key = 'test_secret_key'
        
        app.register_blueprint(dashboard_bp)
        
        db.init_app(app)
        
        return app
    
    def setUp(self):
        print("\n----- Setting up test environment for dashboard tests -----")
        db.create_all()
        
        self.employer = User(
            id=1,
            email="employer@pmail.com",
            password="hashed_password",  
            first_name="Test",
            last_name="Employer",
            role="employer",
            company_name="Test Company",
            birthdate=datetime.now(),
            phone="555-123-4567"
        )
        
        self.employee1 = User(
            id=2,
            email="employee1@pmail.com",
            password="hashed_password",
            first_name="First",
            last_name="Employee",
            role="employee",
            user_categories="Information Technology",
            birthdate=datetime.now(),
            phone="555-111-2222"
        )
        
        self.employee2 = User(
            id=3,
            email="employee2@pmail.com",
            password="hashed_password",
            first_name="Second",
            last_name="Employee",
            role="employee",
            user_categories="Business",
            birthdate=datetime.now(),
            phone="555-333-4444"
        )
        
        db.session.add_all([self.employer, self.employee1, self.employee2])
        db.session.commit()
        
        self.job1 = Job(
            id=1,
            title="Software Developer",
            company_name="Test Company",
            category="Information Technology",
            location="Remote",
            job_type="Full-time",
            salary_range="$80,000 - $100,000",
            is_open=True,
            created_at=datetime.now() - timedelta(days=10)
        )
        
        self.job2 = Job(
            id=2,
            title="Marketing Specialist",
            company_name="Test Company",
            category="Business",
            location="New York",
            job_type="Part-time",
            salary_range="$60,000 - $75,000",
            is_open=True,
            created_at=datetime.now() - timedelta(days=5)
        )
        
        db.session.add_all([self.job1, self.job2])
        db.session.commit()
        
        application1 = Message(
            id=1,
            sender_id=2,  
            recipient_id=1, 
            subject="Application for: Software Developer",
            body="I am interested in the Software Developer position",
            status="Pending",
            is_draft=False,
            is_spam=False,
            created_at=datetime.now() - timedelta(days=8)
        )
        
        application2 = Message(
            id=2,
            sender_id=2, 
            recipient_id=1,  
            subject="Application for: Marketing Specialist",
            body="I am interested in the Marketing Specialist position",
            status="Under Review",
            is_draft=False,
            is_spam=False,
            created_at=datetime.now() - timedelta(days=4)
        )
        
        application3 = Message(
            id=3,
            sender_id=3,  
            recipient_id=1, 
            subject="Application for: Software Developer",
            body="I would like to apply for the Software Developer role",
            status="Accepted",
            is_draft=False,
            is_spam=False,
            created_at=datetime.now() - timedelta(days=7)
        )
        
        db.session.add_all([application1, application2, application3])
        db.session.commit()
        print("Created test users, jobs and applications")
    
    def tearDown(self):
        print("----- Cleaning up test environment -----")
        db.session.remove()
        db.drop_all()
    
    def test_employer_dashboard_data(self):
        print("\n===== Testing employer dashboard data =====")
        
        response = self.client.get(f'/dashboard/employer/{self.employer.id}')
        
        self.assertEqual(response.status_code, 200)
        
        dashboard_data = json.loads(response.data)
        
        self.assertIn('jobs', dashboard_data)
        self.assertIn('applications', dashboard_data)
        self.assertIn('stats', dashboard_data)
        
        self.assertEqual(len(dashboard_data['jobs']), 2)
        job_titles = [job['title'] for job in dashboard_data['jobs']]
        self.assertIn('Software Developer', job_titles)
        self.assertIn('Marketing Specialist', job_titles)
        
        self.assertEqual(len(dashboard_data['applications']), 3)
        
        self.assertEqual(dashboard_data['stats']['total_jobs'], 2)
        self.assertEqual(dashboard_data['stats']['total_applications'], 3)
        self.assertEqual(dashboard_data['stats']['pending_applications'], 1)
        self.assertEqual(dashboard_data['stats']['under_review_applications'], 1)
        self.assertEqual(dashboard_data['stats']['accepted_applications'], 1)
        self.assertEqual(dashboard_data['stats']['rejected_applications'], 0)
        
        print("Successfully verified employer dashboard data")
    
    def test_employee_dashboard_data(self):
        print("\n===== Testing employee dashboard data =====")
        
        response = self.client.get(f'/dashboard/employee/{self.employee1.id}')
        
        self.assertEqual(response.status_code, 200)
        
        dashboard_data = json.loads(response.data)
        
        self.assertIn('applications', dashboard_data)
        self.assertIn('stats', dashboard_data)
        
        self.assertEqual(len(dashboard_data['applications']), 2)
        application_subjects = [app['subject'] for app in dashboard_data['applications']]
        self.assertIn('Application for: Software Developer', application_subjects)
        self.assertIn('Application for: Marketing Specialist', application_subjects)
        
        application_statuses = [app['status'] for app in dashboard_data['applications']]
        self.assertIn('Pending', application_statuses)
        self.assertIn('Under Review', application_statuses)
        
        self.assertEqual(dashboard_data['stats']['total_applications'], 2)
        self.assertEqual(dashboard_data['stats']['pending_applications'], 1)
        self.assertEqual(dashboard_data['stats']['under_review_applications'], 1)
        self.assertEqual(dashboard_data['stats']['accepted_applications'], 0)
        self.assertEqual(dashboard_data['stats']['rejected_applications'], 0)
        
        print("Successfully verified employee dashboard data")
    
    def test_job_analytics_data(self):
        print("\n===== Testing job analytics data =====")
        
        response = self.client.get(f'/analytics/job/{self.job1.id}')
        
        self.assertEqual(response.status_code, 200)
        
        analytics_data = json.loads(response.data)
        
        self.assertIn('applications_count', analytics_data)
        self.assertIn('status_breakdown', analytics_data)
        self.assertIn('application_trend', analytics_data)
        
        self.assertEqual(analytics_data['applications_count'], 2)
        
        self.assertEqual(analytics_data['status_breakdown']['Pending'], 1)
        self.assertEqual(analytics_data['status_breakdown']['Accepted'], 1)
        self.assertEqual(analytics_data['status_breakdown'].get('Under Review', 0), 0)
        self.assertEqual(analytics_data['status_breakdown'].get('Rejected', 0), 0)
        
        print("Successfully verified job analytics data")
    
    def test_employer_analytics_data(self):
        print("\n===== Testing employer analytics data =====")
        
        response = self.client.get(f'/analytics/employer/{self.employer.id}')
        
        self.assertEqual(response.status_code, 200)
        
        analytics_data = json.loads(response.data)
        
        self.assertIn('job_performance', analytics_data)
        self.assertIn('application_trend', analytics_data)
        self.assertIn('status_breakdown', analytics_data)
        self.assertIn('category_breakdown', analytics_data)
        
        self.assertEqual(len(analytics_data['job_performance']), 2)
        self.assertEqual(analytics_data['job_performance'][0]['title'], 'Software Developer')
        self.assertEqual(analytics_data['job_performance'][0]['applications'], 2)
        self.assertEqual(analytics_data['job_performance'][1]['title'], 'Marketing Specialist')
        self.assertEqual(analytics_data['job_performance'][1]['applications'], 1)
        
        self.assertEqual(analytics_data['status_breakdown']['Pending'], 1)
        self.assertEqual(analytics_data['status_breakdown']['Under Review'], 1)
        self.assertEqual(analytics_data['status_breakdown']['Accepted'], 1)
        self.assertEqual(analytics_data['status_breakdown'].get('Rejected', 0), 0)
        
        self.assertEqual(analytics_data['category_breakdown']['Information Technology'], 2)
        self.assertEqual(analytics_data['category_breakdown']['Business'], 1)
        
        print("Successfully verified employer analytics data")
    
    def test_dashboard_with_no_data(self):
        print("\n===== Testing dashboard with no data =====")
        
        new_employer = User(
            id=99,
            email="new_employer@pmail.com",
            password="hashed_password",  
            first_name="New",
            last_name="Employer",
            role="employer",
            company_name="New Company",
            birthdate=datetime.now(),
            phone="555-999-8888"
        )
        
        db.session.add(new_employer)
        db.session.commit()
        
        response = self.client.get(f'/dashboard/employer/{new_employer.id}')
        
        self.assertEqual(response.status_code, 200)
        
        dashboard_data = json.loads(response.data)
        
        self.assertEqual(len(dashboard_data['jobs']), 0)
        self.assertEqual(len(dashboard_data['applications']), 0)
        self.assertEqual(dashboard_data['stats']['total_jobs'], 0)
        self.assertEqual(dashboard_data['stats']['total_applications'], 0)
        
        print("Successfully verified dashboard with no data")
    
    def test_dashboard_with_filters(self):
        print("\n===== Testing dashboard with filters =====")
        
        response = self.client.get(f'/dashboard/employer/{self.employer.id}?category=Information Technology')
        
        self.assertEqual(response.status_code, 200)
        
        dashboard_data = json.loads(response.data)
        
        self.assertEqual(len(dashboard_data['jobs']), 1)
        self.assertEqual(dashboard_data['jobs'][0]['title'], 'Software Developer')
        
        response = self.client.get(f'/dashboard/employer/{self.employer.id}?status=Accepted')
        
        self.assertEqual(response.status_code, 200)
        
        dashboard_data = json.loads(response.data)
        
        accepted_apps = [app for app in dashboard_data['applications'] if app['status'] == 'Accepted']
        self.assertEqual(len(accepted_apps), 1)
        
        print("Successfully verified dashboard filtering")

if __name__ == '__main__':
    print("=" * 70)
    print("DASHBOARD & ANALYTICS INTEGRATION TESTS")
    print("=" * 70)
    print("\nRunning integration tests for dashboard and analytics functionality...\n")
    unittest.main(verbosity=2)
