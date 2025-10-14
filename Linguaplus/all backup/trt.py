import requests
import urllib.parse

# Japanese text to transliterate
text = "こんにちは"
encoded_text = urllib.parse.quote(text)

# URL with dt=t and dt=rm to fetch both translation and romanization
url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=ja-Latn&dt=t&dt=rm&q={encoded_text}"

# Send the GET request
response = requests.get(url)
data = response.json()

# Print the entire JSON response for inspection
print("Full JSON response:")
print(data)

# Extract and print the romaji (if available)
try:
    romaji = data[0][0][2]
    print("Romaji:", romaji)
except (IndexError, TypeError):
    print("Romanization not found in the response.")
