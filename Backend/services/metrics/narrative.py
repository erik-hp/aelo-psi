def basic_narrative_metrics(text: str) -> dict:
    words = [word for word in (text or "").split() if word]
    return {
        "word_count": len(words),
        "char_count": len(text or ""),
        "average_word_length": round(sum(len(word) for word in words) / len(words), 2) if words else 0,
    }
