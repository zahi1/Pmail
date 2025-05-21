import unittest
import os
import sys
import json
from datetime import datetime
from flask import Flask
from flask_testing import TestCase

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from backend.models.database import db
from backend.models.user import User
from backend.routes.auth import auth_bp

class AuthenticationIntegrationTest(TestCase):
    
    def create_app(self):
        app = Flask(__name__)
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        app.config['WTF_CSRF_ENABLED'] = False
        app.secret_key = 'test_secret_key'
        
        app.register_blueprint(auth_bp)
        
        db.init_app(app)
        
        return app
    
    def setUp(self):
        print("\n----- Setting up test environment -----")
        db.create_all()
        
        test_user = User(
            email="existing@pmail.com",
            password="hashed_password",  
            first_name="Existing",
            last_name="User",
            role="employee",
            birthdate=datetime.now()
        )
        
        db.session.add(test_user)
        db.session.commit()
        print("Created test user with email: existing@pmail.com")
    
    def tearDown(self):
        print("----- Cleaning up test environment -----")
        db.session.remove()
        db.drop_all()
    
    def test_signup_with_valid_pmail_domain(self):
        print("\n===== Testing signup with valid @pmail.com domain =====")
        
        signup_data = {
            'email': 'newuser@pmail.com',
            'password': 'SecurePassword123!',
            'confirm_password': 'SecurePassword123!',
            'first_name': 'New',
            'last_name': 'User',
            'role': 'employee',
            'birthdate': '1990-01-01'
        }
        
        response = self.client.post('/signup', json=signup_data)
        response_data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response_data.get('success'))
        
        created_user = User.query.filter_by(email='newuser@pmail.com').first()
        self.assertIsNotNone(created_user)
        self.assertEqual(created_user.first_name, 'New')
        self.assertEqual(created_user.last_name, 'User')
        print("Signup succeeded with valid @pmail.com email")
    
    def test_signup_with_invalid_domain(self):
        print("\n===== Testing signup with invalid email domains =====")
        
        invalid_domains = [
            'gmail.com',
            'yahoo.com',
            'outlook.com',
            'company.org',
            'example.net'
        ]
        
        for domain in invalid_domains:
            signup_data = {
                'email': f'newuser@{domain}',
                'password': 'SecurePassword123!',
                'confirm_password': 'SecurePassword123!',
                'first_name': 'New',
                'last_name': 'User',
                'role': 'employee',
                'birthdate': '1990-01-01'
            }
            
            response = self.client.post('/signup', json=signup_data)
            response_data = json.loads(response.data)
            
            self.assertEqual(response.status_code, 400)
            self.assertFalse(response_data.get('success', False))
            self.assertIn('domain', response_data.get('error', '').lower())
            
            created_user = User.query.filter_by(email=f'newuser@{domain}').first()
            self.assertIsNone(created_user)
            print(f"Signup correctly rejected with @{domain} email")
    
    def test_signup_with_pmail_case_insensitive(self):
        print("\n===== Testing case insensitivity of @pmail.com validation =====")
        
        signup_data = {
            'email': 'newuser@PMail.com', 
            'password': 'SecurePassword123!',
            'confirm_password': 'SecurePassword123!',
            'first_name': 'New',
            'last_name': 'User',
            'role': 'employee',
            'birthdate': '1990-01-01'
        }
        
        response = self.client.post('/signup', json=signup_data)
        response_data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response_data.get('success'))
        
        created_user = User.query.filter_by(email='newuser@PMail.com').first()
        self.assertIsNotNone(created_user)
        print("Signup accepts case-insensitive @pmail.com domain")
    
    def test_account_takeover_vulnerability(self):
        print("\n===== Testing vulnerability from lack of 2FA =====")
        
        login_data = {
            'email': 'existing@pmail.com',
            'password': 'hashed_password'
        }
        
        response = self.client.post('/login', json=login_data)
        self.assertEqual(response.status_code, 200)
        
        with self.client.session_transaction() as session:
            self.assertIsNotNone(session.get('user_id'))
            self.assertEqual(session.get('email'), 'existing@pmail.com')
        
        print("Verified login works with only password (no 2FA)")
        
        print("\n----- Testing session hijacking risk -----")
        
        response = self.client.get('/profile') 
        self.assertEqual(response.status_code, 200)
        
        response_data = json.loads(response.data)
        self.assertEqual(response_data['email'], 'existing@pmail.com')
        print("Verified protected resources accessible with only session cookie")
        print("VULNERABILITY: No second factor required to maintain authenticated state")
        
        print("\n----- Testing critical actions without additional verification -----")
        
        password_change_data = {
            'current_password': 'hashed_password',
            'new_password': 'NewPassword123!',
            'confirm_password': 'NewPassword123!'
        }
        
        response = self.client.put('/change-password', json=password_change_data)
        self.assertEqual(response.status_code, 200)
        print("VULNERABILITY: Critical actions can be performed without second factor verification")

    def test_authentication_persistence(self):
        print("\n===== Testing authentication persistence =====")
        
        login_data = {
            'email': 'existing@pmail.com',
            'password': 'hashed_password'
        }
        
        login_response = self.client.post('/login', json=login_data)
        self.assertEqual(login_response.status_code, 200)
        
        for i in range(3):
            response = self.client.get('/profile')
            self.assertEqual(response.status_code, 200)
            
            response_data = json.loads(response.data)
            self.assertEqual(response_data['email'], 'existing@pmail.com')
            print(f"Request {i+1}: Still authenticated without re-verification")
            
        print("VULNERABILITY: Session remains valid without periodic 2FA challenges")

if __name__ == '__main__':
    print("=" * 70)
    print("AUTHENTICATION COMPONENT INTEGRATION TESTS")
    print("=" * 70)
    print("\nRunning integration tests for authentication functionality...\n")
    print("\nNOTE: If running from tests/integration directory, use:")
    print("python test_authentication.py")
    print("\nIf running from project root, use:")
    print("python -m tests.integration.test_authentication\n")
    unittest.main(verbosity=2)
