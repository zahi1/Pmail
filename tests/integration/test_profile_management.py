import unittest
import os
import sys
import json
from datetime import datetime
from flask import Flask, session
from flask_testing import TestCase

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from backend.models.database import db
from backend.models.user import User
from backend.routes.profile import profile_bp
from backend.routes.auth import auth_bp

class ProfileManagementIntegrationTest(TestCase):
    
    def create_app(self):
        app = Flask(__name__)
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        app.config['WTF_CSRF_ENABLED'] = False
        app.secret_key = 'test_secret_key'
        
        app.register_blueprint(profile_bp)
        app.register_blueprint(auth_bp)
        
        db.init_app(app)
        
        return app
    
    def setUp(self):
        print("\n----- Setting up test environment for profile tests -----")
        db.create_all()
        
        test_employee = User(
            id=1,
            email="employee@pmail.com",
            password="hashed_password",
            first_name="Test",
            last_name="Employee",
            role="employee",
            user_categories="Business,Information Technology",
            phone="555-123-4567",
            birthdate=datetime.strptime("1990-01-01", "%Y-%m-%d")
        )
        

        test_employer = User(
            id=2,
            email="employer@pmail.com",
            password="hashed_password",
            first_name="Employer",  
            last_name="Contact",   
            company_name="Test Company",
            contact_name="HR Manager",
            role="employer",
            address="123 Business St, City",
            phone="555-987-6543",
            birthdate=datetime.strptime("1985-05-15", "%Y-%m-%d")
        )
        
        db.session.add(test_employee)
        db.session.add(test_employer)
        db.session.commit()
        print(f"Created test employee (ID: {test_employee.id}) and employer (ID: {test_employer.id})")
    
    def tearDown(self):
        print("----- Cleaning up test environment -----")
        db.session.remove()
        db.drop_all()
    
    def test_get_employee_profile(self):
        print("\n===== Testing GET employee profile =====")
        
        with self.client.session_transaction() as sess:
            sess['user_id'] = 1
            sess['role'] = 'employee'
        
        response = self.client.get('/profile')
        
        self.assertEqual(response.status_code, 200)
        
        profile_data = json.loads(response.data)
        
        self.assertEqual(profile_data['email'], 'employee@pmail.com')
        self.assertEqual(profile_data['first_name'], 'Test')
        self.assertEqual(profile_data['last_name'], 'Employee')
        self.assertEqual(profile_data['role'], 'employee')
        self.assertEqual(profile_data['phone'], '555-123-4567')
        self.assertEqual(profile_data['user_categories'], 'Business,Information Technology')
        self.assertEqual(profile_data['birthdate'], '1990-01-01')
        
        print("Pass: Successfully retrieved employee profile with correct data")
    
    def test_get_employer_profile(self):
        print("\n===== Testing GET employer profile =====")
        
        with self.client.session_transaction() as sess:
            sess['user_id'] = 2
            sess['role'] = 'employer'
        
        response = self.client.get('/profile')
        
        self.assertEqual(response.status_code, 200)
        
        profile_data = json.loads(response.data)
        
        self.assertEqual(profile_data['email'], 'employer@pmail.com')
        self.assertEqual(profile_data['company_name'], 'Test Company')
        self.assertEqual(profile_data['contact_name'], 'HR Manager')
        self.assertEqual(profile_data['role'], 'employer')
        self.assertEqual(profile_data['phone'], '555-987-6543')
        self.assertEqual(profile_data['address'], '123 Business St, City')
        self.assertEqual(profile_data['birthdate'], '1985-05-15')
        
        print("Pass: Successfully retrieved employer profile with correct data")
    
    def test_get_profile_unauthorized(self):
        print("\n===== Testing unauthorized profile access =====")
        

        response = self.client.get('/profile')
        
        self.assertEqual(response.status_code, 401)
        
        response_data = json.loads(response.data)
        self.assertEqual(response_data['error'], 'Unauthorized')
        
        print("Pass: Successfully blocked unauthorized profile access")
    
    def test_update_employee_profile(self):
        print("\n===== Testing UPDATE employee profile =====")
        
        with self.client.session_transaction() as sess:
            sess['user_id'] = 1
            sess['role'] = 'employee'
        
        update_data = {
            'first_name': 'Updated',
            'last_name': 'Name',
            'phone': '555-111-2222',
            'birthdate': '1992-05-15',
            'user_categories': 'Information Technology,Healthcare,Science'
        }
        
        response = self.client.put(
            '/profile',
            data=json.dumps(update_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertEqual(response_data['message'], 'Profile updated successfully')
        
        updated_user = User.query.get(1)
        self.assertEqual(updated_user.first_name, 'Updated')
        self.assertEqual(updated_user.last_name, 'Name')
        self.assertEqual(updated_user.phone, '555-111-2222')
        self.assertEqual(updated_user.user_categories, 'Information Technology,Healthcare,Science')
        self.assertEqual(updated_user.birthdate.strftime('%Y-%m-%d'), '1992-05-15')
        
        print("Pass: Successfully updated employee profile")
    
    def test_update_employer_profile(self):
        print("\n===== Testing UPDATE employer profile =====")
        
        with self.client.session_transaction() as sess:
            sess['user_id'] = 2
            sess['role'] = 'employer'
        
        update_data = {
            'contact_name': 'Updated HR Manager',
            'address': '456 New Business Ave',
            'phone': '555-333-4444',
            'birthdate': '1986-06-20'
        }
        
        response = self.client.put(
            '/profile',
            data=json.dumps(update_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertEqual(response_data['message'], 'Profile updated successfully')
        
        updated_user = User.query.get(2)
        self.assertEqual(updated_user.contact_name, 'Updated HR Manager')
        self.assertEqual(updated_user.address, '456 New Business Ave')
        self.assertEqual(updated_user.phone, '555-333-4444')
        self.assertEqual(updated_user.birthdate.strftime('%Y-%m-%d'), '1986-06-20')
        
        print("Pass: Successfully updated employer profile")
    
    def test_update_profile_unauthorized(self):
        print("\n===== Testing unauthorized profile update =====")
        

        update_data = {
            'first_name': 'Unauthorized',
            'last_name': 'Update'
        }
        
        response = self.client.put(
            '/profile',
            data=json.dumps(update_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 401)
        
        response_data = json.loads(response.data)
        self.assertEqual(response_data['error'], 'Unauthorized')
        
        print("Pass: Successfully blocked unauthorized profile update")
    
    def test_employee_role_restrictions(self):
        print("\n===== Testing employee role field restrictions =====")
        
        with self.client.session_transaction() as sess:
            sess['user_id'] = 1
            sess['role'] = 'employee'
        
        update_data = {
            'company_name': 'Should Not Update',
            'address': 'Should Not Update',
            'contact_name': 'Should Not Update',
            'phone': '555-111-2222'
        }
        
        response = self.client.put(
            '/profile',
            data=json.dumps(update_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        
        updated_user = User.query.get(1)
        self.assertEqual(updated_user.phone, '555-111-2222')  
        
        self.assertFalse(hasattr(updated_user, 'company_name') or getattr(updated_user, 'company_name', None))
        self.assertFalse(hasattr(updated_user, 'address') or getattr(updated_user, 'address', None))
        self.assertFalse(hasattr(updated_user, 'contact_name') or getattr(updated_user, 'contact_name', None))
        
        print("Pass: Successfully enforced field restrictions for employee role")
    
    def test_employer_role_restrictions(self):
        print("\n===== Testing employer role field restrictions =====")
        
        with self.client.session_transaction() as sess:
            sess['user_id'] = 2
            sess['role'] = 'employer'
        
        update_data = {
            'first_name': 'Should Not Update',
            'last_name': 'Should Not Update',
            'user_categories': 'Should Not Update',
            'phone': '555-333-4444'
        }
        
        response = self.client.put(
            '/profile',
            data=json.dumps(update_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        
        updated_user = User.query.get(2)
        self.assertEqual(updated_user.phone, '555-333-4444')  
        
        self.assertNotEqual(getattr(updated_user, 'first_name', None), 'Should Not Update')
        self.assertNotEqual(getattr(updated_user, 'last_name', None), 'Should Not Update')
        self.assertNotEqual(getattr(updated_user, 'user_categories', None), 'Should Not Update')
        
        print("Pass: Successfully enforced field restrictions for employer role")
    
    def test_database_error_handling(self):
        print("\n===== Testing database error handling =====")
        
        with self.client.session_transaction() as sess:
            sess['user_id'] = 1
            sess['role'] = 'employee'
        
        update_data = {
            'birthdate': 'invalid-date-format'
        }
        
        try:
            response = self.client.put(
                '/profile',
                data=json.dumps(update_data),
                content_type='application/json'
            )
            
            self.assertEqual(response.status_code, 500)
            response_data = json.loads(response.data)
            self.assertIn('error', response_data)
            self.assertEqual(response_data['error'], 'Database error')
            
            print("Pass: Successfully handled database errors with proper response")
        except Exception as e:
            self.fail(f"Test failed because exception was not properly handled: {str(e)}")

if __name__ == '__main__':
    print("=" * 70)
    print("USER PROFILE MANAGEMENT INTEGRATION TESTS")
    print("=" * 70)
    print("\nRunning integration tests for profile management functionality...\n")
    print("\nNOTE: If running from tests/integration directory, use:")
    print("python test_profile_management.py")
    print("\nIf running from project root, use:")
    print("python -m tests.integration.test_profile_management\n")
    unittest.main(verbosity=2)
