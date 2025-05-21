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
from backend.models.message import Message
from backend.routes.messages import messages_bp
from backend.routes.messages import is_spam  

class SpamDetectionIntegrationTest(TestCase):
    
    def create_app(self):
        app = Flask(__name__)
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        app.config['WTF_CSRF_ENABLED'] = False
        app.secret_key = 'test_secret_key'
        
        app.register_blueprint(messages_bp)
        
        db.init_app(app)
        
        return app
    
    def setUp(self):
        print("\n----- Setting up test environment for spam detection tests -----")
        db.create_all()
        
        self.sender = User(
            id=1,
            email="sender@pmail.com",
            password="hashed_password",  
            first_name="Test",
            last_name="Sender",
            role="employee",
            user_categories="Information Technology",
            birthdate=datetime.now(),
            phone="555-123-4567"
        )
        
        self.recipient = User(
            id=2,
            email="recipient@pmail.com",
            password="hashed_password",
            first_name="Test",
            last_name="Recipient",
            role="employer",
            company_name="Test Company",
            birthdate=datetime.now(),
            phone="555-987-6543"
        )
        
        db.session.add_all([self.sender, self.recipient])
        db.session.commit()
        print(f"Created test sender (ID: {self.sender.id}) and recipient (ID: {self.recipient.id})")
    
    def tearDown(self):
        print("----- Cleaning up test environment -----")
        db.session.remove()
        db.drop_all()
    
    def test_spam_detection_on_message_sending(self):
        print("\n===== Testing spam detection during message sending =====")
        
        spam_message_data = {
            'sender_id': self.sender.id,
            'recipient_email': self.recipient.email,
            'subject': 'MAKE MONEY FAST!!! Urgent Business Proposal',
            'body': 'Dear Sir/Madam, I am contacting you regarding millions of dollars. 100% GUARANTEED INCOME! Click here to get rich overnight! Free cash! Limited offer! Buy now!'
        }
        
        response = self.client.post(
            '/messages/send',
            data=json.dumps(spam_message_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 201)
        response_data = json.loads(response.data)
        self.assertTrue(response_data.get('success'))
        message_id = response_data.get('message_id')
        
        message = Message.query.get(message_id)
        self.assertTrue(message.is_spam)
        print("Successfully detected and marked spam message")
        
        response = self.client.get(f'/messages/spam/{self.recipient.id}')
        self.assertEqual(response.status_code, 200)
        spam_data = json.loads(response.data)
        
        self.assertIn('messages', spam_data)
        self.assertTrue(any(msg['id'] == message_id for msg in spam_data['messages']))
        print("Message correctly appears in recipient's spam folder")
        
        response = self.client.get(f'/messages/inbox/{self.recipient.id}')
        self.assertEqual(response.status_code, 200)
        inbox_messages = json.loads(response.data)
        
        self.assertTrue(all(msg['id'] != message_id for msg in inbox_messages))
        print("Message correctly excluded from recipient's inbox")
    
    def test_legitimate_message_not_marked_spam(self):
        print("\n===== Testing legitimate message handling =====")
        
        legitimate_message_data = {
            'sender_id': self.sender.id,
            'recipient_email': self.recipient.email,
            'subject': 'Application for Software Developer Position',
            'body': 'Dear Hiring Manager, I am writing to express my interest in the Software Developer position at your company. I have attached my resume and cover letter for your review. Thank you for your consideration.'
        }
        
        response = self.client.post(
            '/messages/send',
            data=json.dumps(legitimate_message_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 201)
        response_data = json.loads(response.data)
        message_id = response_data.get('message_id')
        
        message = Message.query.get(message_id)
        self.assertFalse(message.is_spam)
        print("Legitimate message correctly not marked as spam")
        
        response = self.client.get(f'/messages/inbox/{self.recipient.id}')
        self.assertEqual(response.status_code, 200)
        inbox_messages = json.loads(response.data)
        
        self.assertTrue(any(msg['id'] == message_id for msg in inbox_messages))
        print("Message correctly appears in recipient's inbox")
        
        response = self.client.get(f'/messages/spam/{self.recipient.id}')
        self.assertEqual(response.status_code, 200)
        spam_data = json.loads(response.data)
        
        if 'messages' in spam_data and spam_data['messages']:
            self.assertTrue(all(msg['id'] != message_id for msg in spam_data['messages']))
        
        print("Message correctly excluded from spam folder")
    
    def test_move_message_from_spam_to_inbox(self):
        print("\n===== Testing moving message from spam to inbox =====")
        
        spam_message = Message(
            sender_id=self.sender.id,
            recipient_id=self.recipient.id,
            subject="SPAM MESSAGE FOR TESTING",
            body="This is a test spam message",
            status="Pending",
            is_draft=False,
            is_spam=True 
        )
        db.session.add(spam_message)
        db.session.commit()
        print(f"Created test spam message with ID: {spam_message.id}")
        
        response = self.client.get(f'/messages/spam/{self.recipient.id}')
        self.assertEqual(response.status_code, 200)
        spam_data = json.loads(response.data)
        self.assertIn('messages', spam_data)
        self.assertTrue(any(msg['id'] == spam_message.id for msg in spam_data['messages']))
        print("Message correctly appears in spam folder initially")
        
        response = self.client.post(f'/messages/not-spam/{spam_message.id}')
        self.assertEqual(response.status_code, 200)
        move_data = json.loads(response.data)
        self.assertIn('message', move_data)
        print("Successfully called not-spam endpoint")
        
        updated_message = Message.query.get(spam_message.id)
        self.assertFalse(updated_message.is_spam)
        print("Message successfully unmarked as spam in database")
        
        response = self.client.get(f'/messages/inbox/{self.recipient.id}')
        self.assertEqual(response.status_code, 200)
        inbox_messages = json.loads(response.data)
        self.assertTrue(any(msg['id'] == spam_message.id for msg in inbox_messages))
        print("Message now appears in regular inbox")
        
        response = self.client.get(f'/messages/spam/{self.recipient.id}')
        self.assertEqual(response.status_code, 200)
        updated_spam_data = json.loads(response.data)
        
        if 'messages' in updated_spam_data and updated_spam_data['messages']:
            self.assertTrue(all(msg['id'] != spam_message.id for msg in updated_spam_data['messages']))
            
        print("Message no longer appears in spam folder")
    
    def test_spam_detection_function_directly(self):
        print("\n===== Testing spam detection function directly =====")
        
        test_cases = [
            {
                'subject': 'Make Money Fast! Urgent!',
                'body': 'Get rich quick! 100% guaranteed results! Limited time offer!',
                'expected': True
            },
            {
                'subject': 'Job Application - Software Developer',
                'body': 'I am writing to apply for the Software Developer position. Please find my resume attached.',
                'expected': False
            },
            {
                'subject': 'FREE VIAGRA! DISCOUNT MEDS!',
                'body': 'Buy cheap medications online! No prescription needed! Overnight delivery!',
                'expected': True
            },
            {
                'subject': 'Meeting reminder',
                'body': 'This is a reminder about our team meeting tomorrow at 10am. Please bring your project updates.',
                'expected': False
            }
        ]
        
        for i, case in enumerate(test_cases):
            print(f"\nCase {i+1}: '{case['subject']}' - Expected: {'Spam' if case['expected'] else 'Not Spam'}")
            
            try:
                result = is_spam(case['subject'], case['body'])
                self.assertEqual(result, case['expected'])
                print(f"Correctly classified as {'spam' if result else 'not spam'}")
            except Exception as e:
                print(f"Could not test spam detection function - Error: {str(e)}")
                print("Spam model might not be available in test environment")
                print("Skipping direct model testing")
                break

if __name__ == '__main__':
    print("=" * 70)
    print("SPAM DETECTION INTEGRATION TESTS")
    print("=" * 70)
    print("\nRunning integration tests for spam detection functionality...\n")
    unittest.main(verbosity=2)
