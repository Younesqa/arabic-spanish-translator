import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("."));
app.post("/translate", async (req, res) => {

    const { text, source, target } = req.body;

    // التحقق من طول النص
    if (!text || text.length > 5000) {
        return res.status(400).json({
            error: "Text is too long (maximum 5000 characters)."
        });
    }

    try {

const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",

           headers: {
    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    "Content-Type": "application/json"
},

            body: JSON.stringify({

                model: "llama-3.3-70b-versatile",

               messages: [

    {
        role: "system",
        content: `
You are a professional Arabic-Spanish translator.
Translate faithfully while preserving names, numbers, punctuation, formatting, emojis, and proper nouns.
Do not censor or summarize.
Return only the translated text with no explanations.
`
    },

    {
        role: "user",
        content: `Translate from ${source} to ${target}:\n\n${text}`
    }

]

            })

        });

        const data = await response.json();
        if (!response.ok) {
    console.error(data);
    return res.status(response.status).json(data);
}
if (!data.choices || data.choices.length === 0) {
    return res.status(500).json({
        error: "No translation returned from the model."
    });
}
res.json({
    translation: data.choices[0].message.content.trim()
});
    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: "Translation failed"
        });

    }

});

app.listen(process.env.PORT, () => {
    console.log("Server running");
});