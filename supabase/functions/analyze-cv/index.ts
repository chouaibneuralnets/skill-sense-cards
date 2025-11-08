/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "https://esm.sh/@google/generative-ai@0.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Skill {
  name: string;
  confidence: number;
  evidence: string;
}

// Fonction pour extraire le texte d'un fichier PDF
async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    // Utiliser pdf-parse via esm.sh avec Uint8Array (compatible Deno)
    const pdfParse = await import('https://esm.sh/pdf-parse@1.1.1');
    const uint8Array = new Uint8Array(arrayBuffer);
    const data = await pdfParse.default(uint8Array);
    return data.text;
  } catch (error) {
    console.error('Erreur lors de l\'extraction du PDF:', error);
    throw new Error('Impossible d\'extraire le texte du PDF');
  }
}

// Fonction pour extraire le texte d'un fichier DOCX
async function extractTextFromDOCX(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const mammoth = await import('https://esm.sh/mammoth@1.8.0');
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error('Erreur lors de l\'extraction du DOCX:', error);
    throw new Error('Impossible d\'extraire le texte du DOCX');
  }
}

// Fonction pour extraire le texte d'un fichier TXT
function extractTextFromTXT(arrayBuffer: ArrayBuffer): string {
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(arrayBuffer);
}

// Fonction principale pour extraire le texte selon le type de fichier
async function extractTextFromFile(arrayBuffer: ArrayBuffer, contentType: string, fileName: string): Promise<string> {
  console.log(`Extraction du texte du fichier: ${fileName} (type: ${contentType})`);
  
  if (contentType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf')) {
    return await extractTextFromPDF(arrayBuffer);
  } else if (
    contentType.includes('vnd.openxmlformats-officedocument.wordprocessingml.document') || 
    fileName.toLowerCase().endsWith('.docx')
  ) {
    return await extractTextFromDOCX(arrayBuffer);
  } else if (contentType.includes('text/plain') || fileName.toLowerCase().endsWith('.txt')) {
    return extractTextFromTXT(arrayBuffer);
  } else {
    throw new Error(`Type de fichier non supporté: ${contentType}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Recevoir le fichier via FormData
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'Aucun fichier envoyé' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fichier reçu: ${file.name}, type: ${file.type}, taille: ${file.size} bytes`);

    // Lire le buffer du fichier
    const fileBuffer = await file.arrayBuffer();

    // Extraire le texte selon le type de fichier
    const cvText = await extractTextFromFile(fileBuffer, file.type, file.name);
    
    console.log(`Texte extrait (${cvText.length} caractères)`);

    if (!cvText.trim()) {
      return new Response(
        JSON.stringify({ error: 'Le fichier ne contient aucun texte' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // !!! HACKATHON SOLUTION: Clé API en dur !!!
    const GOOGLE_API_KEY = "AIzaSyBcL7DKpoCebeuGEOUnJOk8so_mbKI1ruY";

    if (!GOOGLE_API_KEY) {
      console.error('ERREUR: GOOGLE_API_KEY n\'est pas configurée dans le code !');
      return new Response(
        JSON.stringify({ error: 'Configuration error: API Key missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
    });

    console.log('Analyse du CV (fichier) avec Gemini 2.5 Flash Lite...');

    const prompt = `
      Tu es un expert en recrutement technique et RH. Analyse le texte de CV suivant.
      Extrais toutes les compétences techniques et non techniques.
      
      Ta réponse doit être *uniquement* un objet JSON avec une seule clé "skills".
      La valeur de "skills" doit être un tableau. Ne renvoie rien d'autre que cet objet JSON.
      
      Pour chaque compétence, utilise ce format exact :
      {
        "name": "Nom de la compétence",
        "confidence": 100,
        "evidence": "Une citation exacte du CV (max 15 mots)"
      }
      (remplace 100 par un score de confiance de 1 à 100)
    `;

    const result = await model.generateContent(`${prompt}\n\nCV:\n${cvText}`);
    const response = await result.response;
    let jsonText = response.text();
    
    // --- DEBUT DU BLOC DE NETTOYAGE ---
    // L'IA peut renvoyer ```json\n{...}\n```
    // Nous extrayons le JSON pur en trouvant la première accolade { et la dernière }
    const startIndex = jsonText.indexOf('{');
    const endIndex = jsonText.lastIndexOf('}');

    if (startIndex !== -1 && endIndex !== -1) {
      jsonText = jsonText.substring(startIndex, endIndex + 1);
    }
    // --- FIN DU BLOC DE NETTOYAGE ---
    
    const parsedResult = JSON.parse(jsonText);
    const skills: Skill[] = parsedResult.skills || [];

    console.log(`Extraction de ${skills.length} compétences`);

    return new Response(
      JSON.stringify({ skills }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur détaillée dans la fonction d\'analyse:', error);
    return new Response(
      JSON.stringify({ 
        error: "Erreur d'analyse du fichier", 
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
