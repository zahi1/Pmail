import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score
import pickle
import os

def train_spam_model():
    print("Loading spam dataset...")
    data_path = os.path.join(os.path.dirname(__file__), 'email_spam_dataset.csv')
    df = pd.read_csv(data_path)
    
    print(f"Dataset loaded with {len(df)} records")
    print(f"Spam messages: {sum(df['label'] == 'spam')}")
    print(f"Legitimate messages: {sum(df['label'] == 'legitimate')}")
    
    df['combined_text'] = df['subject'] + ' ' + df['message']
    
    df['is_spam'] = np.where(df['label'] == 'spam', 1, 0)
    
    X_train, X_test, y_train, y_test = train_test_split(
        df['combined_text'], 
        df['is_spam'],
        test_size=0.2,
        random_state=42
    )
    
    model = Pipeline([
        ('tfidf', TfidfVectorizer(max_features=5000, ngram_range=(1, 2))),
        ('classifier', RandomForestClassifier(n_estimators=100, random_state=42))
    ])
    
    print("Training spam detection model...")
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"Model accuracy: {accuracy:.4f}")
    print(classification_report(y_test, y_pred))
    
    model_path = os.path.join(os.path.dirname(__file__), '..', 'backend', 'models', 'spam_detector_model.pkl')
    
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    print(f"Model saved to {os.path.abspath(model_path)}")
    
    return model

if __name__ == "__main__":
    train_spam_model()
