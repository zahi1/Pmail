import unittest
import json
import os
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app import app
from backend.models.database import db
from backend.models.user import User
from backend.models.job import Job

class JobManagementIntegrationTests(unittest.TestCase):

    def setUp(self):
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        app.config['WTF_CSRF_ENABLED'] = False
        
        self.client = app.test_client()
        
        with app.app_context():
            db.create_all()
            
            self.employer = User(
                email='test_employer@example.com',
                password_hash='pbkdf2:sha256:150000$testpasswordhash',
                role='employer',
                company_name='Test Company',
                contact_name='Test Contact'
            )
            
            self.employee = User(
                email='test_employee@example.com',
                password_hash='pbkdf2:sha256:150000$testpasswordhash',
                role='employee',
                first_name='Test',
                last_name='Employee'
            )
            
            db.session.add(self.employer)
            db.session.add(self.employee)
            db.session.commit()
            
            self.employer_id = self.employer.id
            self.employee_id = self.employee.id

    def tearDown(self):
        with app.app_context():
            db.session.remove()
            db.drop_all()

    def test_job_posting_workflow(self):
        with app.app_context():
            with self.client.session_transaction() as sess:
                sess['user_id'] = self.employer_id
                sess['role'] = 'employer'
                sess['email'] = 'test_employer@example.com'
            
            tomorrow = datetime.now() + timedelta(days=1)
            job_data = {
                'title': 'Software Engineer',
                'description': 'Test job description with requirements and responsibilities',
                'category': 'Information technology',
                'job_type': 'Full-time',
                'location': 'New York, Remote',
                'salary_range': '$90,000 - $120,000',
                'deadline': tomorrow.strftime('%Y-%m-%d')
            }
            
            response = self.client.post(
                '/jobs/new', 
                data=json.dumps(job_data),
                content_type='application/json'
            )
            
            self.assertEqual(response.status_code, 201)
            response_data = json.loads(response.data)
            self.assertEqual(response_data['message'], 'Job posted successfully')
            
            job = Job.query.filter_by(title='Software Engineer').first()
            self.assertIsNotNone(job)
            self.assertEqual(job.description, 'Test job description with requirements and responsibilities')
            self.assertEqual(job.company_name, 'Test Company')
            self.assertEqual(job.salary_range, '$90,000 - $120,000')
            
            response = self.client.get('/jobs/employer')
            self.assertEqual(response.status_code, 200)
            jobs_list = json.loads(response.data)
            self.assertEqual(len(jobs_list), 1)
            self.assertEqual(jobs_list[0]['title'], 'Software Engineer')
            self.assertEqual(jobs_list[0]['is_open'], True)

    def test_job_editing_functionality(self):
        with app.app_context():
            with self.client.session_transaction() as sess:
                sess['user_id'] = self.employer_id
                sess['role'] = 'employer'
                sess['email'] = 'test_employer@example.com'
            
            tomorrow = datetime.now() + timedelta(days=1)
            job = Job(
                title='Frontend Developer',
                description='Original description',
                category='Information technology',
                job_type='Full-time',
                location='Chicago',
                salary_range='$80,000 - $100,000',
                company_name='Test Company',
                deadline=tomorrow
            )
            
            db.session.add(job)
            db.session.commit()
            job_id = job.id
            
            updated_data = {
                'title': 'Senior Frontend Developer',
                'description': 'Updated description with more details',
                'category': 'Information technology',
                'job_type': 'Full-time',
                'location': 'Chicago and Remote',
                'salary_range': '$90,000 - $110,000',
                'deadline': tomorrow.strftime('%Y-%m-%d')
            }
            
            response = self.client.put(
                f'/jobs/{job_id}',
                data=json.dumps(updated_data),
                content_type='application/json'
            )
            
            self.assertEqual(response.status_code, 200)
            response_data = json.loads(response.data)
            self.assertEqual(response_data['message'], 'Job updated successfully')
            
            updated_job = Job.query.get(job_id)
            self.assertEqual(updated_job.title, 'Senior Frontend Developer')
            self.assertEqual(updated_job.description, 'Updated description with more details')
            self.assertEqual(updated_job.location, 'Chicago and Remote')
            self.assertEqual(updated_job.salary_range, '$90,000 - $110,000')
            
            response = self.client.get('/jobs/employer')
            self.assertEqual(response.status_code, 200)
            jobs_list = json.loads(response.data)
            self.assertEqual(len(jobs_list), 1)
            self.assertEqual(jobs_list[0]['title'], 'Senior Frontend Developer')

    def test_job_filtering_and_sorting(self):
        
        with app.app_context():
            tomorrow = datetime.now() + timedelta(days=1)
            
            job1 = Job(
                title='Software Engineer',
                description='Job 1 description',
                category='Information technology',
                job_type='Full-time',
                location='New York',
                salary_range='$100,000 - $120,000',
                company_name='Tech Corp',
                deadline=tomorrow,
                created_at=datetime.now()
            )
            
            job2 = Job(
                title='Business Analyst',
                description='Job 2 description',
                category='Business',
                job_type='Part-time',
                location='Chicago',
                salary_range='$60,000 - $70,000',
                company_name='Finance Inc',
                deadline=tomorrow,
                created_at=datetime.now() - timedelta(days=1) 
            )
            
            job3 = Job(
                title='Graphic Designer',
                description='Job 3 description',
                category='Arts',
                job_type='Freelance',
                location='Remote',
                salary_range='$40,000 - $50,000',
                company_name='Creative Studio',
                deadline=tomorrow,
                created_at=datetime.now() - timedelta(days=2) 
            )
            
            db.session.add_all([job1, job2, job3])
            db.session.commit()
            
            with self.client.session_transaction() as sess:
                sess['user_id'] = self.employee_id
                sess['role'] = 'employee'
            
            response = self.client.get('/jobs?category=Information%20technology')
            self.assertEqual(response.status_code, 200)
            jobs = json.loads(response.data)
            self.assertEqual(len(jobs), 1)
            self.assertEqual(jobs[0]['title'], 'Software Engineer')
            
            response = self.client.get('/jobs?job_type=Part-time')
            self.assertEqual(response.status_code, 200)
            jobs = json.loads(response.data)
            self.assertEqual(len(jobs), 1)
            self.assertEqual(jobs[0]['title'], 'Business Analyst')
            
            response = self.client.get('/jobs?salary_range=90000%2B')
            self.assertEqual(response.status_code, 200)
            jobs = json.loads(response.data)
            self.assertEqual(len(jobs), 1)
            self.assertEqual(jobs[0]['title'], 'Software Engineer')
            
            response = self.client.get('/jobs?sort=title-asc')
            self.assertEqual(response.status_code, 200)
            jobs = json.loads(response.data)
            self.assertEqual(len(jobs), 3)
            self.assertEqual(jobs[0]['title'], 'Business Analyst')
            self.assertEqual(jobs[1]['title'], 'Graphic Designer')
            self.assertEqual(jobs[2]['title'], 'Software Engineer')
            
            response = self.client.get('/jobs?category=Information%20technology&job_type=Full-time')
            self.assertEqual(response.status_code, 200)
            jobs = json.loads(response.data)
            self.assertEqual(len(jobs), 1)
            self.assertEqual(jobs[0]['title'], 'Software Engineer')
            self.assertEqual(jobs[0]['job_type'], 'Full-time')

if __name__ == '__main__':
    unittest.main()
