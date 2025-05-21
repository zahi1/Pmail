import pandas as pd
import random
import os
import string
import re

def corrupt_dataset():
    
    print("Loading dataset to corrupt...")
    data_path = os.path.join(os.path.dirname(__file__), 'email_spam_dataset.csv')
    df = pd.read_csv(data_path)
    
    print(f"Original dataset has {len(df)} records")
    print(f"Original spam ratio: {sum(df['label'] == 'spam') / len(df):.2f}")
    
    random.seed(42)
    
    num_to_flip = int(len(df) * 0.08)  
    indices_to_flip = random.sample(range(len(df)), num_to_flip)
    
    for idx in indices_to_flip:
        if df.loc[idx, 'label'] == 'spam':
            df.loc[idx, 'label'] = 'legitimate'
        else:
            df.loc[idx, 'label'] = 'spam'
    
    print(f"Flipped labels for {num_to_flip} examples")
    
    def obfuscate_word(word):
        if len(word) <= 3:
            return word
        
        techniques = [
            lambda w: w[0] + '.' + w[1:],  
            lambda w: w[0] + ',' + w[1:],  
            lambda w: w.replace('o', '0'),  
            lambda w: w.replace('i', '1'),  
            lambda w: w.replace('e', '3'),  
            lambda w: w.replace('a', '@'), 
            lambda w: w.replace('s', '$'),  
            lambda w: ''.join([c + ' ' for c in w]).strip(), 
            lambda w: w[0] + w[1:-1].upper() + w[-1]  
        ]
        
        return random.choice(techniques)(word)
    
    spam_words = ['free', 'money', 'cash', 'win', 'prize', 'offer', 'credit', 
                 'discount', 'save', 'cheap', 'guarantee', 'limited', 'risk']
    
    def obfuscate_text(text):
        if not isinstance(text, str):
            return text
            
        words = text.split()
        for i, word in enumerate(words):
            word_lower = word.lower()
            
            if word_lower in spam_words and random.random() < 0.3:
                words[i] = obfuscate_word(word)
                
        return ' '.join(words)
    
    spam_indices = df[df['label'] == 'spam'].index
    for idx in spam_indices:
        if random.random() < 0.4: 
            df.loc[idx, 'subject'] = obfuscate_text(df.loc[idx, 'subject'])
            df.loc[idx, 'message'] = obfuscate_text(df.loc[idx, 'message'])
    
    print("Applied obfuscation to spam messages")
    
    legitimate_phrases = [
        "quarterly report", "team meeting", "project deadline", "meeting minutes",
        "annual review", "budget approval", "status update", "performance review"
    ]
    
    spam_phrases = [
        "limited offer", "act now", "risk-free", "exclusive deal", "amazing opportunity",
        "discount code", "special promotion", "cash prize"
    ]
    
    for idx in spam_indices:
        if random.random() < 0.5:  
            phrase = random.choice(legitimate_phrases)
            df.loc[idx, 'message'] = df.loc[idx, 'message'] + " " + phrase
    
    legit_indices = df[df['label'] == 'legitimate'].index
    for idx in legit_indices:
        if random.random() < 0.4:  
            phrase = random.choice(spam_phrases)
            df.loc[idx, 'message'] = df.loc[idx, 'message'] + " " + phrase
    
    print("Added confusing phrases across both classes")
    
   
    num_ambiguous = int(len(df) * 0.1) 
    indices_for_ambiguous = random.sample(range(len(df)), num_ambiguous)
    
    ambiguous_templates = [
        "Special offer for our valued customers regarding {0}",
        "Limited time promotion: {0} project update",
        "Action required: Important {0} notification",
        "Reminder about your {0} subscription"
    ]
    
    ambiguous_topics = [
        "account", "service", "membership", "profile", "subscription",
        "payment", "delivery", "request", "appointment"
    ]
    
    for idx in indices_for_ambiguous:
        template = random.choice(ambiguous_templates)
        topic = random.choice(ambiguous_topics)
        df.loc[idx, 'subject'] = template.format(topic)
        
        legit_content = random.choice(legitimate_phrases)
        spam_content = random.choice(spam_phrases)
        
        df.loc[idx, 'message'] = (f"Please review the following information. "
                               f"{legit_content}. {spam_content}. "
                               f"This requires your attention.")
    
    print(f"Created {num_ambiguous} ambiguous examples")
    
    output_path = os.path.join(os.path.dirname(__file__), 'email_spam_dataset_corrupted.csv')
    df.to_csv(output_path, index=False)
    print(f"Saved corrupted dataset to {output_path}")
    
    original_backup = os.path.join(os.path.dirname(__file__), 'email_spam_dataset_original.csv')
    os.rename(data_path, original_backup)
    os.rename(output_path, data_path)
    print(f"Original dataset backed up to {original_backup}")
    print(f"Corrupted dataset is now the main dataset at {data_path}")
    
    return df

if __name__ == "__main__":
    corrupt_dataset()
    print("\nDataset corruption complete.")
