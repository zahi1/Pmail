import csv
import random
from datetime import datetime, timedelta


spam_subjects = [
    "You've Won!", "Congratulations", "Free Money", "URGENT", "Make Money Fast",
    "$$$", "Limited Time Offer", "Act Now", "Discount", "Best Rates",
    "Investment Opportunity", "Lottery Winner", "Earn from Home", "Get Rich",
    "Exclusive Deal", "Don't Miss Out", "Special Promotion", "Big Savings",
    "Free Gift", "Amazing Offer", "Once in a Lifetime", "Cash Advance",
    "Work from Home", "Business Opportunity", "Double Your Income",
    "Eliminate Debt", "Low Interest Rates", "Consolidate Loans", "Fast Cash",
    "Easy Money", "Risk-Free Investment", "Legal Money Transfer"
]

spam_content_phrases = [
    "Don't miss this exclusive opportunity", "Congratulations, you've been selected",
    "Limited time offer", "Act now before it's too late", "Best rates guaranteed",
    "100% satisfaction guarantee", "No risk involved", "Click here to claim",
    "This is not spam", "This email is sent in compliance with", "To unsubscribe",
    "We found your email in our database", "This is a one-time message",
    "Exclusive promotion for selected customers", "Wire transfer required",
    "Meet singles in your area", "Lose weight fast", "Miracle cure",
    "Secret method revealed", "Government grants", "Easy loans",
    "No credit check necessary", "Apply now", "Guaranteed approval",
    "Your application has been pre-approved", "We need your information",
    "Please verify your account", "Claim your prize now", "We tried to contact you",
    "Confidential business proposal", "Million dollars inheritance",
    "Overseas investment opportunity", "This is not a scam", "Please respond ASAP"
]


legitimate_subjects = [
    "Meeting Tomorrow", "Project Update", "Question about Report", "Feedback Request",
    "Your Order Confirmation", "Monthly Newsletter", "Team Availability",
    "Document Review", "Calendar Invite", "Training Session",
    "Office Announcement", "Weekly Status", "Job Application", "Interview Schedule",
    "Performance Review", "Account Statement", "Customer Support", "Welcome Aboard",
    "Upcoming Vacation", "Reminder: Deadline", "Security Update", "Policy Change",
    "Quarterly Review", "Survey Response", "New Employee Introduction",
    "Conference Registration", "Schedule Change", "Information Request",
    "Technical Issue", "Company Event"
]

legitimate_content_phrases = [
    "I hope this email finds you well", "As discussed in our meeting",
    "Please find attached", "Let me know if you have any questions",
    "Looking forward to your reply", "Thank you for your time",
    "I wanted to follow up on", "Just checking in about",
    "I'm writing to inform you", "Can we schedule a meeting to discuss",
    "Here are the details you requested", "I've reviewed the document",
    "Your feedback would be appreciated", "Please review and approve",
    "The deadline for this project is", "We need your input on",
    "Let's connect this week to discuss", "I'm available to meet on",
    "Here's a summary of our discussion", "The team has completed",
    "We're making progress on", "I'm concerned about the timeline",
    "This is a reminder about", "Please update your information",
    "Your account has been updated", "Your order has been shipped",
    "Thank you for your purchase", "We value your business",
    "I've shared the document with the team", "Let's discuss this further"
]


shared_phrases = [
    "Please review", "Important information", "Urgent request",
    "Your account", "Limited time", "Special offer", "Click here",
    "Confirm your details", "Free consultation", "Don't miss out",
    "Confirm your information", "Special rates", "New offer",
    "Payment details", "Thank you for your business"
]


first_names = ["John", "Jane", "Michael", "Emily", "David", "Sarah", "Robert", "Lisa", 
               "James", "Linda", "Thomas", "Mary", "Richard", "Patricia", "Charles", 
               "Jennifer", "Daniel", "Elizabeth", "Matthew", "Susan"]

last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", 
              "Garcia", "Rodriguez", "Wilson", "Martinez", "Anderson", "Taylor", 
              "Thomas", "Hernandez", "Moore", "Martin", "Jackson", "Thompson", "White"]


domains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "mail.com", 
           "aol.com", "icloud.com", "protonmail.com", "zoho.com", "yandex.com",
           "business.com", "company.org", "enterprise.net", "corp.co", "firm.io"]

