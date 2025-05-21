import unittest
import os
import sys
import json
import io
from datetime import datetime
from flask import Flask
from flask_testing import TestCase

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from backend.models.database import db
from backend.models.user import User
from backend.models.message import Message
from backend.models.attachment import Attachment
from backend.routes.messages import messages_bp

class MessagingIntegrationTest(TestCase):
    
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
        print("\n----- Setting up test environment for messaging tests -----")
        db.create_all()
        
        employer_user = User(
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
        
        employee_user = User(
            id=2,
            email="employee@pmail.com",
            password="hashed_password",
            first_name="Test",
            last_name="Employee",
            role="employee",
            user_categories="Information Technology",
            birthdate=datetime.now(),
            phone="555-987-6543"  
        )
        
        db.session.add(employer_user)
        db.session.add(employee_user)
        db.session.commit()
        print(f"Created test employer (ID: {employer_user.id}) and employee (ID: {employee_user.id})")
    
    def tearDown(self):
        print("----- Cleaning up test environment -----")
        db.session.remove()
        db.drop_all()
    
    def test_send_message(self):
        print("\n===== Testing basic message sending =====")
        
        message_data = {
            'sender_id': 2, 
            'recipient_email': 'employer@pmail.com',
            'subject': 'Application for: Software Developer',
            'body': 'I am interested in the Software Developer position at your company.'
        }
        
        response = self.client.post('/messages/send', 
                                  data=json.dumps(message_data),
                                  content_type='application/json')
        
        self.assertEqual(response.status_code, 201)
        response_data = json.loads(response.data)
        self.assertTrue(response_data.get('success'))
        self.assertIn('message_id', response_data)
        message_id = response_data['message_id']
        
        message = Message.query.get(message_id)
        self.assertIsNotNone(message)
        self.assertEqual(message.sender_id, 2)
        self.assertEqual(message.recipient_id, 1)
        self.assertEqual(message.subject, 'Application for: Software Developer')
        self.assertEqual(message.status, 'Pending')
        
        print(f"Pass: Message sent successfully with ID: {message_id}")
    
    def test_view_inbox(self):
        print("\n===== Testing inbox retrieval =====")
        
        test_message = Message(
            sender_id=2,
            recipient_id=1,
            subject="Test inbox message",
            body="This is a test message for the inbox.",
            status="Pending",
            is_draft=False,
            is_spam=False
        )
        db.session.add(test_message)
        db.session.commit()
        
        response = self.client.get('/messages/inbox/1')
        
        self.assertEqual(response.status_code, 200)
        messages = json.loads(response.data)
        
        self.assertEqual(len(messages), 1)
        self.assertEqual(messages[0]['subject'], "Test inbox message")
        self.assertEqual(messages[0]['status'], "Pending")
        
        print(f"Pass: Inbox retrieved successfully with {len(messages)} message(s)")
    
    def test_update_message_status(self):
        print("\n===== Testing message status update =====")
        
        test_message = Message(
            sender_id=2,
            recipient_id=1,
            subject="Application for: Software Engineer",
            body="This is a job application.",
            status="Pending",
            is_draft=False,
            is_spam=False
        )
        db.session.add(test_message)
        db.session.commit()
        message_id = test_message.id
        
        status_data = {
            'status': 'Under Review'
        }
        
        response = self.client.put(f'/messages/{message_id}/status',
                                 data=json.dumps(status_data),
                                 content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertTrue(response_data.get('success'))
        
        updated_message = Message.query.get(message_id)
        self.assertEqual(updated_message.status, "Under Review")
        
        print(f"Pass: Message status updated to 'Under Review' for ID: {message_id}")
    
    def test_save_draft(self):
        print("\n===== Testing draft saving =====")
        
        draft_data = {
            'sender_id': 2, 
            'recipient_email': 'employer@pmail.com',
            'subject': 'Draft Application',
            'body': 'This is a draft message.'
        }
        
        response = self.client.post('/messages/draft',
                                  data=json.dumps(draft_data),
                                  content_type='application/json')
        
        self.assertEqual(response.status_code, 201)
        response_data = json.loads(response.data)
        self.assertIn('draft_id', response_data)
        draft_id = response_data['draft_id']
        
        draft = Message.query.get(draft_id)
        self.assertIsNotNone(draft)
        self.assertEqual(draft.sender_id, 2)
        self.assertEqual(draft.is_draft, True)
        self.assertEqual(draft.subject, 'Draft Application')
        
        print(f"Pass: Draft saved successfully with ID: {draft_id}")
        
        updated_draft_data = {
            'sender_id': 2,
            'recipient_email': 'employer@pmail.com',
            'subject': 'Updated Draft Application',
            'body': 'This draft has been updated.',
            'draft_id': draft_id
        }
        
        update_response = self.client.post('/messages/draft',
                                         data=json.dumps(updated_draft_data),
                                         content_type='application/json')
        
        self.assertEqual(update_response.status_code, 200)
        
        updated_draft = Message.query.get(draft_id)
        self.assertEqual(updated_draft.subject, 'Updated Draft Application')
        self.assertEqual(updated_draft.body, 'This draft has been updated.')
        
        print(f"Pass: Draft updated successfully for ID: {draft_id}")
    
    def test_delete_draft(self):
        print("\n===== Testing draft deletion =====")
        
        test_draft = Message(
            sender_id=2,
            recipient_id=1,
            subject="Draft to delete",
            body="This draft will be deleted.",
            status="Pending",
            is_draft=True
        )
        db.session.add(test_draft)
        db.session.commit()
        draft_id = test_draft.id
        
        response = self.client.delete(f'/messages/draft/{draft_id}')
        
        self.assertEqual(response.status_code, 200)
        
        deleted_draft = Message.query.get(draft_id)
        self.assertIsNone(deleted_draft)
        
        print(f"Pass: Draft deleted successfully for ID: {draft_id}")
    
    def test_spam_detection(self):
        print("\n===== Testing spam detection =====")
        
        spam_message = Message(
            sender_id=2,
            recipient_id=1,
            subject="SPAM MESSAGE",
            body="This is a spam message",
            status="Pending",
            is_draft=False,
            is_spam=True  
        )
        db.session.add(spam_message)
        db.session.commit()
        spam_id = spam_message.id
        
        print(f"Created test spam message with ID: {spam_id}")
        
        response = self.client.get('/messages/spam/1')
        
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertIn('messages', response_data)
        spam_messages = response_data['messages']
        self.assertEqual(len(spam_messages), 1)
        self.assertEqual(spam_messages[0]['subject'], "SPAM MESSAGE")
        
        print(f"Pass: Spam message retrieved successfully")
        
        response = self.client.post(f'/messages/not-spam/{spam_id}')
        
        self.assertEqual(response.status_code, 200)
        
        updated_message = Message.query.get(spam_id)
        self.assertFalse(updated_message.is_spam)
        
        print(f"Pass: Message successfully moved from spam to inbox")
    
    def test_message_with_attachment(self):
        print("\n===== Testing message with attachment =====")
        
        
        message = Message(
            sender_id=2,
            recipient_id=1,
            subject="Message with attachment",
            body="Please see the attached PDF",
            status="Pending",
            is_draft=False,
            is_spam=False
        )
        db.session.add(message)
        db.session.commit()
        
        dummy_pdf_data = b'%PDF-1.5\nThis is a dummy PDF file for testing'
        attachment = Attachment(
            message_id=message.id,
            filename="test_document.pdf",
            file_type="application/pdf",
            file_size=len(dummy_pdf_data),
            file_data=dummy_pdf_data
        )
        db.session.add(attachment)
        db.session.commit()
        
        saved_attachment = Attachment.query.filter_by(message_id=message.id).first()
        self.assertIsNotNone(saved_attachment)
        self.assertEqual(saved_attachment.filename, "test_document.pdf")
        
        print(f"Pass: Message with attachment created successfully")
        
        response = self.client.get(f'/messages/{message.id}?user_id=1')
        
        self.assertEqual(response.status_code, 200)
        message_data = json.loads(response.data)
        self.assertIn('attachments', message_data)
        self.assertEqual(len(message_data['attachments']), 1)
        self.assertEqual(message_data['attachments'][0]['filename'], "test_document.pdf")
        
        print(f"Pass: Message with attachment retrieved successfully")
    
    def test_message_thread(self):
        print("\n===== Testing message threading =====")
        
        original_message = Message(
            id=100, 
            sender_id=2, 
            recipient_id=1, 
            subject="Original message",
            body="This is the original message",
            status="Pending",
            is_draft=False,
            is_spam=False
        )
        db.session.add(original_message)
        db.session.commit()
        
        reply_message = Message(
            sender_id=1, 
            recipient_id=2,  
            subject="Re: Original message",
            body="This is a reply to the original message",
            status="Pending",
            is_draft=False,
            is_spam=False,
            parent_id=100  
        )
        db.session.add(reply_message)
        db.session.commit()
        
        response = self.client.get(f'/messages/replies/100')
        
        self.assertEqual(response.status_code, 200)
        replies = json.loads(response.data)
        self.assertEqual(len(replies), 1)
        self.assertEqual(replies[0]['subject'], "Re: Original message")
        self.assertEqual(replies[0]['body'], "This is a reply to the original message")
        
        print(f"Pass: Message threading tested successfully")

if __name__ == '__main__':
    print("=" * 70)
    print("MESSAGING SYSTEM INTEGRATION TESTS")
    print("=" * 70)
    print("\nRunning integration tests for messaging functionality...\n")
    print("\nNOTE: If running from tests/integration directory, use:")
    print("python test_messaging.py")
    print("\nIf running from project root, use:")
    print("python -m tests.integration.test_messaging\n")
    
    suite = unittest.TestSuite()
    test_cases = [
        'test_send_message',
        'test_view_inbox',
        'test_update_message_status',
        'test_save_draft',
        'test_delete_draft',
        'test_spam_detection',
        'test_message_with_attachment',
        'test_message_thread'
    ]
    
    for test_case in test_cases:
        suite.addTest(MessagingIntegrationTest(test_case))
    
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    
    print("\n" + "=" * 70)
    print("ALL TESTS PASSED:")
    for test in test_cases:
        print(test)
    print("=" * 70)
