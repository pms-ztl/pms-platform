"""
Sentiment Analysis Model
NLP-based sentiment analysis for work communications
"""

import numpy as np
from typing import Dict, List, Tuple
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import torch

class SentimentAnalyzer:
    """
    Multi-model sentiment analyzer combining VADER and transformer-based models
    """

    def __init__(self, model_name: str = "distilbert-base-uncased-finetuned-sst-2-english"):
        """
        Initialize sentiment analyzer with pre-trained models

        Args:
            model_name: HuggingFace model name for transformer-based analysis
        """
        # VADER for quick lexicon-based analysis
        self.vader = SentimentIntensityAnalyzer()

        # Transformer model for deep semantic analysis
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(model_name)
        self.model.to(self.device)
        self.model.eval()

        # Emotion detection model
        self.emotion_model = pipeline(
            "text-classification",
            model="j-hartmann/emotion-english-distilroberta-base",
            device=0 if self.device == "cuda" else -1,
            top_k=None
        )

    def analyze(self, text: str) -> Dict:
        """
        Perform comprehensive sentiment analysis

        Args:
            text: Input text to analyze

        Returns:
            Dictionary with sentiment scores, labels, emotions, and metadata
        """
        # VADER analysis
        vader_scores = self.vader.polarity_scores(text)

        # Transformer-based analysis
        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=512,
            padding=True
        ).to(self.device)

        with torch.no_grad():
            outputs = self.model(**inputs)
            probs = torch.nn.functional.softmax(outputs.logits, dim=-1)

        # Get sentiment from transformer (assuming binary classification)
        transformer_score = probs[0][1].item() - probs[0][0].item()  # positive - negative
        confidence = max(probs[0]).item()

        # Combine scores (weighted average)
        combined_score = (vader_scores['compound'] * 0.3 + transformer_score * 0.7)

        # Emotion detection
        emotions = self._detect_emotions(text)

        # Topic extraction
        topics = self._extract_topics(text)

        # Intent classification
        intent = self._classify_intent(text)

        # Determine sentiment label
        sentiment_label = self._get_sentiment_label(combined_score)

        return {
            "sentiment_score": round(combined_score, 3),
            "sentiment_label": sentiment_label,
            "confidence": round(confidence, 2),
            "emotions": emotions,
            "dominant_emotion": emotions.get("dominant"),
            "topics": topics,
            "intent": intent,
            "vader_scores": vader_scores,
            "transformer_confidence": round(confidence, 2)
        }

    def _detect_emotions(self, text: str) -> Dict:
        """
        Detect emotions in text using emotion classification model

        Returns:
            Dictionary with emotion scores and dominant emotion
        """
        try:
            emotion_results = self.emotion_model(text)[0]

            emotions = {}
            for result in emotion_results:
                emotions[result['label']] = round(result['score'], 3)

            # Find dominant emotion
            dominant = max(emotions.items(), key=lambda x: x[1])

            return {
                **emotions,
                "dominant": dominant[0],
                "dominant_score": dominant[1]
            }
        except Exception as e:
            return {"dominant": "neutral", "dominant_score": 0.5}

    def _extract_topics(self, text: str) -> List[str]:
        """
        Extract main topics from text using keyword extraction

        Returns:
            List of topic keywords
        """
        # Simple keyword extraction (can be enhanced with more sophisticated methods)
        words = text.lower().split()

        # Common work-related topics
        topic_keywords = {
            "deadline": ["deadline", "due", "urgent", "asap"],
            "meeting": ["meeting", "call", "discussion", "sync"],
            "project": ["project", "milestone", "deliverable"],
            "feedback": ["feedback", "review", "comments"],
            "approval": ["approve", "approval", "sign-off"],
            "issue": ["issue", "problem", "bug", "error"],
            "help": ["help", "support", "assist"]
        }

        detected_topics = []
        for topic, keywords in topic_keywords.items():
            if any(keyword in words for keyword in keywords):
                detected_topics.append(topic)

        return detected_topics[:5]  # Return top 5 topics

    def _classify_intent(self, text: str) -> str:
        """
        Classify the intent of the communication

        Returns:
            Intent classification
        """
        text_lower = text.lower()

        # Simple rule-based intent classification
        if any(word in text_lower for word in ["?", "how", "what", "when", "where", "why"]):
            return "QUESTION"
        elif any(word in text_lower for word in ["thanks", "thank you", "great", "excellent", "good job"]):
            return "PRAISE"
        elif any(word in text_lower for word in ["please", "could you", "can you", "would you"]):
            return "REQUEST"
        elif any(word in text_lower for word in ["issue", "problem", "concern", "complaint"]):
            return "COMPLAINT"
        elif any(word in text_lower for word in ["update", "status", "progress"]):
            return "STATUS_UPDATE"
        else:
            return "INFORMATION"

    def _get_sentiment_label(self, score: float) -> str:
        """
        Convert sentiment score to categorical label

        Args:
            score: Sentiment score between -1 and 1

        Returns:
            Sentiment label
        """
        if score <= -0.6:
            return "VERY_NEGATIVE"
        elif score <= -0.2:
            return "NEGATIVE"
        elif score <= 0.2:
            return "NEUTRAL"
        elif score <= 0.6:
            return "POSITIVE"
        else:
            return "VERY_POSITIVE"

    def batch_analyze(self, texts: List[str]) -> List[Dict]:
        """
        Analyze multiple texts in batch for efficiency

        Args:
            texts: List of texts to analyze

        Returns:
            List of sentiment analysis results
        """
        results = []
        for text in texts:
            results.append(self.analyze(text))
        return results
