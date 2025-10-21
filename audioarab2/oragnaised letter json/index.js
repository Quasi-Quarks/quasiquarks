
    function translate() {
          
         // Get user's input from the text field
      const text = raw_written_text_data;
      const encodedText = encodeURIComponent(text);
      
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&dt=rm&q=${encodedText}`;
      //const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&dt=rm&q=${encodedText}`;
     // const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ja-Latn&dt=t&dt=rm&q=${encodedText}`;

      // Fetch the data from the API
      fetch(url)
        .then(response => response.json())
        .then(data => {
          // Log the full JSON response in the browser console
          console.log("Full JSON response:", data);

          const arabic_transiliteration = data[0][1][2];
          console.log("arabic_transiliteration:", arabic_transiliteration);
          const arabic_translation = data[0][0][0];
          console.log("arabic_translation:", arabic_transiliteration);
          // Display the romanized text on the page
          document.getElementById("translated-transliteration-result").innerText = arabic_transiliteration;
          document.getElementById("translatedresult").innerText = arabic_translation;
          const URL="https://arabic-tts-796313906776.europe-west1.run.app";
const t=document.getElementById('translatedresult'),a=document.getElementById('a'),b=document.getElementById('b');
b.onclick=async()=>{const r=await fetch(URL,{method:"POST",headers:{"Content-Type":"application/json"},
body:JSON.stringify({text:t.value,voiceName:"ar-XA-Wavenet-A",speakingRate:1})});
const d=await r.json();a.src="data:audio/mp3;base64,"+d.audioContent;a.play();};
          
          loop_input_text()
        })
        .catch(error => console.error("Error fetching data:", error));
    }