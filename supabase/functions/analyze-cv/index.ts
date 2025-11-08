/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "https://esm.sh/@google/generative-ai@0.3.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Skill {
  name: string;
  confidence: number;
  evidence: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cvText } = await req.json();
    
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');

    if (!GOOGLE_API_KEY) {
      console.error('ERREUR: GOOGLE_API_KEY n\'est pas configurée');
      return new Response(
        JSON.stringify({ error: 'Configuration error: API Key missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite-latest",
    });

    console.log('Analyse du CV avec Gemini Flash-Lite...');

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
    const jsonText = response.text();
    
    const parsedResult = JSON.parse(jsonText);
    const skills: Skill[] = parsedResult.skills || [];

    console.log(`Extraction de ${skills.length} compétences`);

    return new Response(
      JSON.stringify({ skills }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur dans la fonction d\'analyse:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
