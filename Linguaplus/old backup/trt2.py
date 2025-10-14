import requests
import urllib.parse

# English text to transliterate via Japanese translation
text = "hello"
encoded_text = urllib.parse.quote(text)

# URL: source language is English (en), target is Japanese in Latin script (ja-Latn)
url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ja-Latn&dt=t&dt=rm&q={encoded_text}"

# Send the GET request
response = requests.get(url)
data = response.json()

# Print the full JSON response to inspect its structure
print("Full JSON response:")
print(data)

# Extract and print the romanized text
# The transliteration is often found in the second subarray (index 1) of the first element.
try:
    romaji = data[0][1][2]
    print("Romaji:", romaji)
except (IndexError, TypeError):
    print("Romanization not found in the response.")