def generate_timestamp():
    days_ago = random.randint(0, 90)
    date = datetime.now() - timedelta(days=days_ago)
    return date.strftime("%Y-%m-%d %H:%M:%S")

def generate_spam_email(difficulty='normal'):
    subject = random.choice(spam_subjects)
    if random.random() > 0.7:
        subject = subject.upper()
    if random.random() > 0.8:
        subject = f"RE: {subject}"
    if random.random() > 0.9:
        subject = f"{subject} !!!"
    
    first_name = random.choice(first_names)
    last_name = random.choice(last_names)
    domain = random.choice(domains)
    sender_email = f"{first_name.lower()}.{last_name.lower()}@{domain}"
    
    phrases_count = random.randint(3, 8)
    
    if difficulty == 'hard' and random.random() > 0.5:
        spam_phrase_count = random.randint(2, 5)
        legitimate_phrase_count = random.randint(1, 3)
        shared_phrase_count = random.randint(0, 2)
        
        selected_phrases = (
            random.sample(spam_content_phrases, spam_phrase_count) +
            random.sample(legitimate_content_phrases, legitimate_phrase_count) +
            random.sample(shared_phrases, shared_phrase_count)
        )
        random.shuffle(selected_phrases)
    else:
        selected_phrases = random.sample(spam_content_phrases, phrases_count)
        if random.random() > 0.7:
            shared_count = random.randint(1, 3)
            selected_phrases.extend(random.sample(shared_phrases, shared_count))
    
    body = " ".join(selected_phrases)
    
    if random.random() > 0.6:
        body = body + "\n\nClick here: http://bit.ly/2X3fake"
    if random.random() > 0.7:
        body = body + "\n\nTo unsubscribe, reply with STOP"
    
    return {
        "label": "spam",
        "subject": subject,
        "message": body,
        "sender": sender_email,
        "created_at": generate_timestamp(),
        "has_attachment": random.random() > 0.7
    }

def generate_legitimate_email(difficulty='normal'):
    subject = random.choice(legitimate_subjects)
    
    first_name = random.choice(first_names)
    last_name = random.choice(last_names)
    domain = random.choice(domains)
    sender_email = f"{first_name.lower()}.{last_name.lower()}@{domain}"
    
    phrases_count = random.randint(2, 6)
    

    if difficulty == 'hard' and random.random() > 0.6:
        legitimate_phrase_count = random.randint(2, 4)
        spam_phrase_count = random.randint(1, 2)  
        shared_phrase_count = random.randint(0, 2)
        
        selected_phrases = (
            random.sample(legitimate_content_phrases, legitimate_phrase_count) +
            random.sample(spam_content_phrases, spam_phrase_count) +
            random.sample(shared_phrases, shared_phrase_count)
        )
        random.shuffle(selected_phrases)
    else:
        selected_phrases = random.sample(legitimate_content_phrases, phrases_count)
        if random.random() > 0.6:
            shared_count = random.randint(1, 2)
            selected_phrases.extend(random.sample(shared_phrases, shared_count))
    
    body = " ".join(selected_phrases)
    
    if random.random() > 0.6:
        body = f"Hi,\n\n{body}"
    if random.random() > 0.7:
        body = f"{body}\n\nBest regards,\n{first_name} {last_name}"
    
    return {
        "label": "legitimate",
        "subject": subject,
        "message": body,
        "sender": sender_email,
        "created_at": generate_timestamp(),
        "has_attachment": random.random() > 0.3
    }

def generate_spam_dataset(num_samples=10000, spam_ratio=0.3, difficulty='normal'):
    dataset = []
    num_spam = int(num_samples * spam_ratio)
    num_legitimate = num_samples - num_spam
    
    for _ in range(num_spam):
        dataset.append(generate_spam_email(difficulty))
    
    for _ in range(num_legitimate):
        dataset.append(generate_legitimate_email(difficulty))
    
    random.shuffle(dataset)
    
    return dataset

def write_to_csv(dataset, filename="email_spam_dataset.csv"):
    with open(filename, mode='w', newline='', encoding='utf-8') as file:
        fieldnames = ["label", "subject", "message", "sender", "created_at", "has_attachment"]
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        for data in dataset:
            writer.writerow(data)
    print(f"Dataset written to {filename}")

dataset = generate_spam_dataset(num_samples=10000, spam_ratio=0.3, difficulty='hard')
write_to_csv(dataset)

print("Generated dataset")
print("realistic model")